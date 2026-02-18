# AI Translate for X and YouTube

<p align="center">
  <img src="icon.png" alt="AI Translate Logo" width="128" height="128" />
</p>

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
- Supports OpenAI, Claude, Gemini, DeepSeek, YandexGPT, OpenRouter, and custom OpenAI-compatible endpoints.
- OpenRouter model list with Free-only filter and cache.
- Auto-loading model lists for OpenAI, Claude, Gemini, OpenRouter, and YandexGPT.
- Output modes: bottom-right toast or centered modal (no extension-popup output).
- Target + source language selection (autodetect available).
- API keys can be stored locally (default) or synchronized across devices (optional, less secure).
- Results saved to “Last translation / Last error” in popup.

## Usage
1. Open the popup → click **Settings** (options page).
2. Configure API base URL, key, model, languages, and output mode.
3. On any page, select text and use the context menu or hotkey.
4. On X and YouTube comments, click "Translate text" under supported content blocks to see inline translation. You can disable these buttons in Settings.

## Settings (Options page)
- Provider presets and custom endpoint.
- Model refresh/loading for OpenAI, Claude, Gemini, OpenRouter (user/public, free-only), and YandexGPT.
- Output mode + overlay duration.
- Quick selection button toggle.
- Optional API key sync across devices with security warning.
- Separate toggles to show or hide translate buttons on X and YouTube.

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
