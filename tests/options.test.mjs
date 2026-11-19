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
  fire(name, event) { return this.listeners[name]?.(event); }
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

async function waitForCatalog(el) {
  for (let i = 0; i < 100; i++) {
    if (!el("save").disabled) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.fail("Catalog did not finish loading");
}

async function makeOptions({ sync: syncOverrides = {}, local: localOverrides = {}, expectReady = true } = {}) {
  const elements = new Map();
  const el = (id) => {
    if (!elements.has(id)) elements.set(id, new Element(id));
    return elements.get(id);
  };
  const sync = {
    provider: "googletranslate",
    apiUrl: "https://translate.googleapis.com",
    model: "google-translate",
    ...syncOverrides
  };
  const local = {
    apiKeyByProvider: { openai: "openai-key", claude: "claude-key", deepseek: "deepseek-key" },
    ...localOverrides
  };
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
    setTimeout(callback, delay) { return delay === 350 ? setTimeout(callback, 0) : null; },
    clearTimeout
  });
  for (const script of scripts) vm.runInContext(script, context);
  await tick();
  if (expectReady) assert.equal(el("save").disabled, false, "settings initialize");
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
  const openai = await waitForFetch(fetches, (request) => request.url.includes("openai.com"));
  answer(openai, ["gpt-6-luna", "gpt-6.2-sol"]);
  await tick();
  assert.equal(el("model").value, "gpt-6-luna");
  el("model").value = "gpt-6.2-sol";
  await el("save").fire("click");
  assert.equal(sync.modelByProvider.openai, "gpt-6.2-sol");
  assert.equal(sync.modelByProvider.claude, "claude-sonnet-5-5");
  await select("claude");
  await waitForCatalog(el);
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
  ])), ["gpt-4o-mini", "gpt-6-luna"]);
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

test("filtered selections require explicit replacement and an empty catalog allows saving with presets", async () => {
  const { context, el, sync, fetches, select, answer } = await makeOptions();
  vm.runInContext('savedModelsByProvider.openai = "gpt-image-2"', context);
  await select("openai");
  const first = await waitForFetch(fetches, () => true);
  answer(first, ["gpt-image-2", "gpt-6-luna"]);
  await tick();
  const refresh = vm.runInContext("refreshProviderModels", context);
  const pending = refresh({ force: true });
  const second = await waitForFetch(fetches, (request) => request !== first);
  answer(second, ["gpt-image-2", "gpt-6-luna"]);
  await pending;
  assert.deepEqual(el("model").options.map((option) => option.value), ["", "gpt-6-luna"]);
  assert.equal(el("model").value, "", "must choose a replacement explicitly");
  assert.match(el("modelCatalogNotice").textContent, /gpt-image-2/);
  await el("save").fire("click");
  assert.equal(sync.provider, "googletranslate", "no implicit replacement is saved");
  el("model").value = "gpt-6-luna";
  el("model").fire("change");
  assert.equal(el("modelCatalogNotice").style.display, "none");

  const empty = refresh({ force: true });
  const third = await waitForFetch(fetches, (request) => request !== first && request !== second);
  answer(third, ["gpt-image-2"]);
  await empty;
  assert.deepEqual(el("model").options.map((option) => option.value), ["gpt-6-luna", "gpt-6.2-sol"]);
  assert.equal(el("model").value, "gpt-6-luna");
  assert.equal(el("model").disabled, false);
  assert.equal(el("modelCustom").style.display, "none");
  assert.match(el("modelCatalogNotice").textContent, /unverified preset models/);
  el("overlayDuration").value = "12";
  await el("save").fire("click");
  assert.equal(sync.overlayDuration, 12);
  assert.equal(sync.model, "gpt-6-luna");
  const savedStatus = el("status").textContent;
  const fourth = await waitForFetch(fetches, (request) => ![first, second, third].includes(request));
  answer(fourth, ["gpt-image-2"]);
  await tick();
  assert.equal(el("status").textContent, savedStatus, "background refresh does not overwrite save status");
});

test("catalog filters preserve advertised legacy IDs and never synthesize replacement IDs", async () => {
  const { context } = await makeOptions();
  for (const [name, catalog, expected] of [
    ["OpenAI", [{ id: "gpt-4o-mini" }], ["gpt-4o-mini"]],
    ["DeepSeek", [{ id: "deepseek-chat" }, { id: "deepseek-v4-flash-vision-exp" }], ["deepseek-chat"]],
    ["Claude", [{ id: "claude-3-5-haiku-latest" }], ["claude-3-5-haiku-latest"]],
    ["Gemini", [{ name: "models/gemini-2.0-flash", supportedGenerationMethods: ["generateContent"] }], ["gemini-2.0-flash"]]
  ]) {
    const filter = vm.runInContext(`filter${name}Models`, context);
    assert.deepEqual(Array.from(filter(catalog)), expected);
  }
});

test("old catalog schema is rejected and explicitly selected legacy model is saved unchanged", async () => {
  const { context, el, local, sync, fetches, select, answer } = await makeOptions();
  local.openai_models_cache_v2 = { ts: Date.now(), apiUrl: "https://api.openai.com/v1",
    keyFingerprint: createHash("sha256").update("openai-key").digest("hex"), models: ["invented-model"] };
  await select("openai");
  const request = await waitForFetch(fetches, () => true);
  answer(request, ["gpt-4o-mini"]);
  await tick();
  assert.deepEqual(el("model").options.map((option) => option.value), ["", "gpt-4o-mini"]);
  el("model").value = "gpt-4o-mini";
  el("model").fire("change");
  await el("save").fire("click");
  assert.equal(sync.model, "gpt-4o-mini");
  assert.equal(sync.modelMigrationVersion, 1);
  assert.equal(vm.runInContext("migrateModelConfig", context)(sync).model, "gpt-4o-mini");
});

test("OpenRouter free-only keeps the remembered eligible model instead of the preset", async () => {
  const { context, el, local, sync, fetches, select } = await makeOptions();
  local.apiKeyByProvider.openrouter = "router-key";
  vm.runInContext('savedModelsByProvider.openrouter = "vendor/free-model:free"', context);
  await select("openrouter");
  const request = await waitForFetch(fetches, () => true);
  assert.equal(el("save").disabled, true);
  request.resolve(new Response(JSON.stringify({ data: [
    { id: "vendor/free-model:free", pricing: { prompt: "0", completion: "0" } },
    { id: "openrouter/free", pricing: { prompt: "0", completion: "0" } }
  ] })));
  await tick();
  assert.equal(el("model").value, "vendor/free-model:free");
  assert.equal(el("modelCatalogNotice").style.display, "none");
  await el("save").fire("click");
  assert.equal(sync.model, "vendor/free-model:free");
});

test("credential edits invalidate previous account models and block persistence until new catalog resolves", async () => {
  const { el, sync, local, fetches, select, answer } = await makeOptions();
  await select("openai");
  const initial = await waitForFetch(fetches, () => true);
  answer(initial, ["gpt-6-luna", "gpt-old-account"]);
  await tick();
  el("model").value = "gpt-old-account";
  el("model").fire("change");
  el("apiKey").value = "new-key";
  el("apiKey").fire("input");
  assert.equal(el("save").disabled, true);
  assert.deepEqual(el("model").options, []);
  await el("save").fire("click");
  assert.equal(sync.provider, "googletranslate");
  assert.equal(local.apiKeyByProvider.openai, "openai-key");
  assert.equal(fetches.length, 1, "no catalog request before the key is committed");
  el("apiKey").fire("change");
  const fresh = await waitForFetch(fetches, (request) => request !== initial);
  assert.equal(fresh.options.headers.Authorization, "Bearer new-key");
  answer(fresh, ["gpt-new-account"]);
  await tick();
  assert.deepEqual(el("model").options.map((option) => option.value), ["", "gpt-new-account"]);
  assert.equal(el("model").value, "");
  await el("save").fire("click");
  assert.equal(sync.provider, "googletranslate");
  el("model").value = "gpt-new-account";
  el("model").fire("change");
  await el("save").fire("click");
  assert.equal(sync.model, "gpt-new-account");
  assert.equal(local.apiKeyByProvider.openai, "new-key");
});

test("endpoint edits do not reuse an old catalog when the new endpoint fails", async () => {
  const { el, fetches, select, answer } = await makeOptions();
  await select("openai");
  const initial = await waitForFetch(fetches, () => true);
  answer(initial, ["gpt-6-luna", "gpt-account-only"]);
  await tick();
  el("model").value = "gpt-account-only";
  el("model").fire("change");
  el("apiUrl").value = "https://other.example/v1";
  el("apiUrl").fire("input");
  assert.equal(el("save").disabled, true);
  assert.deepEqual(el("model").options, []);
  assert.equal(fetches.length, 1, "no catalog request before the endpoint is committed");
  el("apiUrl").fire("change");
  const fresh = await waitForFetch(fetches, (request) => request !== initial);
  assert.equal(fresh.url, "https://other.example/v1/models");
  fresh.reject(new Error("Offline"));
  await tick();
  assert.deepEqual(el("model").options.map((option) => option.value), ["", "gpt-6-luna", "gpt-6.2-sol"]);
  assert.equal(el("model").value, "");
  assert.match(el("modelCatalogNotice").textContent, /unverified preset models/);
});

test("OpenRouter catalog cache also distinguishes endpoints, Gemini uses its configured endpoint", async () => {
  const { context, fetches } = await makeOptions();
  const getRouter = vm.runInContext("getOpenrouterModels", context);
  const first = getRouter("router-key", false, "public");
  const native = await waitForFetch(fetches, () => true);
  native.resolve(new Response(JSON.stringify({ data: [{ id: "native/model" }] })));
  assert.deepEqual(Array.from(await first), ["native/model"]);
  const second = getRouter("router-key", false, "public", false, () => true, "https://proxy.example/api/v1");
  const proxy = await waitForFetch(fetches, (request) => request !== native);
  assert.equal(proxy.url, "https://proxy.example/api/v1/models");
  proxy.resolve(new Response(JSON.stringify({ data: [{ id: "proxy/model" }] })));
  assert.deepEqual(Array.from(await second), ["proxy/model"]);

  const getGemini = vm.runInContext("getGeminiModels", context);
  const third = getGemini("https://gemini.example/v1", "gemini-key");
  const gemini = await waitForFetch(fetches, (request) => request !== native && request !== proxy);
  assert.equal(gemini.url, "https://gemini.example/v1/models");
  assert.equal(gemini.options.headers.Authorization, "Bearer gemini-key");
  gemini.resolve(new Response(JSON.stringify({ data: [{ id: "gemini-2.0-flash" }] })));
  assert.deepEqual(Array.from(await third), ["gemini-2.0-flash"]);
});

test("late responses for an old API key cannot overwrite the newer model cache", async () => {
  const { context, el, local, fetches, select, answer } = await makeOptions();
  await select("openai");
  const old = await waitForFetch(fetches, () => true);
  el("apiKey").value = "new-key";
  el("apiKey").fire("input");
  const refresh = vm.runInContext("refreshProviderModels", context);
  const pending = refresh({ force: true });
  const current = await waitForFetch(fetches, (request) => request !== old);
  answer(current, ["gpt-6-luna", "gpt-new-account"]);
  await pending;
  answer(old, ["gpt-old-account"]);
  await tick();
  assert.deepEqual(local.openai_models_cache_v2.models, ["gpt-6-luna", "gpt-new-account"]);
  assert.equal(local.openai_models_cache_v2.keyFingerprint, createHash("sha256").update("new-key").digest("hex"));
});

test("empty OpenRouter free-only catalog offers only its known free preset", async () => {
  const { el, local, fetches, select, sync } = await makeOptions();
  local.apiKeyByProvider.openrouter = "router-key";
  await select("openrouter");
  const initial = await waitForFetch(fetches, () => true);
  initial.resolve(new Response(JSON.stringify({ data: [{ id: "vendor/paid", pricing: { prompt: "1", completion: "0" } }] })));
  await tick();
  assert.equal(el("openrouterFreeOnly").checked, true);
  assert.deepEqual(el("model").options.map((option) => option.value), ["openrouter/free"]);
  assert.match(el("modelCatalogNotice").textContent, /unverified preset models/);
  await el("save").fire("click");
  assert.equal(sync.model, "openrouter/free");
});

test("failed silent OpenRouter refresh preserves save status but manual refresh reports errors", async () => {
  const { el, local, fetches, select, sync } = await makeOptions();
  local.apiKeyByProvider.openrouter = "router-key";
  await select("openrouter");
  const initial = await waitForFetch(fetches, () => true);
  initial.resolve(new Response(JSON.stringify({ data: [
    { id: "openrouter/free", pricing: { prompt: "0", completion: "0" } }
  ] })));
  await tick();

  await el("save").fire("click");
  assert.equal(sync.provider, "openrouter");
  assert.equal(el("status").textContent, "Saved.");
  const savedColor = el("status").style.color;
  const silent = await waitForFetch(fetches, (request) => request !== initial);
  silent.resolve(new Response("Service unavailable", { status: 503 }));
  await tick();
  assert.equal(el("status").textContent, "Saved.");
  assert.equal(el("status").style.color, savedColor);
  assert.equal(el("model").value, "openrouter/free");

  el("refreshOpenrouter").fire("click");
  const manual = await waitForFetch(fetches, (request) => request !== initial && request !== silent);
  manual.reject(new Error("Network unavailable"));
  await tick();
  assert.equal(el("status").textContent, "Network unavailable");
  assert.notEqual(el("status").style.color, savedColor);
  assert.equal(el("model").value, "openrouter/free");
});

test("missing API key offers presets without an unverified-catalog warning", async () => {
  const { el, local, fetches, select } = await makeOptions();
  delete local.apiKeyByProvider.openai;
  await select("openai");
  await tick();
  assert.equal(fetches.length, 0, "no catalog request without credentials");
  assert.deepEqual(el("model").options.map((option) => option.value), ["gpt-6-luna", "gpt-6.2-sol"]);
  assert.equal(el("model").value, "gpt-6-luna");
  assert.equal(el("modelCatalogNotice").style.display, "none");
  assert.equal(el("save").disabled, false);
});

test("catalog notice is localized on the first render", async () => {
  const { el } = await makeOptions({
    sync: { provider: "openai", apiUrl: "https://api.openai.com/v1", model: "gpt-6-luna", uiLang: "ru" },
    expectReady: false
  });
  assert.match(el("modelCatalogNotice").textContent, /^Обновление списка/);
});

test("background catalog refresh keeps saving available", async () => {
  const { el, sync, fetches, select, answer } = await makeOptions();
  await select("openai");
  const initial = await waitForFetch(fetches, () => true);
  answer(initial, ["gpt-6-luna"]);
  await tick();
  await el("save").fire("click");
  assert.equal(sync.provider, "openai");
  const silent = await waitForFetch(fetches, (request) => request !== initial);
  assert.equal(el("save").disabled, false, "a background refresh does not block saving");
  answer(silent, ["gpt-6-luna"]);
  await tick();
  assert.equal(el("save").disabled, false);
});

test("Enter commits a credential edit and refreshes the catalog", async () => {
  const { el, fetches, select, answer } = await makeOptions();
  await select("openai");
  const initial = await waitForFetch(fetches, () => true);
  answer(initial, ["gpt-6-luna"]);
  await tick();
  el("apiKey").value = "new-key";
  el("apiKey").fire("input");
  assert.equal(fetches.length, 1, "typing alone does not request the catalog");
  el("apiKey").fire("keydown", { key: "Enter" });
  const fresh = await waitForFetch(fetches, (request) => request !== initial);
  assert.equal(fresh.options.headers.Authorization, "Bearer new-key");
  answer(fresh, ["gpt-6-luna"]);
  await tick();
  assert.equal(el("save").disabled, false);
});

test("a refresh requested while the form is busy runs when it frees up", async () => {
  const { el, context, fetches, select, answer } = await makeOptions();
  await select("openai");
  const initial = await waitForFetch(fetches, () => true);
  answer(initial, ["gpt-6-luna"]);
  await tick();
  // No timer fallback: the deferred refresh has to be picked up by the form.
  vm.runInContext("setTimeout = () => null", context);
  vm.runInContext("settingsBusy = true", context);
  const refresh = vm.runInContext("refreshProviderModels", context);
  await refresh({ force: true });
  assert.equal(fetches.length, 1, "no request is made while the form is busy");
  vm.runInContext("settingsBusy = false", context);
  vm.runInContext("updateSettingsControls()", context);
  const retried = await waitForFetch(fetches, (request) => request !== initial);
  answer(retried, ["gpt-6-luna"]);
  await tick();
  assert.equal(el("save").disabled, false);
});
