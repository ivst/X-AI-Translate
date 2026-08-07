import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const source = await readFile(new URL("../background.js", import.meta.url), "utf8");
const optionsSource = await readFile(new URL("../options.js", import.meta.url), "utf8");
const localStore = {};
const syncStore = {};
const listeners = {};
const executedScripts = [];
let fetchMock = async () => {
  throw new Error("Unexpected fetch call");
};

function storageArea(store) {
  return {
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
  AbortController,
  chrome,
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
  call("resolveModelForProvider", { provider: "deepseek", model: "deepseek-chat" }),
  "deepseek-v4-flash",
  "DeepSeek retired alias"
);
const legacyChatBody = call(
  "buildTranslateRequestBody",
  { provider: "deepseek", model: "deepseek-chat", deepseekThinkingEnabled: true },
  "こんにちは",
  "ru",
  "ja",
  false
);
check(legacyChatBody.model, "deepseek-v4-flash", "Legacy chat uses DeepSeek V4 Flash");
check(legacyChatBody.thinking.type, "disabled", "Legacy chat preserves non-thinking semantics");
const legacyReasonerBody = call(
  "buildTranslateRequestBody",
  { provider: "deepseek", model: "deepseek-reasoner", deepseekThinkingEnabled: false },
  "こんにちは",
  "ru",
  "ja",
  false
);
check(legacyReasonerBody.model, "deepseek-v4-flash", "Legacy reasoner uses DeepSeek V4 Flash");
check(legacyReasonerBody.thinking.type, "enabled", "Legacy reasoner preserves thinking semantics");
const currentFlashBody = call(
  "buildTranslateRequestBody",
  { provider: "deepseek", model: "deepseek-v4-flash", deepseekThinkingEnabled: true },
  "こんにちは",
  "ru",
  "ja",
  false
);
check(currentFlashBody.thinking.type, "enabled", "Current DeepSeek models respect the user setting");

let migratedDeepSeek = await call("migrateLegacyDeepSeekConfig", {
  provider: "deepseek",
  model: "deepseek-reasoner",
  deepseekThinkingEnabled: false
});
check(migratedDeepSeek.model, "deepseek-v4-flash", "Legacy reasoner configuration is migrated");
check(migratedDeepSeek.deepseekThinkingEnabled, true, "Reasoner migration enables thinking");
check(syncStore.model, "deepseek-v4-flash", "DeepSeek migration is persisted");
check(syncStore.deepseekThinkingEnabled, true, "Persisted reasoner migration enables thinking");

migratedDeepSeek = await call("migrateLegacyDeepSeekConfig", {
  provider: "deepseek",
  model: "deepseek-chat",
  deepseekThinkingEnabled: true
});
check(migratedDeepSeek.deepseekThinkingEnabled, false, "Chat migration disables thinking");

const originalSyncSet = chrome.storage.sync.set;
chrome.storage.sync.set = () => Promise.reject(new Error("Sync quota exceeded"));
try {
  migratedDeepSeek = await call("migrateLegacyDeepSeekConfig", {
    provider: "deepseek",
    model: "deepseek-reasoner",
    deepseekThinkingEnabled: false
  });
  check(migratedDeepSeek.model, "deepseek-v4-flash", "Storage failure keeps the migrated model in memory");
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
check(Array.from(executedScripts.at(-1).files), ["i18n.js", "content.js"], "Dynamic injection includes localization before content script");

check(typeof listeners.message, "function", "Runtime listener registered");
check(typeof listeners.contextMenuClicked, "function", "Context menu listener registered");
check(typeof listeners.command, "function", "Keyboard command listener registered");

const deepSeekOptionsStart = optionsSource.indexOf("const DEEPSEEK_LEGACY_MODEL_CONFIG");
const deepSeekOptionsEnd = optionsSource.indexOf("const PROVIDERS");
assert.ok(
  deepSeekOptionsStart >= 0 && deepSeekOptionsEnd > deepSeekOptionsStart,
  "Options DeepSeek migration helper is present"
);
assertions += 1;
const deepSeekOptionsSyncStore = {};
const deepSeekOptionsContext = vm.createContext({
  chrome: {
    storage: {
      sync: storageArea(deepSeekOptionsSyncStore)
    }
  }
});
vm.runInContext(optionsSource.slice(deepSeekOptionsStart, deepSeekOptionsEnd), deepSeekOptionsContext, {
  filename: "options-deepseek-migration.js"
});
const migrateOptionsDeepSeek = vm.runInContext("migrateLegacyDeepSeekConfig", deepSeekOptionsContext);
const migratedOptionsReasoner = migrateOptionsDeepSeek({
  provider: "deepseek",
  model: "deepseek-reasoner",
  deepseekThinkingEnabled: false
});
check(migratedOptionsReasoner.model, "deepseek-v4-flash", "Options migrate legacy reasoner model");
check(migratedOptionsReasoner.deepseekThinkingEnabled, true, "Options preserve reasoner thinking mode");
check(deepSeekOptionsSyncStore.model, "deepseek-v4-flash", "Options persist the migrated model");

const deepSeekFilterStart = optionsSource.indexOf("function filterDeepSeekModels");
const deepSeekFilterEnd = optionsSource.indexOf("function loadDeepSeekCache");
assert.ok(
  deepSeekFilterStart >= 0 && deepSeekFilterEnd > deepSeekFilterStart,
  "Options DeepSeek model filter is present"
);
assertions += 1;
const deepSeekFilterContext = vm.createContext({});
vm.runInContext(optionsSource.slice(deepSeekFilterStart, deepSeekFilterEnd), deepSeekFilterContext, {
  filename: "options-deepseek-filter.js"
});
const filterDeepSeekModels = vm.runInContext("filterDeepSeekModels", deepSeekFilterContext);
const filteredDeepSeekModels = Array.from(filterDeepSeekModels([
  { id: "deepseek-chat" },
  { id: "deepseek-reasoner" },
  { id: "deepseek-v4-flash" },
  { id: "deepseek-v4-pro" }
]));
check(
  filteredDeepSeekModels,
  ["deepseek-v4-flash", "deepseek-v4-pro"],
  "Options hide retired DeepSeek aliases"
);

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
let migratedOptions = optionCall("migrateLegacyKeyData", optionSyncStore, optionLocalStore);
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
migratedOptions = optionCall("migrateLegacyKeyData", optionSyncStore, optionLocalStore);
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

console.log(`PASS: ${assertions} assertions for background.js`);
