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
- Supports OpenAI, Claude, Gemini, DeepSeek, YandexGPT, OpenRouter, Google Translate, DeepL API Free, Chrome Built-in Translator (experimental, on-device), and custom OpenAI-compatible endpoints.
- Google Translate works without an API key through its free web endpoint; DeepL uses the official DeepL API Free plan.
- OpenRouter model list with Free-only filter and cache.
- Auto-loading model lists for OpenAI, Claude, Gemini, DeepSeek, OpenRouter, and YandexGPT.
- Output modes: bottom-right toast or centered modal (no extension-popup output).
- Target + source language selection (autodetect available).
- Local language detection for X and YouTube distinguishes languages that share an alphabet, using script heuristics when detection is uncertain.
- Optional local translation cache: reuse completed cloud translations for 24 hours; bounded to 100 entries and 256 KiB. Disabled by default; clear it in Settings.
- API keys can be stored locally (default) or synchronized across devices (optional, less secure).
- API keys stay in trusted extension contexts; content scripts receive only the settings they need.
- Results saved to “Last translation / Last error” in popup.

## Usage
1. Open the popup → click **Settings** (options page).
2. Choose a provider. Google Translate and Chrome Built-in Translator need no key; DeepL API Free needs a DeepL API key. Configure the remaining fields, languages, and output mode.
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

### Chrome Built-in Translator (experimental)
Requires a supported desktop Chrome (138+) and a supported language pair. Translation runs in the browser document via the [Translator API](https://developer.chrome.com/docs/ai/translator-api), without an API key or cloud fallback. Other providers remain available on older supported versions of Chrome.

Chrome may require a direct user gesture on the current site to download a language pair. Click the inline/selection translate button (enable the selection shortcut in Settings if needed), or use Quick Translate in the popup. The popup shows download progress. Automatic translation, context menu and hotkeys may need a previously initialized pair on that site. If language detection is uncertain, select a source language explicitly. Unsupported devices, sites, and pairs report an error rather than sending text to another provider.

## Permissions
- The content script runs on `<all_urls>` to detect text selections and render inline translation UI where supported.
- `contextMenus`, `storage`, `activeTab`, `scripting`, `notifications`
- Host permissions for configured API providers and X/Twitter APIs

## Development
- Load unpacked in `chrome://extensions`
- Entry files: `background.js`, `content.js`, `popup.html`, `popup.js`, `options.html`, `options.js`

## Privacy
For cloud providers, selected text and X posts or YouTube comments you request to translate are sent only to the configured provider. When enabled, visible X posts and YouTube comments are also sent to that endpoint for automatic translation. The Chrome Built-in Translator processes text on-device. The optional cache stores translated results and hashed request identities locally, not separate source text or raw keys.
See `PRIVACY_POLICY.md`.

## Contact
- Email: `xtran@msk.onl`

## License
This project is licensed under the MIT License. See [LICENSE](LICENSE).

