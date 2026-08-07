# AI Translate for X and YouTube (BYOK)

[![AI Translate in Chrome Web Store](ai-adv-large.png)](https://chromewebstore.google.com/detail/ai-translate-for-x-and-yo/ccgnhaicdhdhhangmfkddcippajhbbji)

Chrome Web Store: https://chromewebstore.google.com/detail/ai-translate-for-x-and-yo/ccgnhaicdhdhhangmfkddcippajhbbji

Chrome extension for translating selected text, X (Twitter) posts, and YouTube comments using your own API key (OpenAI-compatible and supported native providers).

## Translations
- [Arabic](README.ar.md)
- [Chinese](README.zh.md)
- [French](README.fr.md)
- [German](README.de.md)
- [Greek](README.el.md)
- [Hebrew](README.he.md)
- [Italian](README.it.md)
- [Japanese](README.ja.md)
- [Korean](README.ko.md)
- [Portuguese](README.pt.md)
- [Russian](README.ru.md)
- [Spanish](README.es.md)
- [Thai](README.th.md)
- [Turkish](README.tr.md)
- [Ukrainian](README.uk.md)

## Features
- Translate selected text via context menu or hotkey `Alt+Shift+T` (streaming output).
- Inline translate button under X posts/replies and YouTube comments (streaming output).
- Optional quick-translate button near text selection.
- Popup quick translation block with language pair switch, saved last input/output, and saved language pair.
- Supports OpenAI, Claude, Gemini, DeepSeek, YandexGPT, OpenRouter, Google Translate, DeepL API Free, and custom OpenAI-compatible endpoints.
- Google Translate works without an API key through its free web endpoint; DeepL uses the official DeepL API Free plan.
- OpenRouter model list with Free-only filter and cache.
- Auto-loading model lists for OpenAI, Claude, Gemini, DeepSeek, OpenRouter, and YandexGPT.
- Output modes: bottom-right toast or centered modal (no extension-popup output).
- Target + source language selection (autodetect available).
- API keys can be stored locally (default) or synchronized across devices (optional, less secure).
- Results saved to “Last translation / Last error” in popup.

## Usage
1. Open the popup → click **Settings** (options page).
2. Choose a provider. Google Translate needs no key; DeepL API Free needs a DeepL API key. OpenAI and Claude also offer an optional local subscription mode through the bridge described in `bridge/README.md`.
3. On any page, select text and use the context menu or hotkey.
4. On X and YouTube comments, click "Translate text" under supported content blocks to see inline translation. You can disable these buttons in Settings.

## Settings (Options page)
- Provider presets and custom endpoint.
- Direct translation providers: Google Translate (free web endpoint, no key) and DeepL API Free (free quota, API key required).
- Model refresh/loading for OpenAI, Claude, Gemini, DeepSeek, OpenRouter (user/public, free-only), and YandexGPT.
- DeepSeek thinking mode toggle (disabled by default to keep translations fast).
- Output mode + overlay duration.
- Quick selection button toggle.
- Optional API key sync across devices with security warning.
- Separate toggles to show or hide translate buttons on X and YouTube.
- Optional automatic translation of visible X posts and YouTube comments (disabled by default).
- Optional subscription mode for OpenAI (Codex) and Claude (Claude Code); API-key mode remains the default.

## Subscription mode

Subscription mode is opt-in and requires the local bridge plus the authenticated provider CLI. Follow [`bridge/README.md`](bridge/README.md) before selecting Subscription in Settings. Gemini and all other providers continue to use their existing API-key flow.

## Permissions
- The content script runs on `<all_urls>` to detect text selections and render inline translation UI where supported.
- `contextMenus`, `storage`, `activeTab`, `scripting`, `notifications`
- Host permissions for configured API providers and X/Twitter APIs

## Development
- Load unpacked in `chrome://extensions`
- Entry files: `background.js`, `content.js`, `popup.html`, `popup.js`, `options.html`, `options.js`

## Privacy
Selected text is sent only to the API endpoint you configure.
See `PRIVACY_POLICY.md`.

## Contact
- Email: `xtran@msk.onl`


