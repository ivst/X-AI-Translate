// Shared by extension documents and isolated content scripts.
(() => {
  function normalizeLanguage(code) {
    const base = String(code || "").toLowerCase().split(/[-_]/)[0];
    return base === "iw" ? "he" : base === "in" ? "id" : base;
  }

  function normalizeTranslatorLanguage(code) {
    if (/^zh[-_](?:hant|tw|hk|mo)(?:[-_]|$)/i.test(String(code))) return "zh-Hant";
    return normalizeLanguage(code);
  }

  async function detectReliableLanguage(text) {
    if (!globalThis.chrome?.i18n?.detectLanguage || !String(text).trim()) return null;
    let timeout;
    try {
      const result = await Promise.race([
        chrome.i18n.detectLanguage(String(text).slice(0, 4096)),
        new Promise((resolve) => { timeout = setTimeout(() => resolve(null), 1500); })
      ]);
      if (!result?.isReliable || !Array.isArray(result.languages)) return null;
      const best = [...result.languages].sort((a, b) => b.percentage - a.percentage)[0];
      const language = normalizeTranslatorLanguage(best?.language);
      return best?.percentage >= 80 && /^(?:[a-z]{2,3}|zh-Hant)$/.test(language) && language !== "und"
        ? language : null;
    } catch (_) {
      return null;
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
