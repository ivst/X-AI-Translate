import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

const source = await readFile(new URL("../language-tools.js", import.meta.url), "utf8");

function tools({ result, translator, active = false } = {}) {
  const context = vm.createContext({
    chrome: { i18n: { detectLanguage: async () => result } },
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
});
