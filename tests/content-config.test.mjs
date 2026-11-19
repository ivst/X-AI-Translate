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
