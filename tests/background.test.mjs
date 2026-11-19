import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const source = await readFile(new URL("../background.js", import.meta.url), "utf8");
const modelSource = await readFile(new URL("../model-config.js", import.meta.url), "utf8");
const cacheSource = await readFile(new URL("../translation-cache.js", import.meta.url), "utf8");
const optionsSource = await readFile(new URL("../options.js", import.meta.url), "utf8");
const localStore = {};
const syncStore = {};
const listeners = {};
const executedScripts = [];
const storageAccessLevels = [];
let fetchMock = async () => {
  throw new Error("Unexpected fetch call");
};

function storageArea(store) {
  return {
    setAccessLevel(options) {
      storageAccessLevels.push(options.accessLevel);
      return Promise.resolve();
    },
    get(defaults = {}, callback) {
      let result;
      if (typeof defaults === "string") {
        result = { [defaults]: store[defaults] };
      } else if (Array.isArray(defaults)) {
        result = Object.fromEntries(defaults.map((key) => [key, store[key]]));
      } else {
        result = { ...defaults, ...store };
      }
      callback?.(result);
      return Promise.resolve(result);
    },
    set(values, callback) {
      Object.assign(store, values);
      callback?.();
      return Promise.resolve();
    }
  };
}

function chromeEvent(name) {
  return {
    addListener(listener) {
      listeners[name] = listener;
    }
  };
}

const chrome = {
  commands: { onCommand: chromeEvent("command") },
  contextMenus: {
    create() {},
    onClicked: chromeEvent("contextMenuClicked")
  },
  notifications: { create() {} },
  runtime: {
    id: "extension",
    lastError: null,
    onInstalled: chromeEvent("installed"),
    onMessage: chromeEvent("message")
  },
  scripting: {
    executeScript(options, callback) {
      executedScripts.push(options);
      callback?.([{ result: "" }]);
    },
    insertCSS(_options, callback) {
      callback?.();
    }
  },
  storage: {
    onChanged: chromeEvent("storageChanged"),
    local: storageArea(localStore),
    sync: storageArea(syncStore)
  },
  tabs: {
    get(_tabId, callback) { callback({ url: "https://example.com" }); },
    onActivated: chromeEvent("tabActivated"),
    onRemoved: chromeEvent("tabRemoved"),
    onUpdated: chromeEvent("tabUpdated"),
    query(_query, callback) { callback([]); },
    sendMessage(_tabId, _payload, callback) { callback?.(); }
  }
};

const context = vm.createContext({
  importScripts(name) {
    assert.ok(["model-config.js", "translation-cache.js"].includes(name));
    vm.runInContext(name === "model-config.js" ? modelSource : cacheSource, context);
  },
  AbortController,
  chrome,
  crypto: webcrypto,
  clearTimeout,
  console,
  fetch: (...args) => fetchMock(...args),
  Math,
  Promise,
  Response,
  setTimeout: (callback, milliseconds, ...args) => (
    setTimeout(callback, Math.min(milliseconds, 10), ...args)
  ),
  TextDecoder,
  TextEncoder,
  URL,
  WeakMap
});
vm.runInContext(source, context, { filename: "background.js" });

const value = (expression) => vm.runInContext(expression, context);
const call = (name, ...args) => value(name)(...args);
const jsonResponse = (data, status = 200, headers = {}) => new Response(
  JSON.stringify(data),
  { status, headers: { "content-type": "application/json", ...headers } }
);
const sseResponse = (chunks) => new Response(
  new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
      controller.close();
    }
  }),
  { status: 200, headers: { "content-type": "text/event-stream" } }
);

let assertions = 0;
function check(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

check(storageAccessLevels, ["TRUSTED_CONTEXTS", "TRUSTED_CONTEXTS"], "Both storage areas are restricted");
Object.assign(syncStore, {
  apiKey: "legacy-secret",
  apiKeyByProvider: { openai: "secret" },
  apiUrl: "https://example.test/secret",
  targetLang: "ru",
  enableXAutoTranslation: true
});
const contentResponse = await new Promise((resolve) => {
  check(listeners.message({ action: "getContentConfig" }, { tab: { id: 1 } }, resolve),
    true, "Content settings request keeps the response channel open");
});
check(contentResponse.ok, true, "Content settings returned");
check(contentResponse.config.targetLang, "ru", "Content settings retain the selected language");
check(contentResponse.config.enableXAutoTranslation, true, "Content settings retain auto translation");
check(Object.keys(contentResponse.config).some((key) => /apiKey|apiUrl|history|lastTranslation/i.test(key)),
  false, "No keys, endpoint or translation history exposed to content scripts");
for (const key of Object.keys(syncStore)) delete syncStore[key];

const nativeUrls = {
  openai: "https://api.openai.com/v1", claude: "https://api.anthropic.com",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai", deepseek: "https://api.deepseek.com"
};
const nativeConfig = (provider, model, extra = {}) => ({ provider, model, apiUrl: nativeUrls[provider] || "https://example.test/v1", ...extra });
const migrate = (config) => call("migrateModelConfig", config);
for (const [provider, oldModel, newModel] of [
  ["openai", "gpt-4o-mini", "gpt-6-luna"],
  ["claude", "claude-3-5-haiku-latest", "claude-haiku-5-5"],
  ["gemini", "gemini-2.0-flash-lite", "gemini-3.5-flash-lite"],
  ["deepseek", "deepseek-v4-flash", "deepseek-flash"],
  ["custom", "gpt-4o-mini", "gpt-4o-mini"]
]) {
  check(call("resolveModelForProvider", migrate(nativeConfig(provider, oldModel))), newModel, `${provider} saved model migration`);
  check(call("resolveModelForProvider", migrate(nativeConfig(provider, oldModel, { modelMigrationVersion: 1 }))), oldModel, `${provider} explicitly saved ID is preserved`);
}
check(migrate(nativeConfig("openai", "gpt-4o-mini", { apiUrl: "https://example.test/v1" })).model, "gpt-4o-mini", "Compatible endpoint model is preserved");
const lunaBody = call("buildTranslateRequestBody", migrate(nativeConfig("openai", "gpt-4o-mini")), "Hello", "ru", "en", true);
check(lunaBody.reasoning_effort, "none", "GPT-6 Luna disables reasoning for translation");
check(lunaBody.model, "gpt-6-luna", "Luna is used for legacy OpenAI model");

check(call("isUnsupportedTabUrl", "chrome://settings"), true, "Chrome pages are blocked");
check(call("isUnsupportedTabUrl", "https://example.com"), false, "Web pages are allowed");
check(call("getGoogleLanguageCode", "he"), "iw", "Google Hebrew alias");
check(call("getGoogleLanguageCode", "zh"), "zh-CN", "Google Chinese alias");
check(call("getDeepLLanguageCode", "auto"), "", "DeepL auto source");
check(call("isDirectTranslationProvider", "googletranslate"), true, "Google is direct");
check(call("isDirectTranslationProvider", "openai"), false, "OpenAI is chat based");
check(call("splitGoogleText", "one two three", 7).join("|"), "one two| three", "Text splitting");

check(
  call("normalizeApiBaseUrl", "gemini", "https://generativelanguage.googleapis.com"),
  "https://generativelanguage.googleapis.com/v1beta/openai",
  "Gemini OpenAI-compatible base URL"
);
check(
  call("buildChatCompletionsUrl", { provider: "claude", apiUrl: "https://api.anthropic.com" }),
  "https://api.anthropic.com/v1/messages",
  "Claude messages URL"
);
check(
  call("resolveModelForProvider", migrate(nativeConfig("deepseek", "deepseek-chat"))),
  "deepseek-flash",
  "DeepSeek retired alias"
);
const legacyChatBody = call(
  "buildTranslateRequestBody",
  migrate(nativeConfig("deepseek", "deepseek-chat", { deepseekThinkingEnabled: true })),
  "こんにちは",
  "ru",
  "ja",
  false
);
check(legacyChatBody.model, "deepseek-flash", "Legacy chat uses DeepSeek V4 Flash");
check(legacyChatBody.thinking.type, "disabled", "Legacy chat preserves non-thinking semantics");
const legacyReasonerBody = call(
  "buildTranslateRequestBody",
  migrate(nativeConfig("deepseek", "deepseek-reasoner", { deepseekThinkingEnabled: false })),
  "こんにちは",
  "ru",
  "ja",
  false
);
check(legacyReasonerBody.model, "deepseek-flash", "Legacy reasoner uses DeepSeek V4 Flash");
check(legacyReasonerBody.thinking.type, "enabled", "Legacy reasoner preserves thinking semantics");
const currentFlashBody = call(
  "buildTranslateRequestBody",
  { provider: "deepseek", model: "deepseek-flash", deepseekThinkingEnabled: true },
  "こんにちは",
  "ru",
  "ja",
  false
);
check(currentFlashBody.thinking.type, "enabled", "Current DeepSeek models respect the user setting");

Object.assign(syncStore, nativeConfig("deepseek", "deepseek-reasoner", { deepseekThinkingEnabled: false, modelMigrationVersion: 0 }));
let migratedDeepSeek = await call("migrateLegacyModelConfig", {
  provider: "deepseek",
  apiUrl: nativeUrls.deepseek,
  model: "deepseek-reasoner",
  deepseekThinkingEnabled: false
});
check(migratedDeepSeek.model, "deepseek-flash", "Legacy reasoner configuration is migrated");
check(migratedDeepSeek.deepseekThinkingEnabled, true, "Reasoner migration enables thinking");
check(syncStore.model, "deepseek-flash", "DeepSeek migration is persisted");
check(syncStore.deepseekThinkingEnabled, true, "Persisted reasoner migration enables thinking");

Object.assign(syncStore, nativeConfig("deepseek", "deepseek-chat", { deepseekThinkingEnabled: true, modelMigrationVersion: 0 }));
migratedDeepSeek = await call("migrateLegacyModelConfig", {
  provider: "deepseek",
  apiUrl: nativeUrls.deepseek,
  model: "deepseek-chat",
  deepseekThinkingEnabled: true
});
check(migratedDeepSeek.deepseekThinkingEnabled, false, "Chat migration disables thinking");

Object.assign(syncStore, nativeConfig("deepseek", "deepseek-reasoner", { deepseekThinkingEnabled: false, modelMigrationVersion: 0 }));
const originalSyncSet = chrome.storage.sync.set;
chrome.storage.sync.set = () => Promise.reject(new Error("Sync quota exceeded"));
try {
  migratedDeepSeek = await call("migrateLegacyModelConfig", {
    provider: "deepseek",
    apiUrl: nativeUrls.deepseek,
    model: "deepseek-reasoner",
    deepseekThinkingEnabled: false
  });
  check(migratedDeepSeek.model, "deepseek-flash", "Storage failure keeps the migrated model in memory");
  check(migratedDeepSeek.deepseekThinkingEnabled, true, "Storage failure keeps reasoner thinking enabled");
} finally {
  chrome.storage.sync.set = originalSyncSet;
}
assert.throws(
  () => call("resolveModelForProvider", { provider: "yandexgpt", model: "text-embedding", yandexFolderId: "id" }),
  /Embedding models are not supported/
);
assertions += 1;

const prompt = call("buildPrompt", "こんにちは", "ru", "auto");
check(prompt.includes("Target language: Russian (Русский), BCP-47 code: ru."), true, "Exact target prompt");
check(prompt.includes("do not change the requested target language"), true, "Auto detection guard");
check(call("buildPrompt", "text", "ja", "en").includes("Do not substitute Simplified or Traditional Chinese."), true, "Japanese guard");

const claudeHeaders = call("buildProviderHeaders", { provider: "claude" }, "secret");
check(claudeHeaders["x-api-key"], "secret", "Claude API key header");
check(claudeHeaders["anthropic-version"], "2023-06-01", "Claude version header");
const geminiHeaders = call("buildProviderHeaders", { provider: "gemini" }, "gem-key");
check(geminiHeaders["x-goog-api-key"], "gem-key", "Gemini API key header");

Object.assign(localStore, { apiKeyByProvider: { openai: "openai-key", claude: "claude-key" } });
check(await call("getAuthorizationToken", { provider: "openai", syncApiKeys: false, apiKeyByProvider: {} }), "openai-key", "Provider key isolation");
check(await call("getAuthorizationToken", { provider: "claude", syncApiKeys: false, apiKeyByProvider: {} }), "claude-key", "Second provider key isolation");

localStore.apiKeyByProvider.openai = "stale-local-key";
localStore.apiKey = "stale-legacy-key";
await assert.rejects(
  call("getAuthorizationToken", {
    provider: "openai",
    syncApiKeys: true,
    apiKeyByProvider: { openai: "" },
    apiKey: "stale-synced-legacy-key"
  }),
  /API key is missing/
);
assertions += 1;
check(syncStore.apiKeyByProvider?.openai, undefined, "Cleared synced key is not restored from local storage");
check(syncStore.apiKey, "", "Mapped sync storage clears its legacy global key");
check(localStore.apiKey, "", "Mapped sync storage clears stale local legacy key");

localStore.apiKeyByProvider.openai = "";
await assert.rejects(
  call("getAuthorizationToken", {
    provider: "openai",
    syncApiKeys: false,
    apiKeyByProvider: { openai: "stale-sync-key" }
  }),
  /API key is missing/
);
assertions += 1;
localStore.apiKeyByProvider.openai = "openai-key";

let directRequest;
fetchMock = async (url, init) => {
  directRequest = { url: String(url), init };
  return jsonResponse([[['Привет']]]);
};
check(
  await call("translateWithGoogle", "Hello", "ru", "auto", "https://translate.googleapis.com"),
  "Привет",
  "Google direct translation"
);
check(new URL(directRequest.url).searchParams.get("sl"), "auto", "Google source auto-detection");
check(new URL(directRequest.url).searchParams.get("tl"), "ru", "Google target language");

fetchMock = async (url, init) => {
  directRequest = { url: String(url), init };
  return jsonResponse({ translations: [{ text: "Hallo" }] });
};
check(
  await call("translateWithDeepL", "Hello", "de", "auto", "https://api-free.deepl.com", "deepl-key"),
  "Hallo",
  "DeepL direct translation"
);
check(JSON.parse(directRequest.init.body).source_lang, undefined, "DeepL omits source for auto-detection");
check(directRequest.init.headers.Authorization, "DeepL-Auth-Key deepl-key", "DeepL authorization header");

const requestBodies = [];
fetchMock = async (_url, init) => {
  const body = JSON.parse(init.body);
  requestBodies.push(body);
  if (Object.hasOwn(body, "temperature")) {
    return jsonResponse({ error: { message: "Unsupported value", param: "temperature" } }, 400);
  }
  if (Object.hasOwn(body, "top_p")) {
    return jsonResponse({ error: { message: "Unknown parameter", param: "top_p" } }, 400);
  }
  return jsonResponse({ choices: [{ message: { content: "Готово" } }] });
};
const compatibleResponse = await call(
  "requestTranslation",
  { provider: "openai" },
  "https://api.openai.com/v1/chat/completions",
  { "Content-Type": "application/json" },
  { model: "gpt-test", temperature: 0.2, top_p: 0.8, messages: [] }
);
check(compatibleResponse.ok, true, "Compatibility retries eventually succeed");
check(requestBodies.length, 3, "All incompatible parameters are retried in one request");
check(Object.hasOwn(requestBodies[1], "temperature"), false, "Temperature removed on first retry");
check(Object.hasOwn(requestBodies[2], "top_p"), false, "Top-p removed on second retry");
await call("readResponseJson", compatibleResponse);

requestBodies.length = 0;
const cachedResponse = await call(
  "requestTranslation",
  { provider: "openai" },
  "https://api.openai.com/v1/chat/completions",
  { "Content-Type": "application/json" },
  { model: "gpt-test", temperature: 0.2, top_p: 0.8, messages: [] }
);
check(requestBodies.length, 1, "Cached parameter capabilities avoid repeated failures");
await call("readResponseJson", cachedResponse);

await Promise.all([
  call("cacheUnsupportedParameter", "provider|one|model", "temperature"),
  call("cacheUnsupportedParameter", "provider|two|model", "top_p")
]);
const capabilityCache = localStore.unsupportedRequestParameters;
check(capabilityCache["provider|one|model"][0], "temperature", "First concurrent cache write preserved");
check(capabilityCache["provider|two|model"][0], "top_p", "Second concurrent cache write preserved");

check(call("extractClaudeText", { content: [{ type: "text", text: "Bonjour" }] }), "Bonjour", "Claude response extraction");
check(call("extractTextFromOpenAICompatible", { choices: [{ message: { content: "Hola" } }] }), "Hola", "OpenAI response extraction");
check(call("extractTextFromOpenAICompatible", { choices: [{ message: { reasoning_content: "chain of thought" } }] }), "", "Reasoning is not displayed as translation");
check(call("extractDeltaFromOpenAIChunk", { choices: [{ delta: { content: "Hi" } }] }), "Hi", "OpenAI stream delta extraction");

Object.assign(syncStore, {
  provider: "openai",
  apiUrl: "https://api.openai.com/v1",
  apiKeyByProvider: {},
  model: "stream-model",
  sourceLang: "auto",
  targetLang: "ru",
  syncApiKeys: false
});
localStore.apiKeyByProvider.openai = "openai-key";
delete localStore.unsupportedRequestParameters;

fetchMock = async () => sseResponse([
  "data: {\"choices\":[{\"delta\":{\"content\":\"При\"}}]}\n\n",
  "data: {\"choices\":[{\"delta\":{\"content\":\"вет\"}}]}"
]);
const updates = [];
await call("streamTranslate", "Hello", (text, done) => updates.push({ text, done }));
check(updates.at(-1), { text: "Привет", done: true }, "Final SSE tail without newline is processed");

fetchMock = async () => sseResponse([
  "event: error\ndata: {\"type\":\"error\",\"error\":{\"message\":\"Overloaded\"}}\n\n"
]);
await assert.rejects(
  call("streamTranslate", "Hello", () => {}),
  /API stream error: Overloaded/
);
assertions += 1;

Object.assign(syncStore, { provider: "claude", apiUrl: "https://api.anthropic.com", model: "claude-test" });
fetchMock = async () => sseResponse([
  "event: content_block_delta\ndata: {\"type\":\"content_block_delta\",\"delta\":{\"type\":\"text_delta\",\"text\":\"Salut\"}}\n\n",
  "event: message_stop\ndata: {\"type\":\"message_stop\"}\n\n"
]);
const claudeUpdates = [];
await call("streamTranslate", "Hello", (text, done) => claudeUpdates.push({ text, done }));
check(claudeUpdates.at(-1), { text: "Salut", done: true }, "Claude SSE completes with final text");

Object.assign(syncStore, { provider: "openai", apiUrl: "https://api.openai.com/v1", model: "idle-model" });
fetchMock = async () => new Response(
  new ReadableStream({ start() {}, cancel() {} }),
  { status: 200, headers: { "content-type": "text/event-stream" } }
);
await assert.rejects(
  call("streamTranslate", "Hello", () => {}),
  /Response stream timed out after 45 seconds of inactivity/
);
assertions += 1;

fetchMock = async (_url, init) => new Promise((resolve, reject) => {
  init.signal.addEventListener("abort", () => {
    reject(new DOMException("Aborted", "AbortError"));
  });
});
await assert.rejects(call("fetchWithTimeout", "https://example.com"), /Request timed out after 45 seconds/);
assertions += 1;

await call("ensureContentScript", 42);
check(Array.from(executedScripts.at(-1).files), ["i18n.js", "language-tools.js", "content.js"], "Dynamic injection includes shared language tools before content script");

check(typeof listeners.message, "function", "Runtime listener registered");
check(typeof listeners.contextMenuClicked, "function", "Context menu listener registered");
check(typeof listeners.command, "function", "Keyboard command listener registered");

const deepSeekOptionsStart = optionsSource.indexOf("async function migrateLegacyModelConfig");
const deepSeekOptionsEnd = optionsSource.indexOf("const PROVIDERS");
const deepSeekOptionsSyncStore = nativeConfig("deepseek", "deepseek-reasoner", { deepseekThinkingEnabled: false });
const deepSeekOptionsContext = vm.createContext({
  URL,
  chrome: { storage: { sync: storageArea(deepSeekOptionsSyncStore) } }
});
vm.runInContext(modelSource, deepSeekOptionsContext);
vm.runInContext(optionsSource.slice(deepSeekOptionsStart, deepSeekOptionsEnd), deepSeekOptionsContext);
const migrateOptionsDeepSeek = vm.runInContext("migrateLegacyModelConfig", deepSeekOptionsContext);
const migratedOptionsReasoner = await migrateOptionsDeepSeek({ ...deepSeekOptionsSyncStore });
check(migratedOptionsReasoner.model, "deepseek-flash", "Options migrate legacy reasoner model");
check(migratedOptionsReasoner.deepseekThinkingEnabled, true, "Options preserve reasoner thinking mode");
check(deepSeekOptionsSyncStore.model, "deepseek-flash", "Options persist the migrated model");

const deepSeekFilterStart = optionsSource.indexOf("function filterDeepSeekModels");
const deepSeekFilterEnd = optionsSource.indexOf("function loadDeepSeekCache");
const deepSeekFilterContext = vm.createContext({});
vm.runInContext(modelSource, deepSeekFilterContext);
vm.runInContext(optionsSource.slice(deepSeekFilterStart, deepSeekFilterEnd), deepSeekFilterContext);
const filterDeepSeekModels = vm.runInContext("filterDeepSeekModels", deepSeekFilterContext);
check(Array.from(filterDeepSeekModels([
  { id: "deepseek-chat" },
  { id: "deepseek-reasoner" },
  { id: "deepseek-v4-flash" },
  { id: "deepseek-flash" },
  { id: "deepseek-v4-pro" }
])), ["deepseek-chat", "deepseek-flash", "deepseek-reasoner", "deepseek-v4-flash", "deepseek-v4-pro"], "Options preserve advertised DeepSeek IDs");

const keyHelpersStart = optionsSource.indexOf("function getKeyByProviderFromStore");
const keyHelpersEnd = optionsSource.indexOf("function getLanguageDisplayName");
assert.ok(keyHelpersStart >= 0 && keyHelpersEnd > keyHelpersStart, "Options key helpers are present");
assertions += 1;
const optionSyncStore = {};
const optionLocalStore = {};
const optionsContext = vm.createContext({
  chrome: {
    storage: {
      local: storageArea(optionLocalStore),
      sync: storageArea(optionSyncStore)
    }
  },
  defaultConfig: { provider: "googletranslate" }
});
vm.runInContext(optionsSource.slice(keyHelpersStart, keyHelpersEnd), optionsContext, {
  filename: "options-key-storage.js"
});
const optionValue = (expression) => vm.runInContext(expression, optionsContext);
const optionCall = (name, ...args) => optionValue(name)(...args);
const replaceStore = (store, values) => {
  for (const key of Object.keys(store)) delete store[key];
  Object.assign(store, values);
};
const migrateOptionStorage = (useSyncKeys, provider = "openai") => new Promise((resolve) => {
  optionCall("migrateKeyStorage", useSyncKeys, provider, resolve);
});

replaceStore(optionSyncStore, {
  syncApiKeys: true,
  apiKeyByProvider: { openai: "new-sync-key" },
  apiKey: ""
});
replaceStore(optionLocalStore, {
  apiKeyByProvider: { openai: "stale-local-key" },
  apiKey: ""
});
let migratedOptions = await optionCall("migrateLegacyKeyData", optionSyncStore, optionLocalStore);
check(migratedOptions.syncData.apiKeyByProvider.openai, "new-sync-key", "Synced key wins during startup migration");
check(Object.keys(optionLocalStore.apiKeyByProvider), [], "Startup sync migration clears local key map");

replaceStore(optionSyncStore, {
  syncApiKeys: true,
  apiKeyByProvider: { openai: "" },
  apiKey: ""
});
replaceStore(optionLocalStore, {
  apiKeyByProvider: { openai: "stale-local-key" },
  apiKey: ""
});
migratedOptions = await optionCall("migrateLegacyKeyData", optionSyncStore, optionLocalStore);
check(migratedOptions.syncData.apiKeyByProvider.openai, "", "Explicitly cleared synced key remains cleared");
check(Object.keys(optionLocalStore.apiKeyByProvider), [], "Cleared sync state removes stale local copy");

replaceStore(optionSyncStore, { apiKeyByProvider: { openai: "new-sync-key" }, apiKey: "" });
replaceStore(optionLocalStore, { apiKeyByProvider: { openai: "stale-local-key" }, apiKey: "" });
await migrateOptionStorage(false);
check(optionLocalStore.apiKeyByProvider.openai, "new-sync-key", "Sync-to-local migration keeps the current synced key");
check(Object.keys(optionSyncStore.apiKeyByProvider), [], "Sync-to-local migration clears synced key map");

replaceStore(optionSyncStore, { apiKeyByProvider: { openai: "new-sync-key" }, apiKey: "" });
replaceStore(optionLocalStore, { apiKeyByProvider: { openai: "stale-local-key" }, apiKey: "" });
await migrateOptionStorage(true);
check(optionSyncStore.apiKeyByProvider.openai, "new-sync-key", "Local-to-sync migration preserves the current synced key");
check(Object.keys(optionLocalStore.apiKeyByProvider), [], "Local-to-sync migration clears local key map");

replaceStore(optionSyncStore, { apiKeyByProvider: {}, apiKey: "" });
replaceStore(optionLocalStore, { apiKeyByProvider: { openai: "current-local-key" }, apiKey: "" });
await migrateOptionStorage(true);
check(optionSyncStore.apiKeyByProvider.openai, "current-local-key", "Local-to-sync migration copies the current local key");
check(Object.keys(optionLocalStore.apiKeyByProvider), [], "Copied local key is removed from local storage");

// Cache hits are shared across popup and streaming paths, but isolated by
// credential, provider, endpoint, model and language pair.
Object.assign(syncStore, {
  provider: "openai", apiUrl: "https://api.openai.com/v1", model: "cache-model",
  sourceLang: "ja", targetLang: "en", translationCacheEnabled: true, syncApiKeys: false,
  apiKeyByProvider: {}, apiKey: ""
});
localStore.apiKeyByProvider = { openai: "cache-account-one" };
await call("clearTranslationCache");
let translationCalls = 0;
fetchMock = async () => {
  translationCalls++;
  return jsonResponse({ choices: [{ message: { content: "Translated text" }, finish_reason: "stop" }] });
};
check(await call("translateText", "source-secret"), "Translated text", "First translation succeeds");
const cachedUpdates = [];
await call("streamTranslate", "source-secret", (text, done) => cachedUpdates.push({ text, done }));
check(translationCalls, 1, "Cache shared between regular and streaming translation");
check(cachedUpdates, [{ text: "Translated text", done: true }], "Cache hit completes stream");
const cacheSerialized = JSON.stringify(localStore.translationCacheV1);
check(cacheSerialized.includes("source-secret"), false, "Cache does not store raw source");
check(cacheSerialized.includes("cache-account-one"), false, "Cache does not store credentials");
localStore.apiKeyByProvider.openai = "cache-account-two";
await call("translateText", "source-secret");
check(translationCalls, 2, "Changed account misses cache");
await call("translateText", "source-secret", { targetLang: "ru" });
check(translationCalls, 3, "Changed language misses cache");
syncStore.model = "cache-model-two";
await call("translateText", "source-secret");
check(translationCalls, 4, "Changed model misses cache");
syncStore.apiUrl = "https://different.example/v1";
await call("translateText", "source-secret");
check(translationCalls, 5, "Changed endpoint misses cache");
await call("translateText", "source-secret", { incognito: true });
check(translationCalls, 6, "Incognito ignores cache");
for (const entry of localStore.translationCacheV1) entry.createdAt -= 86400000;
await call("translateText", "source-secret");
check(translationCalls, 7, "Expired entries miss cache");
check(localStore.translationCacheV1.length, 1, "Expired entries are pruned");

let resolveTranslation;
let startedTranslation;
const started = new Promise(resolve => { startedTranslation = resolve; });
fetchMock = async () => {
  startedTranslation();
  return new Promise(resolve => { resolveTranslation = resolve; });
};
const pendingTranslation = call("translateText", "in-flight");
await started;
await call("clearTranslationCache");
resolveTranslation(jsonResponse({ choices: [{ message: { content: "Done" } }] }));
await pendingTranslation;
check(localStore.translationCacheV1.length, 0, "Clear rejects in-flight cache writes");

fetchMock = async () => sseResponse([
  'data: {"choices":[{"delta":{"content":"Partial"}}]}\n\n'
]);
await call("streamTranslate", "truncated", () => {});
check(localStore.translationCacheV1.length, 0, "Unterminated stream is not cached");
fetchMock = async () => sseResponse([
  'data: {"choices":[{"delta":{"content":"Complete"}}]}\n\n', "data: [DONE]\n\n"
]);
await call("streamTranslate", "complete", () => {});
check(localStore.translationCacheV1.length, 1, "Completed stream is cached");
syncStore.translationCacheEnabled = false;
listeners.storageChanged({ translationCacheEnabled: { oldValue: true, newValue: false } }, "sync");
await value("translationCacheQueue");
check(localStore.translationCacheV1.length, 0, "Disabling clears cache");

const cacheEpoch = value("translationCacheEpoch");
await Promise.all(Array.from({ length: 105 }, (_, i) => call("storeTranslationCache",
  { key: String(i), epoch: cacheEpoch }, "result")));
check(localStore.translationCacheV1.length, 100, "Concurrent cache writes respect entry limit");
check(localStore.translationCacheV1[0].key, "5", "Oldest entries are evicted");
await call("storeTranslationCache", { key: "large", epoch: cacheEpoch }, "я".repeat(120000));
check(new TextEncoder().encode(JSON.stringify(localStore.translationCacheV1)).length <= 256 * 1024, true, "Cache respects byte limit");
await call("storeTranslationCache", { key: "oversized", epoch: cacheEpoch }, "я".repeat(150000));
check(localStore.translationCacheV1.some(entry => entry.key === "oversized"), false, "Oversized result is not cached");
await call("clearTranslationCache");

Object.assign(syncStore, { provider: "chrome", model: "chrome-translator", apiUrl: "" });
let localRequest;
chrome.tabs.sendMessage = (tabId, message, options, callback) => {
  localRequest = { tabId, message, options };
  callback({ ok: true, text: "On-device" });
};
fetchMock = async () => { throw new Error("Chrome provider must never use a cloud API"); };
const localUpdates = [];
await call("streamTranslate", "original", (text, done) => localUpdates.push({ text, done }), { tabId: 42 });
check(localRequest.tabId, 42, "Chrome provider routes to the originating tab");
check(localRequest.message.action, "translateLocally", "Chrome provider uses the document bridge");
check(localRequest.options.frameId, 0, "Chrome provider targets the main frame");
check(localUpdates, [{ text: "On-device", done: true }], "Local provider completes stream");
const historySender = { id: "extension", tab: { id: 42 } };
const recordHistory = (text, error) => new Promise(resolve => {
  check(listeners.message({ action: "recordLocalTranslation", text, error }, historySender, resolve),
    true, "Local result storage keeps response channel open");
});
check((await recordHistory("Manual result", false)).ok, true, "Manual local result acknowledged");
check(localStore.lastTranslation, "Manual result", "Manual local translation is saved");
check(localStore.lastError, "", "Manual success clears previous errors");
check((await recordHistory("Unsupported pair", true)).ok, true, "Manual local error acknowledged");
check(localStore.lastError, "Error: Unsupported pair", "Manual local error is saved");
check(localStore.lastTranslation, "Manual result", "Errors preserve the last successful translation");
check(localStore.translationCacheV1.length, 0, "Manual local results bypass the translation cache");
check(listeners.message({ action: "recordLocalTranslation", text: "invalid", error: false }, { id: "extension" }, () => {}),
  undefined, "History reporting requires a content tab");
check(listeners.message({ action: "recordLocalTranslation", text: "invalid", error: false }, { id: "other", tab: { id: 42 } }, () => {}),
  undefined, "History reporting requires the extension sender");
let invalidHistoryResponse;
listeners.message({ action: "recordLocalTranslation", text: {}, error: false }, historySender, response => { invalidHistoryResponse = response; });
check(invalidHistoryResponse.ok, false, "Malformed history message is rejected");
check(localStore.lastTranslation, "Manual result", "Invalid history messages cannot overwrite history");
chrome.tabs.sendMessage = (_id, _message, _options, callback) => callback({ ok: false, error: "Unsupported pair" });
await assert.rejects(call("streamTranslate", "original", () => {}, { tabId: 42 }), /Unsupported pair/);
assertions++;

let attempts = 0;
const injectionsBefore = executedScripts.length;
chrome.tabs.sendMessage = (tabId, _message, options, callback) => {
  check(tabId, 43, "Fallback keeps originating tab");
  check(options.frameId, 0, "Fallback keeps main frame");
  if (++attempts === 1) {
    chrome.runtime.lastError = { message: "Could not establish connection. Receiving end does not exist." };
    callback();
    chrome.runtime.lastError = null;
  } else callback({ ok: true, text: "Recovered" });
};
check(await call("translateInTab", "original", "ja", "en", 43), "Recovered", "Missing receiver is re-injected");
check(attempts, 2, "Missing receiver is retried once");
check(executedScripts.length, injectionsBefore + 1, "Fallback injects the content script");
chrome.tabs.sendMessage = (_id, _message, _options, callback) => {
  chrome.runtime.lastError = { message: "The message port closed before a response was received." };
  callback();
  chrome.runtime.lastError = null;
};
await assert.rejects(call("translateInTab", "original", "ja", "en", 44), /message port closed/);
assertions++;
check(executedScripts.length, injectionsBefore + 1, "Closed port must not repeat translation");

console.log(`PASS: ${assertions} assertions for background.js`);
