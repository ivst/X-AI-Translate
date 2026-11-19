// Shared by extension documents and isolated content scripts.
(() => {
  const LANGUAGE_DETECTION_CACHE_LIMIT = 128;
  // Document-local LRU: entries contain only the sampled text and detector
  // result. Share pending calls too, and never persist them to storage.
  const detectionCache = new Map();

  function normalizeLanguage(code) {
    const base = String(code || "").toLowerCase().split(/[-_]/)[0];
    return base === "iw" ? "he" : base === "in" ? "id" : base;
  }

  function normalizeTranslatorLanguage(code) {
    if (/^zh[-_](?:hant|tw|hk|mo)(?:[-_]|$)/i.test(String(code))) return "zh-Hant";
    return normalizeLanguage(code);
  }

  // CLD can be unreliable on short strings such as kana-only Japanese.
  // Kana and Hangul provide distinctive evidence, unlike Latin, Cyrillic
  // or Han-only text. Ignore punctuation/digits and require dominance.
  function detectDistinctiveScript(sample) {
    let letters = 0;
    let kana = 0;
    let han = 0;
    let hangul = 0;
    for (const ch of sample) {
      if (!/\p{L}/u.test(ch)) continue;
      letters++;
      if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(ch)) kana++;
      else if (/\p{Script=Han}/u.test(ch)) han++;
      else if (/\p{Script=Hangul}/u.test(ch)) hangul++;
    }
    if (!letters) return null;
    if (kana > 0 && (kana + han) / letters >= 0.8) return "ja";
    if (hangul / letters >= 0.8) return "ko";
    return null;
  }

  async function detectReliableLanguage(text) {
    if (!String(text).trim()) return null;
    // Normalize for detection only (e.g. half-width ｶﾀｶﾅ). The translation
    // receives the original text, so formatting and compatibility forms stay intact.
    // Social posts often include link destinations (including emoji assets).
    // They are not linguistic evidence: omit them from CLD/script analysis,
    // retaining surrounding visible link labels and the original request.
    const sample = String(text).normalize("NFKC")
      .replace(/https?:\/\/[^\s<>()\[\]{}]+/giu, " ")
      .trim()
      .slice(0, 4096);
    if (!/\p{L}/u.test(sample)) return null;
    if (!globalThis.chrome?.i18n?.detectLanguage) return detectDistinctiveScript(sample);
    const cached = detectionCache.get(sample);
    if (cached) {
      detectionCache.delete(sample);
      detectionCache.set(sample, cached);
      return cached.promise;
    }
    const entry = {};
    entry.promise = detectLanguageSample(sample).then(({ language, cacheable }) => {
      // Don't turn transient timeout/API failures into cached uncertainty.
      if (!cacheable && detectionCache.get(sample) === entry) detectionCache.delete(sample);
      return language;
    });
    detectionCache.set(sample, entry);
    while (detectionCache.size > LANGUAGE_DETECTION_CACHE_LIMIT) {
      detectionCache.delete(detectionCache.keys().next().value);
    }
    return entry.promise;
  }

  async function detectLanguageSample(sample) {
    const fallback = () => detectDistinctiveScript(sample);
    let timeout;
    try {
      const result = await Promise.race([
        chrome.i18n.detectLanguage(sample),
        new Promise((resolve) => { timeout = setTimeout(() => resolve(null), 1500); })
      ]);
      if (!result || !Array.isArray(result.languages)) return { language: fallback(), cacheable: false };
      if (!result.isReliable) return { language: fallback(), cacheable: true };
      const best = [...result.languages].sort((a, b) => b.percentage - a.percentage)[0];
      const language = normalizeTranslatorLanguage(best?.language);
      return {
        language: best?.percentage >= 80 && /^(?:[a-z]{2,3}|zh-Hant)$/.test(language) && language !== "und"
          ? language : fallback(),
        cacheable: true
      };
    } catch (_) {
      return { language: fallback(), cacheable: false };
    } finally {
      clearTimeout(timeout);
    }
  }

  // Translator is a document API (not exposed in MV3 service workers).
  async function translateLocally(text, sourceLang, targetLang, onProgress) {
    const api = globalThis.Translator;
    if (!api?.availability || !api?.create) {
      throw new Error("Chrome Built-in Translator is unavailable in this document. Use a supported desktop Chrome (138+) or choose another provider.");
    }
    const source = sourceLang === "auto" || !sourceLang
      ? await detectReliableLanguage(text) : normalizeTranslatorLanguage(sourceLang);
    const target = normalizeTranslatorLanguage(targetLang);
    if (!source) throw new Error("Could not reliably detect the source language. Select it explicitly.");
    if (source === target) return text;
    const pair = { sourceLanguage: source, targetLanguage: target };
    const availability = await api.availability(pair);
    if (availability === "unavailable") {
      throw new Error("Chrome Built-in Translator does not support this language pair or device. Choose another provider.");
    }
    if (availability !== "available" && !globalThis.navigator?.userActivation?.isActive) {
      throw new Error("Chrome needs a user gesture for this language pair. Click the translate button on this page or use Quick Translate in the popup.");
    }
    let translator;
    try {
      translator = await api.create({
        ...pair,
        ...(onProgress ? { monitor(monitor) {
          monitor.addEventListener("downloadprogress", (event) => onProgress(event.loaded));
        } } : {})
      });
      const result = await translator.translate(text);
      if (typeof result !== "string" || !result.trim()) throw new Error("Chrome Translator returned an empty response.");
      return result;
    } finally {
      translator?.destroy?.();
    }
  }

  globalThis.AITranslateLanguage = { normalizeLanguage, detectReliableLanguage, translateLocally };
})();
