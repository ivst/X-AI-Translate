import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { test } from "node:test";

const source = await readFile(new URL("../content.js", import.meta.url), "utf8");

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
