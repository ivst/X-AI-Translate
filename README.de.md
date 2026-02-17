# AI Translate für X und YouTube

Chrome-Erweiterung zum Übersetzen von markiertem Text, X (Twitter)-Posts und YouTube-Kommentaren mit Ihrem eigenen API-Schlüssel (OpenAI-kompatibel und unterstützte native Anbieter).

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
1. Popup öffnen und auf **Open settings** klicken (Options-Seite).
2. API Base URL, Schlüssel, Modell, Sprachen und Ausgabemodus konfigurieren.
3. Auf beliebiger Seite Text markieren und Kontextmenü oder Hotkey nutzen.
4. Bei X oder YouTube-Kommentaren auf „Text übersetzen“ unter dem Inhalt klicken.

## Einstellungen (Options-Seite)
- Provider-Presets und benutzerdefinierter Endpoint.
- Modellaktualisierung/-laden für OpenAI, Claude, Gemini, OpenRouter (user/public, free-only) und YandexGPT.
- Ausgabemodus + Overlay-Dauer.
- Schalter für Schnellübersetzungsbutton neben der Auswahl.
- Optionale API-Schlüssel-Synchronisierung zwischen Geräten mit Sicherheitshinweis.

## Berechtigungen
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

