import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

const scripts = await Promise.all(["i18n.js", "language-tools.js", "popup.js"]
  .map(name => readFile(new URL(`../${name}`, import.meta.url), "utf8")));

function makePopup({ provider = "chrome", translator, incognito = false, active = true, strictGesture = false, delayedConfig = false, savedState } = {}) {
  const elements = new Map();
  class Element {
    constructor() {
      this.value = "";
      this.options = [];
      this.style = {};
      this.listeners = {};
    }
    set innerHTML(_) { this.options = []; }
    appendChild(element) { this.options.push(element); }
    addEventListener(name, listener) { this.listeners[name] = listener; }
    setAttribute() {}
  }
  const el = id => {
    if (!elements.has(id)) elements.set(id, new Element());
    return elements.get(id);
  };
  const local = savedState ? { quickTranslateState: savedState } : {};
  const messages = [];
  const activation = { isActive: active };
  let syncReads = 0;
  let finishConfig;
  let storageListener;
  const area = store => ({
    get(defaults, callback) {
      const result = { ...defaults, ...store };
      callback?.(result);
      return Promise.resolve(result);
    },
    set(values, callback) { Object.assign(store, values); callback?.(); return Promise.resolve(); }
  });
  const context = vm.createContext({
    window: { addEventListener() {} },
    document: { documentElement: {}, getElementById: el, querySelectorAll: () => [], createElement: () => new Element() },
    chrome: {
      storage: {
        sync: {
          get(defaults, callback) {
            syncReads++;
            const result = { ...defaults, provider };
            if (delayedConfig && callback) finishConfig = () => callback(result);
            else callback?.(result);
            return Promise.resolve(result);
          }
        },
        local: area(local),
        onChanged: { addListener(listener) { storageListener = listener; } }
      },
      runtime: {
        id: "extension", lastError: null,
        sendMessage(message, callback) {
          messages.push(message);
          callback({ ok: true, text: "Cloud result" });
        }
      },
      windows: { getCurrent: async () => ({ incognito }) }
    },
    Translator: translator,
    navigator: { userActivation: activation },
    setTimeout, clearTimeout
  });
  for (const script of scripts) vm.runInContext(script, context);
  if (!savedState && !delayedConfig) {
    el("quickFrom").value = "ja";
    el("quickTo").value = "en";
    el("quickInput").value = "  こんにちは  ";
  }
  return {
    el, local, messages, activation, syncReads: () => syncReads,
    finishConfig: () => finishConfig(),
    providerChange: newValue => storageListener({ provider: { newValue } }, "sync"),
    click: () => {
      if (strictGesture) activation.isActive = true;
      const pending = el("quickTranslateBtn").listeners.click();
      if (strictGesture) activation.isActive = false;
      return pending;
    }
  };
}

test("popup local provider displays download progress, saves result and never sends a cloud request", async () => {
  let pair, destroyed = 0, resolveTranslation, signalStart;
  const started = new Promise(resolve => { signalStart = resolve; });
  const { el, local, messages, click } = makePopup({
    translator: {
      async availability(options) { pair = options; return "downloadable"; },
      async create(options) {
        options.monitor({
          addEventListener(name, handler) {
            assert.equal(name, "downloadprogress");
            handler({ loaded: 0.75 });
          }
        });
        return {
          translate(text) {
            assert.equal(text, "こんにちは");
            signalStart();
            return new Promise(resolve => { resolveTranslation = resolve; });
          },
          destroy() { destroyed++; }
        };
      }
    }
  });
  const pending = click();
  await started;
  assert.equal(el("quickTranslateBtn").disabled, true);
  assert.match(el("quickOutput").value, /75%/);
  assert.equal(pair.sourceLanguage, "ja");
  assert.equal(pair.targetLanguage, "en");
  resolveTranslation("Hello");
  await pending;
  assert.equal(el("quickOutput").value, "Hello");
  assert.equal(el("quickTranslateBtn").disabled, false);
  assert.equal(local.quickTranslateState.outputText, "Hello");
  assert.equal(destroyed, 1);
  assert.equal(messages.length, 0);
});

test("popup local provider reports unavailable API without cloud fallback and re-enables button", async () => {
  const { el, local, messages, click } = makePopup();
  await click();
  assert.match(el("quickOutput").value, /unavailable/);
  assert.equal(el("quickTranslateBtn").disabled, false);
  assert.equal(local.quickTranslateState.outputText, el("quickOutput").value);
  assert.equal(messages.length, 0);
});

test("popup local auto-detection translates the reported short Japanese string", async () => {
  let pair, passedText;
  const { el, messages, click } = makePopup({
    translator: {
      async availability(options) { pair = options; return "available"; },
      async create() { return { translate: async text => { passedText = text; return "До ре ми"; }, destroy() {} }; }
    }
  });
  const raw = "ドレミファソラシド。ｼｮｳ";
  el("quickInput").value = raw;
  el("quickFrom").value = "auto";
  el("quickTo").value = "ru";
  await click();
  assert.equal(pair.sourceLanguage, "ja");
  assert.equal(pair.targetLanguage, "ru");
  assert.equal(passedText, raw);
  assert.equal(el("quickOutput").value, "До ре ми");
  assert.equal(messages.length, 0);
});

test("popup auto-detection ignores emoji asset links in the reported X post", async () => {
  let pair, passedText;
  const { el, messages, click } = makePopup({
    translator: {
      async availability(options) { pair = options; return "available"; },
      async create() { return { translate: async text => { passedText = text; return "Лоллипоп"; }, destroy() {} }; }
    }
  });
  const raw = "ろりぽっぷむらさきさん[🍭](https://abs.twimg.com/emoji/v2/svg/1f36d.svg)[💜](https://abs.twimg.com/emoji/v2/svg/1f49c.svg)[🐰](https://abs.twimg.com/emoji/v2/svg/1f430.svg)";
  el("quickInput").value = raw;
  el("quickFrom").value = "auto";
  el("quickTo").value = "ru";
  await click();
  assert.equal(pair.sourceLanguage, "ja");
  assert.equal(passedText, raw);
  assert.equal(el("quickOutput").value, "Лоллипоп");
  assert.equal(messages.length, 0);
});

test("popup cloud providers still send the correct language pair and incognito flag", async () => {
  const { el, messages, click } = makePopup({ provider: "openai", incognito: true });
  await click();
  assert.equal(messages.length, 1);
  assert.equal(messages[0].action, "translateText");
  assert.equal(messages[0].text, "こんにちは");
  assert.equal(messages[0].sourceLang, "ja");
  assert.equal(messages[0].targetLang, "en");
  assert.equal(messages[0].incognito, true);
  assert.equal(el("quickOutput").value, "Cloud result");
  assert.equal(el("quickTranslateBtn").disabled, false);
});

const savedJapanese = { sourceLang: "ja", targetLang: "en", inputText: "こんにちは" };
const settle = () => new Promise(resolve => setImmediate(resolve));

test("popup waits for provider configuration and calls create directly with a prepared pair", async () => {
  let creates = 0;
  const h = makePopup({
    strictGesture: true, delayedConfig: true, savedState: savedJapanese, active: false,
    translator: {
      async availability() { return "downloadable"; },
      async create() {
        assert.equal(h.activation.isActive, true);
        creates++;
        return { translate: async () => "Hello" };
      }
    }
  });
  assert.equal(h.el("quickTranslateBtn").disabled, true);
  await h.click();
  assert.equal(h.messages.length, 0);
  h.finishConfig();
  await settle();
  assert.equal(h.el("quickTranslateBtn").disabled, false);
  const done = h.click();
  assert.equal(creates, 1, "create must run in the original click");
  await done;
  assert.equal(h.syncReads(), 1, "no configuration read in click handler");
  assert.equal(h.el("quickOutput").value, "Hello");
});

test("popup pending preparation retries on a fresh gesture and invalidates changed pairs", async () => {
  const checks = [], creates = [];
  let resolveAvailability;
  const h = makePopup({
    strictGesture: true, savedState: savedJapanese, active: false,
    translator: {
      availability(pair) {
        checks.push(pair);
        return new Promise(resolve => { resolveAvailability = resolve; });
      },
      async create(pair) {
        assert.equal(h.activation.isActive, true);
        creates.push(pair);
        return { translate: async () => "Translated" };
      }
    }
  });
  const first = h.click();
  resolveAvailability("downloadable");
  await first;
  assert.match(h.el("quickOutput").value, /Click the translate button again/);
  assert.equal(creates.length, 0);
  await h.click();
  assert.equal(creates.length, 1);
  assert.equal(checks.length, 1);

  h.el("quickTo").value = "ru";
  h.el("quickTo").listeners.change();
  resolveAvailability("downloadable");
  await settle();
  await h.click();
  assert.equal(creates[1].targetLanguage, "ru");
  assert.equal(checks.length, 2);
  assert.equal(h.syncReads(), 1);
});

test("popup provider changes invalidate a local preparation and win over stale initial settings", async () => {
  const h = makePopup({ delayedConfig: true, savedState: savedJapanese });
  h.providerChange("openai");
  h.finishConfig();
  await h.click();
  assert.equal(h.messages.length, 1);
  h.providerChange("chrome");
  await h.click();
  assert.match(h.el("quickOutput").value, /unavailable/);
  assert.equal(h.messages.length, 1, "switching back to Chrome cannot send text to the cloud");
});
