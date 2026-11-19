import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

const scripts = await Promise.all(
  ["i18n.js", "model-config.js", "options.js"].map((name) =>
    readFile(new URL(`../${name}`, import.meta.url), "utf8")
  )
);

class Element {
  constructor(id) {
    this.id = id;
    this.value = "";
    this.checked = false;
    this.disabled = false;
    this.style = {};
    this.dataset = {};
    this.options = [];
    this.listeners = {};
  }
  set innerHTML(value) {
    assert.equal(value, "");
    this.options = [];
    this.value = "";
  }
  appendChild(option) {
    this.options.push(option);
    if (!this.value) this.value = option.value;
  }
  addEventListener(name, listener) { this.listeners[name] = listener; }
  setAttribute() {}
  removeAttribute() {}
  fire(name) { return this.listeners[name]?.(); }
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const tick = () => new Promise((resolve) => setImmediate(resolve));

async function waitForFetch(fetches, predicate) {
  for (let i = 0; i < 100; i++) {
    const request = fetches.find(predicate);
    if (request) return request;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail("Expected model catalog request was not made");
}

async function makeOptions() {
  const elements = new Map();
  const el = (id) => {
    if (!elements.has(id)) elements.set(id, new Element(id));
    return elements.get(id);
  };
  const sync = { provider: "googletranslate", apiUrl: "https://translate.googleapis.com", model: "google-translate" };
  const local = { apiKeyByProvider: { openai: "openai-key", claude: "claude-key", deepseek: "deepseek-key" } };
  const localReads = [];
  const fetches = [];
  const area = (store, reads = []) => ({
    get(defaults, callback) {
      const data = Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [
        key, key in store ? structuredClone(store[key]) : fallback
      ]));
      const pending = reads.shift();
      const promise = pending ? pending.promise.then(() => data) : Promise.resolve(data);
      if (callback) promise.then(callback);
      return promise;
    },
    async set(values) { Object.assign(store, structuredClone(values)); }
  });
  const context = vm.createContext({
    window: {},
    document: {
      getElementById: el,
      querySelectorAll: () => [],
      createElement: () => new Element("option"),
      documentElement: {}
    },
    chrome: {
      runtime: { getManifest: () => ({ version: "0.3.3" }) },
      storage: { sync: area(sync), local: area(local, localReads) }
    },
    fetch(url, options) {
      const request = { url, options, ...deferred() };
      fetches.push(request);
      return request.promise;
    },
    AbortSignal, URL, console, TextEncoder, crypto: webcrypto,
    setTimeout() {}
  });
  for (const script of scripts) vm.runInContext(script, context);
  await tick();
  assert.equal(el("save").disabled, false, "settings initialize");
  const select = (provider) => {
    el("provider").value = provider;
    return el("provider").fire("change");
  };
  const answer = (request, ids) => {
    request.resolve(new Response(JSON.stringify({ data: ids.map((id) => ({ id })) }), {
      headers: { "content-type": "application/json" }
    }));
  };
  return { el, sync, local, localReads, fetches, select, answer, context };
}

test("late key reads and model responses cannot overwrite a newly selected provider", async () => {
  const { el, sync, local, localReads, fetches, select, answer } = await makeOptions();
  const slowRead = deferred();
  localReads.push(slowRead);
  const first = select("openai");
  assert.equal(el("apiKey").value, "");
  assert.equal(el("save").disabled, true);
  await el("save").fire("click");
  assert.equal(sync.provider, "googletranslate", "not saved while loading");

  await select("deepseek");
  const deepseek = await waitForFetch(fetches, (request) => request.url.includes("deepseek"));
  assert.equal(deepseek.options.headers.Authorization, "Bearer deepseek-key");
  await select("claude");
  const claude = await waitForFetch(fetches, (request) => request.url.includes("anthropic"));
  assert.equal(claude.options.headers["x-api-key"], "claude-key");
  answer(claude, ["claude-haiku-5-5", "claude-sonnet-5-5"]);
  await tick();
  answer(deepseek, ["deepseek-flash", "deepseek-v4-pro"]);
  slowRead.resolve();
  await first;
  await tick();
  assert.equal(el("provider").value, "claude");
  assert.equal(el("apiKey").value, "claude-key");
  assert.deepEqual(el("model").options.map((item) => item.value), ["claude-haiku-5-5", "claude-sonnet-5-5"]);
  assert.equal(el("save").disabled, false);
  assert.equal(fetches.some((request) => request.url.includes("openai.com")), false);

  el("model").value = "claude-sonnet-5-5";
  await el("save").fire("click");
  assert.equal(sync.provider, "claude");
  assert.equal(sync.modelByProvider.claude, "claude-sonnet-5-5");
  assert.equal(local.apiKeyByProvider.claude, "claude-key");
  assert.equal(local.apiKeyByProvider.openai, "openai-key");
  await select("openai");
  assert.equal(el("model").value, "gpt-6-luna");
  el("model").value = "gpt-6.2-sol";
  await el("save").fire("click");
  assert.equal(sync.modelByProvider.openai, "gpt-6.2-sol");
  assert.equal(sync.modelByProvider.claude, "claude-sonnet-5-5");
  await select("claude");
  assert.equal(el("model").value, "claude-sonnet-5-5");
});

test("catalog filters accept only text models and require known zero prices for free models", async () => {
  const { context } = await makeOptions();
  const filter = vm.runInContext("filterOpenrouterModels", context);
  const models = [
    { id: "free", pricing: { prompt: "0.0", completion: "0" } },
    { id: "unknown", pricing: {} },
    { id: "paid", pricing: { prompt: "0.1", completion: "0" } },
    { id: "image", pricing: { prompt: "0", completion: "0" }, architecture: { output_modalities: ["image"] } },
    { id: "extra-charge", pricing: { prompt: "0", completion: "0", request: "0.01" } }
  ];
  assert.deepEqual(Array.from(filter(models, true)), ["free"]);
  const filterOpenAI = vm.runInContext("filterOpenAIModels", context);
  assert.deepEqual(Array.from(filterOpenAI([
    { id: "gpt-4o-mini" }, { id: "gpt-6-luna" }, { id: "gpt-realtime-2" }, { id: "gpt-image-2" }
  ])), ["gpt-6-luna"]);
});

const catalogCases = [
  ["OpenAI", "openai", "gpt-account-a", "gpt-account-b"],
  ["DeepSeek", "deepseek", "deepseek-account-a", "deepseek-account-b"],
  ["Claude", "claude", "claude-account-a", "claude-account-b"],
  ["Gemini", "gemini", "gemini-account-a", "gemini-account-b"],
  ["Yandex", "yandex", "gpt://folder/account-a", "gpt://folder/account-b"],
  ["Openrouter", "openrouter", "vendor/account-a", "vendor/account-b"]
];

for (const [loader, provider, modelA, modelB] of catalogCases) {
  test(`${provider} catalog cache is scoped to its API key`, async () => {
    const { context, local, fetches } = await makeOptions();
    const getModels = vm.runInContext(`get${loader}Models`, context);
    const apiUrl = "https://api.example.com/v1";
    const cacheKey = provider === "yandex" ? "yandex_models_cache" : `${provider}_models_cache_v2`;
    const load = (key) => provider === "openrouter"
      ? getModels(key, false, "user")
      : provider === "yandex" ? getModels(apiUrl, key, "folder") : getModels(apiUrl, key);
    function answer(request, id) {
      const body = provider === "gemini"
        ? { models: [{ name: `models/${id}`, supportedGenerationMethods: ["generateContent"] }] }
        : { data: [{ id }] };
      request.resolve(new Response(JSON.stringify(body)));
    }
    // Old cache entries cannot be trusted even when every other dimension matches.
    local[cacheKey] = { ts: Date.now(), apiUrl, folderId: "folder", freeOnly: false, source: "user", models: ["legacy"] };
    const resultA = load("account-a-secret");
    const requestA = await waitForFetch(fetches, () => true);
    answer(requestA, modelA);
    assert.deepEqual(Array.from(await resultA), [modelA]);
    assert.deepEqual(Array.from(await load("account-a-secret")), [modelA]);
    assert.equal(fetches.length, 1);

    const resultB = load("account-b-secret");
    const requestB = await waitForFetch(fetches, (request) => request !== requestA);
    assert.ok(Object.values(requestB.options.headers).some((value) => value.endsWith("account-b-secret")));
    answer(requestB, modelB);
    assert.deepEqual(Array.from(await resultB), [modelB]);
    assert.deepEqual(Array.from(await load("account-b-secret")), [modelB]);
    assert.equal(fetches.length, 2);
    assert.equal(local[cacheKey].keyFingerprint, createHash("sha256").update("account-b-secret").digest("hex"));
    assert.ok(!JSON.stringify(local[cacheKey]).includes("account-b-secret"));
  });
}

test("successful catalog refresh removes filtered selections, including an empty catalog", async () => {
  const { context, el, fetches, select, answer } = await makeOptions();
  await select("openai");
  const first = await waitForFetch(fetches, () => true);
  answer(first, ["gpt-6-luna"]);
  await tick();
  const populate = vm.runInContext("populateModels", context);
  populate(["gpt-6-luna"], "gpt-image-2", "openai", { preserveUnlisted: true });
  assert.equal(el("model").value, "gpt-image-2");

  const refresh = vm.runInContext("refreshProviderModels", context);
  const pending = refresh({ force: true });
  const second = await waitForFetch(fetches, (request) => request !== first);
  answer(second, ["gpt-image-2", "gpt-6-luna"]);
  await pending;
  assert.deepEqual(el("model").options.map((option) => option.value), ["gpt-6-luna"]);
  assert.equal(el("model").value, "gpt-6-luna");

  const empty = refresh({ force: true });
  const third = await waitForFetch(fetches, (request) => request !== first && request !== second);
  answer(third, ["gpt-image-2"]);
  await empty;
  assert.deepEqual(el("model").options, []);
  assert.equal(el("model").value, "");
  assert.equal(el("model").disabled, true);
  assert.equal(el("modelCustom").style.display, "none");
});
