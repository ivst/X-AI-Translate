import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

const scripts = await Promise.all(["i18n.js", "language-tools.js", "popup.js"]
  .map(name => readFile(new URL(`../${name}`, import.meta.url), "utf8")));

function makePopup({ provider = "chrome", translator, incognito = false, active = true } = {}) {
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
  const local = {};
  const messages = [];
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
      storage: { sync: area({ provider }), local: area(local) },
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
    navigator: { userActivation: { isActive: active } },
    setTimeout, clearTimeout
  });
  for (const script of scripts) vm.runInContext(script, context);
  el("quickFrom").value = "ja";
  el("quickTo").value = "en";
  el("quickInput").value = "  こんにちは  ";
  return { el, local, messages, click: () => el("quickTranslateBtn").listeners.click() };
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
