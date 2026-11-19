import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

const source = await readFile(new URL("../language-tools.js", import.meta.url), "utf8");

function tools({ result, detect, translator, active = false } = {}) {
  const context = vm.createContext({
    chrome: { i18n: { detectLanguage: detect || (async () => result) } },
    Translator: translator, navigator: { userActivation: { isActive: active } },
    setTimeout, clearTimeout
  });
  vm.runInContext(source, context);
  return context.AITranslateLanguage;
}

test("language detection accepts reliable dominant languages and rejects uncertainty", async () => {
  const german = tools({ result: { isReliable: true, languages: [{ language: "de", percentage: 95 }] } });
  assert.equal(await german.detectReliableLanguage("Guten Morgen"), "de");
  const uncertain = tools({ result: { isReliable: true, languages: [{ language: "en", percentage: 60 }] } });
  assert.equal(await uncertain.detectReliableLanguage("mixed text"), null);
  const unreliable = tools({ result: { isReliable: false, languages: [{ language: "ru", percentage: 100 }] } });
  assert.equal(await unreliable.detectReliableLanguage("текст"), null);
  const unknown = tools({ result: { isReliable: true, languages: [{ language: "und", percentage: 100 }] } });
  assert.equal(await unknown.detectReliableLanguage("123"), null);
  const traditional = tools({ result: { isReliable: true, languages: [{ language: "zh-TW", percentage: 100 }] } });
  assert.equal(await traditional.detectReliableLanguage("繁體中文"), "zh-Hant");
});

test("language detection deduplicates in-flight and completed samples, evicts old entries", async () => {
  let calls = 0;
  const t = tools({ detect: async () => {
    calls++;
    return { isReliable: true, languages: [{ language: "de", percentage: 100 }] };
  } });
  assert.deepEqual(await Promise.all([t.detectReliableLanguage("same"), t.detectReliableLanguage("same")]), ["de", "de"]);
  assert.equal(await t.detectReliableLanguage("same"), "de");
  assert.equal(calls, 1);
  for (let i = 0; i < 128; i++) await t.detectReliableLanguage("sample " + i);
  await t.detectReliableLanguage("same");
  assert.equal(calls, 130, "oldest sample is evicted from the bounded cache");
});

test("language detection retries transient failures but caches genuine uncertainty", async () => {
  let calls = 0;
  const t = tools({ detect: async () => {
    if (++calls === 1) throw new Error("Temporary failure");
    return { isReliable: false, languages: [{ language: "de", percentage: 60 }] };
  } });
  assert.equal(await t.detectReliableLanguage("mixed"), null);
  assert.equal(await t.detectReliableLanguage("mixed"), null);
  assert.equal(await t.detectReliableLanguage("mixed"), null);
  assert.equal(calls, 2);
});

test("Chrome local provider uses the detected pair and releases its translator", async () => {
  let pair, destroyed = 0;
  const t = tools({
    result: { isReliable: true, languages: [{ language: "ja", percentage: 100 }] },
    translator: {
      async availability(options) { pair = options; return "available"; },
      async create() { return { translate: async () => "Hello", destroy() { destroyed++; } }; }
    }
  });
  assert.equal(await t.translateLocally("こんにちは", "auto", "en"), "Hello");
  assert.equal(pair.sourceLanguage, "ja");
  assert.equal(pair.targetLanguage, "en");
  assert.equal(destroyed, 1);
});

test("Chrome local provider reports unavailable API, pair, and activation without fallback", async () => {
  await assert.rejects(tools().translateLocally("text", "en", "ru"), /unavailable/);
  const unavailable = tools({ translator: { availability: async () => "unavailable", create() { assert.fail(); } } });
  await assert.rejects(unavailable.translateLocally("text", "en", "ru"), /does not support/);
  const downloadable = { availability: async () => "downloadable", create: async () => ({ translate: async () => "result", destroy() {} }) };
  await assert.rejects(tools({ translator: downloadable }).translateLocally("text", "en", "ru"), /user gesture/);
  assert.equal(await tools({ translator: downloadable, active: true }).translateLocally("text", "en", "ru"), "result");
  await assert.rejects(tools({ translator: downloadable }).translateLocally("text", "auto", "ru"), /reliably detect/);
  const downloading = { ...downloadable, availability: async () => "downloading" };
  await assert.rejects(tools({ translator: downloading }).translateLocally("text", "en", "ru"), /user gesture/);
});
