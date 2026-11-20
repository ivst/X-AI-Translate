import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

const source = await readFile(new URL("../content.js", import.meta.url), "utf8");
const languageSource = await readFile(new URL("../language-tools.js", import.meta.url), "utf8");

test("content scripts use the settings message channel and ignore stale responses", () => {
  const requests = [];
  let onMessage;
  let activeObservers = 0;
  let scans = 0;
  const chrome = {
    runtime: {
      id: "extension",
      lastError: null,
      onMessage: { addListener(listener) { onMessage = listener; } },
      sendMessage(message, callback) { requests.push({ message, callback }); }
    },
    get storage() { throw new Error("Content scripts must not access extension storage"); }
  };
  const context = vm.createContext({
    chrome,
    window: { location: { hostname: "x.com" }, addEventListener() {} },
    document: {
      documentElement: {},
      addEventListener() {},
      querySelectorAll() { scans++; return []; }
    },
    MutationObserver: class {
      observe() { activeObservers++; }
      disconnect() { activeObservers--; }
    },
    setTimeout, clearTimeout
  });
  vm.runInContext(source, context);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].message.action, "getContentConfig");
  onMessage({ action: "contentConfigChanged" });
  assert.equal(requests.length, 2);
  requests[1].callback({
    ok: true, config: { enableXInlineTranslation: false, enableXAutoTranslation: false }
  });
  requests[0].callback({
    ok: true, config: { enableXInlineTranslation: true }
  });
  assert.equal(activeObservers, 0, "stale response must not enable X inline translation");
  onMessage({ action: "contentConfigChanged" });
  requests[2].callback({
    ok: true, config: { enableXInlineTranslation: true }
  });
  assert.equal(activeObservers, 1, "updated settings are applied without reloading the page");
  const previousScans = scans;
  onMessage({ action: "contentConfigChanged" });
  requests[3].callback({
    ok: true, config: { enableXInlineTranslation: true, overlayDuration: 10 }
  });
  assert.equal(scans, previousScans, "unrelated settings do not reset inline translations");
});

test("completed auto-translations are requested again after inline settings rebuild result nodes", () => {
  const requests = [];
  let onMessage;
  let intersection;
  const children = [];
  const container = {
    appendChild(node) { children.push(node); },
    querySelectorAll(selector) {
      return children.filter((node) => selector === "[data-ai-translate]"
        ? node.dataset.aiTranslate : `.${node.className}` === selector);
    },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  };
  const tweet = {
    textContent: "こんにちは世界", isConnected: true, parentElement: container,
    closest(selector) { return selector === '[data-testid="tweetText"]' ? this : null; }
  };
  function createElement() {
    const classes = new Set();
    const node = {
      style: {}, dataset: {}, classList: {
        add(name) { classes.add(name); }, remove(name) { classes.delete(name); },
        contains(name) { return classes.has(name); }
      },
      addEventListener() {},
      remove() { children.splice(children.indexOf(node), 1); }
    };
    return node;
  }
  const context = vm.createContext({
    chrome: { runtime: {
      id: "extension", lastError: null,
      onMessage: { addListener(listener) { onMessage = listener; } },
      sendMessage(message, callback) { requests.push({ message, callback }); }
    } },
    window: {
      location: { hostname: "x.com" }, addEventListener() {},
      IntersectionObserver: class {
        constructor(callback) { intersection = callback; }
        observe() {} unobserve() {} disconnect() {}
      }
    },
    document: { documentElement: {}, addEventListener() {}, querySelectorAll() { return [tweet]; }, createElement },
    MutationObserver: class { observe() {} disconnect() {} },
    setTimeout() { return 1; }, clearTimeout() {}
  });
  vm.runInContext(source, context);
  const config = { enableXAutoTranslation: true, enableXInlineTranslation: true, targetLang: "en", uiLang: "en" };
  const applyConfig = (next, notify = true) => {
    if (notify) onMessage({ action: "contentConfigChanged" });
    requests.at(-1).callback({ ok: true, config: next });
  };
  const translate = () => {
    intersection([{ target: tweet, isIntersecting: true }]);
    return requests.filter((req) => req.message.action === "translateStream");
  };
  const finish = (request, text) => onMessage({ action: "streamUpdate", target: "inline", requestId: request.message.requestId, text, done: true });
  applyConfig(config, false);
  const first = translate();
  assert.equal(first.length, 1);
  finish(first[0], "Hello world");
  const oldResult = container.querySelector(".ai-translate-result");
  assert.equal(oldResult.textContent, "Hello world");
  assert.equal(translate().length, 1, "completed text is deduplicated without a refresh");

  applyConfig({ ...config, uiLang: "ru" });
  assert.notEqual(container.querySelector(".ai-translate-result"), oldResult);
  const second = translate();
  assert.equal(second.length, 2, "unchanged translation signature must be requested again");
  finish(second[1], "Hello again");
  assert.equal(container.querySelector(".ai-translate-result").textContent, "Hello again");

  applyConfig({ ...config, uiLang: "ru", enableXInlineTranslation: false });
  const third = translate();
  assert.equal(third.length, 3, "toggling buttons must not leave a blank translation");
  finish(third[2], "Hello once more");
  assert.equal(container.querySelector(".ai-translate-result").textContent, "Hello once more");
});

test("same-script foreign language detection controls inline buttons and waits for confidence", async () => {
  const children = [];
  const requests = [];
  let resolveDetection;
  const container = {
    appendChild(node) { children.push(node); },
    querySelectorAll(selector) {
      return children.filter((node) => selector === "[data-ai-translate]"
        ? node.dataset.aiTranslate : `.${node.className}` === selector);
    },
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  };
  const tweet = {
    textContent: "Guten Morgen, wie geht es Ihnen?", isConnected: true, parentElement: container,
    closest(selector) { return selector === '[data-testid="tweetText"]' ? this : null; }
  };
  function createElement() {
    const node = {
      style: {}, dataset: {}, classList: { add() {}, remove() {}, contains() { return false; } },
      addEventListener() {}, remove() { children.splice(children.indexOf(node), 1); }
    };
    return node;
  }
  const context = vm.createContext({
    chrome: {
      i18n: { detectLanguage: () => new Promise(resolve => { resolveDetection = resolve; }) },
      runtime: {
        id: "extension", lastError: null, onMessage: { addListener() {} },
        sendMessage(message, callback) { requests.push({ message, callback }); }
      }
    },
    window: { location: { hostname: "x.com" }, addEventListener() {} },
    document: { documentElement: {}, addEventListener() {}, querySelectorAll() { return [tweet]; }, createElement },
    MutationObserver: class { observe() {} disconnect() {} },
    setTimeout, clearTimeout
  });
  vm.runInContext(languageSource, context);
  vm.runInContext(source, context);
  requests[0].callback({ ok: true, config: { targetLang: "en", enableXInlineTranslation: true } });
  assert.equal(children.length, 0, "no buttons before the detector settles");
  resolveDetection({ isReliable: true, languages: [{ language: "de", percentage: 100 }] });
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(container.querySelector(".ai-translate-btn"), "German text is offered for translation into English");
});

function manualTranslationHarness(config = {}, { strictGesture = false, availability = async () => "downloadable" } = {}) {
  const requests = [];
  const timers = new Map();
  const documentEvents = {};
  const activation = { isActive: false };
  const translations = [];
  let timerId = 0;
  let intersection;
  function element() {
    const classes = new Set();
    return {
      style: {}, dataset: {}, children: [], events: {}, isConnected: true,
      classList: {
        add(name) { classes.add(name); }, remove(name) { classes.delete(name); },
        contains(name) { return classes.has(name); }
      },
      addEventListener(name, listener) { this.events[name] = listener; },
      appendChild(node) { this.children.push(node); node.parentElement = this; },
      removeChild(node) { this.children.splice(this.children.indexOf(node), 1); node.parentElement = null; },
      remove() { this.parentElement?.removeChild(this); },
      querySelectorAll(selector) {
        return this.children.filter(node => selector === "[data-ai-translate]"
          ? node.dataset.aiTranslate : `.${node.className}` === selector);
      },
      querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    };
  }
  const container = element();
  const body = element();
  const tweet = {
    textContent: "こんにちは世界", isConnected: true, parentElement: container,
    closest(selector) { return selector === '[data-testid="tweetText"]' ? this : null; }
  };
  const context = vm.createContext({
    chrome: { runtime: {
      id: "extension", lastError: null, onMessage: { addListener() {} },
      getURL: path => path,
      sendMessage(message, callback) {
        requests.push(message);
        // Simulate losing the gesture on a cold worker round trip.
        if (message.action === "translateStream") activation.isActive = false;
        if (message.action !== "getContentConfig") callback?.({ ok: true });
        else callback({ ok: true, config: {
          provider: "chrome", sourceLang: "ja", targetLang: "en", selectionShortcut: true, ...config
        } });
      }
    } },
    navigator: { userActivation: activation },
    Translator: {
      availability,
      async create(options) {
        assert.equal(activation.isActive, true, "create must retain the click's activation");
        const translation = { options };
        options.monitor({ addEventListener(_event, listener) { translation.progress = listener; } });
        translations.push(translation);
        return {
          translate(text) {
            translation.text = text;
            return new Promise((resolve, reject) => Object.assign(translation, { resolve, reject }));
          },
          destroy() { translation.destroyed = true; }
        };
      }
    },
    window: {
      location: { hostname: "x.com" }, innerWidth: 1000, addEventListener() {},
      getSelection: () => ({
        toString: () => tweet.textContent, rangeCount: 1,
        getRangeAt: () => ({ getClientRects: () => [{ width: 100, right: 200, top: 100 }] })
      }),
      IntersectionObserver: class {
        constructor(callback) { intersection = callback; }
        observe() {} unobserve() {} disconnect() {}
      }
    },
    document: {
      body, documentElement: {}, createElement: element, getElementById: () => null,
      addEventListener(name, callback) { documentEvents[name] = callback; },
      querySelectorAll() { return [tweet]; }
    },
    MutationObserver: class { observe() {} disconnect() {} },
    setTimeout(callback, delay) { timers.set(++timerId, { callback, delay }); return timerId; },
    clearTimeout(id) { timers.delete(id); }
  });
  vm.runInContext(languageSource, context);
  vm.runInContext(source, context);
  const click = node => {
    activation.isActive = true;
    node.events.click();
    if (strictGesture) activation.isActive = false;
  };
  const selection = () => {
    documentEvents.selectionchange();
    [...timers.values()].find(timer => timer.delay === 80).callback();
    return body.querySelector(".ai-translate-selection-btn");
  };
  return {
    requests, translations, container, body, click, selection,
    makeVisible: () => intersection([{ target: tweet, isIntersecting: true }]),
    expire: () => [...timers.values()].find(timer => timer.delay === 45000).callback()
  };
}
const settleTranslation = () => new Promise(resolve => setImmediate(resolve));

test("manual inline Chrome translation starts locally, reports progress and only saves the final result", async () => {
  const h = manualTranslationHarness();
  const button = h.container.querySelector(".ai-translate-btn");
  const result = h.container.querySelector(".ai-translate-result");
  h.click(button);
  await settleTranslation();
  const translation = h.translations[0];
  assert.equal(translation.options.sourceLanguage, "ja");
  assert.equal(translation.options.targetLanguage, "en");
  assert.equal(translation.text, "こんにちは世界");
  assert.equal(h.requests.length, 1, "no worker request before or during local translation");
  translation.progress({ loaded: 0.5 });
  assert.equal(result.textContent, "Translating... 50%");
  assert.equal(h.requests.length, 1, "progress does not persist history");
  translation.resolve("Hello world");
  await settleTranslation();
  assert.equal(result.textContent, "Hello world");
  assert.equal(button.textContent, "Done");
  assert.equal(translation.destroyed, true);
  assert.deepEqual(JSON.parse(JSON.stringify(h.requests.at(-1))), {
    action: "recordLocalTranslation", text: "Hello world", error: false
  });
});

test("manual selection Chrome translation starts locally and displays and records errors", async () => {
  const h = manualTranslationHarness();
  const button = h.selection();
  h.click(button);
  await settleTranslation();
  const translation = h.translations[0];
  const overlay = h.body.querySelector(".ai-translate-overlay").querySelector(".ai-translate-overlay-content");
  translation.progress({ loaded: 0.25 });
  assert.equal(overlay.textContent, "Translating... 25%");
  assert.equal(h.requests.length, 1);
  translation.reject(new Error("Unsupported pair"));
  await settleTranslation();
  assert.equal(overlay.textContent, "Error: Unsupported pair");
  assert.equal(button.classList.contains("ai-translate-loading"), false);
  assert.deepEqual(JSON.parse(JSON.stringify(h.requests.at(-1))), {
    action: "recordLocalTranslation", text: "Unsupported pair", error: true
  });
  assert.equal(h.requests.some(request => request.action === "translateStream"), false, "no cloud fallback");
});

test("late local results do not replace the timeout or persist stale history", async () => {
  const h = manualTranslationHarness();
  h.click(h.container.querySelector(".ai-translate-btn"));
  await settleTranslation();
  h.expire();
  h.translations[0].resolve("Late");
  await settleTranslation();
  assert.equal(h.container.querySelector(".ai-translate-result").textContent, "Error: timeout");
  assert.equal(h.requests.length, 1);
});

test("automatic Chrome and manual cloud translations still use the worker", async () => {
  const automatic = manualTranslationHarness({ enableXAutoTranslation: true });
  automatic.makeVisible();
  assert.equal(automatic.requests.at(-1).action, "translateStream");
  assert.equal(automatic.translations.length, 0);
  const cloud = manualTranslationHarness({ provider: "googletranslate" });
  cloud.click(cloud.container.querySelector(".ai-translate-btn"));
  assert.equal(cloud.requests.at(-1).action, "translateStream");
  cloud.click(cloud.selection());
  assert.equal(cloud.requests.at(-1).action, "translateStream");
  assert.equal(cloud.translations.length, 0);
});

test("prepared inline and selection clicks enter Translator.create synchronously", async () => {
  const h = manualTranslationHarness({}, { strictGesture: true });
  await settleTranslation();
  h.click(h.container.querySelector(".ai-translate-btn"));
  assert.equal(h.translations.length, 1, "inline create runs before the click handler returns");
  await settleTranslation();
  h.translations[0].resolve("Inline");
  await settleTranslation();

  const button = h.selection();
  await settleTranslation();
  h.click(button);
  assert.equal(h.translations.length, 2, "selection create runs before the click handler returns");
  await settleTranslation();
  h.translations[1].resolve("Selection");
  await settleTranslation();
  assert.equal(h.requests.filter(request => request.action === "recordLocalTranslation").length, 2);
});

test("a slow availability check permits a fresh click without another wait", async () => {
  let resolveAvailability, checks = 0;
  const h = manualTranslationHarness({}, {
    strictGesture: true,
    availability: () => {
      checks++;
      return new Promise(resolve => { resolveAvailability = resolve; });
    }
  });
  const button = h.container.querySelector(".ai-translate-btn");
  h.click(button);
  resolveAvailability("downloadable");
  await settleTranslation();
  assert.match(h.container.querySelector(".ai-translate-result").textContent, /Click the translate button again/);
  assert.equal(h.translations.length, 0);
  h.click(button);
  assert.equal(h.translations.length, 1);
  assert.equal(checks, 1, "retry must reuse preparation");
  await settleTranslation();
  h.translations[0].resolve("Hello");
  await settleTranslation();
  assert.equal(h.container.querySelector(".ai-translate-result").textContent, "Hello");
});
