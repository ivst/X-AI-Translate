// Cache is opt-in, local-only and bounded. The service worker is the sole writer.
const TRANSLATION_CACHE_KEY = "translationCacheV1";
const TRANSLATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TRANSLATION_CACHE_MAX_ENTRIES = 100;
const TRANSLATION_CACHE_MAX_BYTES = 256 * 1024;
let translationCacheEpoch = 0;
let translationCacheQueue = Promise.resolve();

function withTranslationCacheStorage(operation, fallback) {
  const task = translationCacheQueue.then(async () => {
    try {
      await storageAccessReady;
      return await operation();
    } catch (_) {
      // Caching is best-effort: storage or quota failures must not block translation.
      return fallback;
    }
  });
  translationCacheQueue = task.then(() => undefined, () => undefined);
  return task;
}

async function translationCacheContext(config, text, targetLang, sourceLang, authToken, incognito, epoch) {
  if (config.translationCacheEnabled !== true || incognito || config.provider === "chrome") return null;
  if (epoch !== translationCacheEpoch) return null;
  try {
    // Include all translation-affecting settings and the exact credential.
    // Store only a SHA-256 digest of the request identity, never the source/key.
    const input = JSON.stringify([
      1, config.provider, normalizeApiBaseUrl(config.provider, config.apiUrl),
      config.model, config.yandexFolderId, config.deepseekThinkingEnabled,
      sourceLang, targetLang, authToken, text
    ]);
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
    const key = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
    return { key, epoch };
  } catch (_) {
    return null;
  }
}

async function loadTranslationCache() {
  const data = await chrome.storage.local.get({ [TRANSLATION_CACHE_KEY]: [] });
  const entries = Array.isArray(data[TRANSLATION_CACHE_KEY]) ? data[TRANSLATION_CACHE_KEY] : [];
  const now = Date.now();
  const fresh = entries.filter((entry) => typeof entry?.key === "string" && typeof entry.text === "string"
    && entry.text.trim() && Number.isFinite(entry.createdAt) && entry.createdAt <= now
    && now - entry.createdAt < TRANSLATION_CACHE_TTL_MS);
  if (fresh.length !== entries.length) await chrome.storage.local.set({ [TRANSLATION_CACHE_KEY]: fresh });
  return fresh;
}

function lookupTranslationCache(context) {
  if (!context) return Promise.resolve(null);
  return withTranslationCacheStorage(async () => {
    if (context.epoch !== translationCacheEpoch) return null;
    const entries = await loadTranslationCache();
    if (context.epoch !== translationCacheEpoch) return null;
    return entries.find((entry) => entry.key === context.key)?.text ?? null;
  }, null);
}

function storeTranslationCache(context, text) {
  if (!context || typeof text !== "string" || !text.trim()) return Promise.resolve();
  return withTranslationCacheStorage(async () => {
    if (context.epoch !== translationCacheEpoch) return;
    const entry = { key: context.key, text, createdAt: Date.now() };
    const size = (entries) => new TextEncoder().encode(JSON.stringify(entries)).byteLength;
    if (size([entry]) > TRANSLATION_CACHE_MAX_BYTES) return;
    const entries = (await loadTranslationCache()).filter((item) => item.key !== context.key);
    if (context.epoch !== translationCacheEpoch) return;
    entries.push(entry);
    while (entries.length > TRANSLATION_CACHE_MAX_ENTRIES || size(entries) > TRANSLATION_CACHE_MAX_BYTES) entries.shift();
    await chrome.storage.local.set({ [TRANSLATION_CACHE_KEY]: entries });
  });
}

function clearTranslationCache() {
  // Prevent in-flight requests from repopulating a cache after it is cleared.
  translationCacheEpoch += 1;
  return withTranslationCacheStorage(async () => {
    await chrome.storage.local.set({ [TRANSLATION_CACHE_KEY]: [] });
    return true;
  }, false);
}
