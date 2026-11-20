import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

const source = await readFile(new URL("../language-tools.js", import.meta.url), "utf8");

function tools({ result, detect, translator, active = false, now } = {}) {
  const context = vm.createContext({
    chrome: { i18n: { detectLanguage: detect || (async () => result) } },
    Translator: translator, navigator: { userActivation: typeof active === "object" ? active : { isActive: active } },
    setTimeout, clearTimeout,
    ...(now ? { __now: now } : {})
  });
  if (now) vm.runInContext("Date.now = () => __now();", context);
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

test("short Japanese kana including half-width Katakana uses a safe script fallback", async () => {
  const raw = "ドレミファソラシド。ｼｮｳ";
  let pair, sample, translatedInput;
  const t = tools({
    detect: async text => {
      sample = text;
      return { isReliable: false, languages: [{ language: "und", percentage: 100 }] };
    },
    translator: {
      async availability(options) { pair = options; return "available"; },
      async create() { return { translate: async text => { translatedInput = text; return "Do re mi"; }, destroy() {} }; }
    }
  });
  assert.equal(await t.translateLocally(raw, "auto", "ru"), "Do re mi");
  assert.equal(pair.sourceLanguage, "ja");
  assert.equal(pair.targetLanguage, "ru");
  assert.equal(sample, "ドレミファソラシド。ショウ", "normalize half-width kana for detection only");
  assert.equal(translatedInput, raw, "the original text is sent to Translator");
  assert.equal(await t.detectReliableLanguage("ｼｮｳ"), "ja");
  assert.equal(await t.detectReliableLanguage("日本語です"), "ja");
  assert.equal(await t.detectReliableLanguage("안녕"), "ko");
  assert.equal(await t.detectReliableLanguage("日本語"), null, "Han-only text is ambiguous");
  assert.equal(await t.detectReliableLanguage("hello"), null, "Latin-only text is ambiguous");
  assert.equal(await t.detectReliableLanguage("Привет"), null, "Cyrillic-only text is ambiguous");
  assert.equal(await t.detectReliableLanguage("あ hello"), null, "one kana in mostly foreign text is insufficient");
});

test("emoji asset URLs and other link destinations are ignored only for language detection", async () => {
  const raw = "ろりぽっぷむらさきさん[🍭](https://abs.twimg.com/emoji/v2/svg/1f36d.svg)[💜](https://abs.twimg.com/emoji/v2/svg/1f49c.svg)[🐰](https://abs.twimg.com/emoji/v2/svg/1f430.svg)";
  let sample, pair, translatedInput;
  const t = tools({
    detect: async text => {
      sample = text;
      // Even a confident but incorrect Latin result must not be driven by URLs.
      if (text.includes("https://")) return { isReliable: true, languages: [{ language: "en", percentage: 100 }] };
      return { isReliable: false, languages: [{ language: "und", percentage: 100 }] };
    },
    translator: {
      async availability(options) { pair = options; return "available"; },
      async create() { return { translate: async text => { translatedInput = text; return "Lollipop"; }, destroy() {} }; }
    }
  });
  assert.equal(await t.translateLocally(raw, "auto", "ru"), "Lollipop");
  assert.equal(pair.sourceLanguage, "ja");
  assert.equal(pair.targetLanguage, "ru");
  assert.ok(sample.includes("ろりぽっぷむらさきさん"));
  assert.ok(!sample.includes("https://"));
  assert.equal(translatedInput, raw, "URLs are preserved for translation");
  assert.equal(await t.detectReliableLanguage("こんにちは https://example.com/very-long-english-link"), "ja");
  assert.equal(await t.detectReliableLanguage("https://example.com/english 🍭"), null, "URL and emoji alone carry no language evidence");
  assert.equal(await t.detectReliableLanguage("[日本語](https://example.com)"), null, "Han-only visible text stays ambiguous");
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

test("manual preparation resolves auto detection before a strict click and ignores stale preparations", async () => {
  const pending = new Map();
  const active = { isActive: false };
  const created = [];
  const t = tools({
    active,
    detect: text => new Promise(resolve => pending.set(text, resolve)),
    translator: {
      async availability() { return "downloadable"; },
      async create(pair) {
        assert.equal(active.isActive, true);
        created.push(pair);
        return { translate: async text => text };
      }
    }
  });
  const manual = t.createManualTranslationPreparation();
  const old = manual.prepare("Bonjour", "auto", "en");
  const next = manual.prepare("こんにちは", "auto", "ru");
  pending.get("こんにちは")({ isReliable: true, languages: [{ language: "ja", percentage: 100 }] });
  await next.pending;
  pending.get("Bonjour")({ isReliable: true, languages: [{ language: "fr", percentage: 100 }] });
  await old.pending;
  active.isActive = true;
  const translated = manual.translate("こんにちは", "auto", "ru");
  active.isActive = false;
  assert.equal(created.length, 1, "create occurs before any await in the click");
  assert.equal(created[0].sourceLanguage, "ja");
  assert.equal(created[0].targetLanguage, "ru");
  assert.equal(await translated, "こんにちは");
});

test("preparation failures can be retried rather than cached permanently", async () => {
  let checks = 0;
  const t = tools({
    active: true,
    translator: {
      async availability() {
        if (++checks === 1) throw new Error("Transient failure");
        return "downloadable";
      },
      async create() { return { translate: async () => "ok" }; }
    }
  });
  const manual = t.createManualTranslationPreparation();
  await manual.prepare("text", "en", "ru").pending;
  await assert.rejects(manual.translate("text", "en", "ru"), /Transient failure/);
  assert.equal(await manual.translate("text", "en", "ru"), "ok");
  assert.equal(checks, 2);
});

test("availability checks are coalesced across buttons for the same pair", async () => {
  let checks = 0;
  let clock = 1000;
  const t = tools({
    active: true,
    now: () => clock,
    translator: {
      async availability() { checks++; return "downloadable"; },
      async create() { return { translate: async text => text }; }
    }
  });
  const first = t.createManualTranslationPreparation();
  const second = t.createManualTranslationPreparation();
  await Promise.all([
    first.prepare("one", "en", "ru").pending,
    second.prepare("two", "en", "ru").pending
  ]);
  assert.equal(checks, 1, "concurrent preparations share one availability check");
  await t.createManualTranslationPreparation().prepare("three", "en", "ru").pending;
  assert.equal(checks, 1, "a burst of buttons reuses the recent result");
  clock += 6000;
  await t.createManualTranslationPreparation().prepare("four", "en", "ru").pending;
  assert.equal(checks, 2, "the cached status expires");
});
