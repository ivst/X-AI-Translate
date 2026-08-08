Privacy Policy AI Translate for X and YouTube (X-AI-Translate)

Summary
- The extension processes text you explicitly choose to translate:
  - selected text on web pages,
  - inline text on X (Twitter) and YouTube comments when you press the translate button or enable automatic translation for visible content,
  - text entered by you in the popup "Quick Translate" fields.
- In optional subscription mode, text is sent to the local bridge at `127.0.0.1`, which forwards it through the authenticated provider CLI to OpenAI or Claude. Provider credentials remain managed by the official CLI tools.
- In API-key mode, text is sent only to the translation provider endpoint you configure (including Google Translate's free web endpoint, DeepL API Free, OpenAI-compatible/custom, or other supported native providers).
- The extension stores settings in Chrome storage to keep your configuration between sessions.

Data We Process
- Text you submit for translation:
  - selected text,
  - X/YouTube inline text you request to translate manually or through the optional automatic translation of visible content,
  - popup Quick Translate input text.
- Configuration data you provide:
  - provider, API base URL, model, source/target language, UI language, output mode and related options.
- Optional operational data:
  - last translation / last error (for popup display),
  - cached model lists for supported providers.

How We Use Data
- To send translation requests to the provider you selected.
- In subscription mode, to pass translation requests through the local bridge and the authenticated provider CLI.
- When enabled, to translate visible X posts and YouTube comments as they appear on the page.
- To show translation results in-page and in popup.
- To persist your settings and improve usability (last result/error, model caches).

API Keys and Storage
- By default, API keys are stored locally in `chrome.storage.local`.
- If you enable "Sync API keys across devices", API keys are stored in `chrome.storage.sync` and synchronized by your Chrome account.
- Syncing keys across devices is optional and less secure than local-only storage.

Data Sharing
- In API-key mode, translation text is sent only to the API endpoint/provider you configured.
- In optional subscription mode, translation text is sent to the local bridge and then to the selected OpenAI or Claude provider through its CLI session.
- We do not sell personal data and do not share data with unrelated third parties.

Remote Code
- The extension does not download or execute remote JavaScript/WASM code.
- Network access is used for HTTPS API requests, the explicitly configured local bridge, and receiving text responses.

Retention
- Settings remain until you change or remove them.
- Last translation / last error and model caches remain until overwritten or cleared.

Contact
- Support email: xtran@msk.onl
