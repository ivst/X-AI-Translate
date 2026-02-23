# AI Translate für X und YouTube

Chrome-Erweiterung zum Übersetzen von markiertem Text, X (Twitter)-Posts und YouTube-Kommentaren mit Ihrem eigenen API-Schlüssel (OpenAI-kompatibel und unterstützte native Anbieter).

[![AI Translate in Chrome Web Store](ai-adv-large.png)](https://chromewebstore.google.com/detail/ai-translate-for-x-and-yo/ccgnhaicdhdhhangmfkddcippajhbbji)

Chrome Web Store: https://chromewebstore.google.com/detail/ai-translate-for-x-and-yo/ccgnhaicdhdhhangmfkddcippajhbbji

## Funktionen
- Übersetzen von markiertem Text über Kontextmenü oder Hotkey `Alt+Shift+T` (Streaming-Ausgabe).
- Inline-Übersetzungsbutton unter X-Posts/Antworten und YouTube-Kommentaren (Streaming-Ausgabe).
- Optionaler Schnellübersetzungsbutton neben der Auswahl.
- Quick-Translate-Block im Popup mit Sprachpaar-Wechsel, gespeichertem letztem Ein-/Ausgabewert und gespeichertem Sprachpaar.
- Unterstützt OpenAI, Claude, Gemini, DeepSeek, YandexGPT, OpenRouter und benutzerdefinierte OpenAI-kompatible Endpoints.
- OpenRouter-Modellliste mit Free-only-Filter und Cache.
- Automatisches Laden der Modelllisten für OpenAI, Claude, Gemini, OpenRouter und YandexGPT.
- Ausgabemodi: Toast unten rechts oder zentriertes Modal (keine Ausgabe im Erweiterungs-Popup).
- Auswahl von Ziel- und Quellsprache (Autodetect verfügbar).
- API-Schlüssel können lokal (Standard) gespeichert oder zwischen Geräten synchronisiert werden (optional, weniger sicher).
- Ergebnisse werden als „Last translation / Last error“ im Popup gespeichert.

## Verwendung
1. Popup öffnen und auf **Settings** klicken (Options-Seite).
2. API Base URL, Schlüssel, Modell, Sprachen und Ausgabemodus konfigurieren.
3. Auf beliebiger Seite Text markieren und Kontextmenü oder Hotkey nutzen.
4. Bei X und YouTube-Kommentaren klicken Sie unter unterstützten Inhalten auf „Text übersetzen“, um die Inline-Übersetzung zu sehen. Diese Buttons können in Settings deaktiviert werden.

## Einstellungen (Options-Seite)
- Provider-Presets und benutzerdefinierter Endpoint.
- Modellaktualisierung/-laden für OpenAI, Claude, Gemini, OpenRouter (user/public, free-only) und YandexGPT.
- Ausgabemodus + Overlay-Dauer.
- Separate Schalter zum Ein- und Ausblenden der Übersetzungsbuttons für X und YouTube.
- Optionale API-Schlüssel-Synchronisierung zwischen Geräten mit Sicherheitshinweis.

## Berechtigungen
- Das Content-Script läuft auf `<all_urls>`, um Textauswahl zu erkennen und die Inline-Übersetzungsoberfläche an unterstützten Stellen anzuzeigen.
- `contextMenus`, `storage`, `activeTab`, `scripting`, `notifications`
- Host-Berechtigungen für konfigurierte API-Provider und X/Twitter-APIs

## Entwicklung
- Load unpacked in `chrome://extensions`
- Einstiegspunkte: `background.js`, `content.js`, `popup.html`, `popup.js`, `options.html`, `options.js`

## Datenschutz
Markierter Text wird nur an den API-Endpoint gesendet, den Sie konfigurieren.
Siehe `PRIVACY_POLICY.md`.

## Kontakt
- E-Mail: `xtran@msk.onl`

