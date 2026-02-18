# AI Translate για X και YouTube

Επέκταση Chrome για μετάφραση επιλεγμένου κειμένου, αναρτήσεων X (Twitter) και σχολίων YouTube με το δικό σας API key (OpenAI-compatible και υποστηριζόμενοι native πάροχοι).

## Δυνατότητες
- Μετάφραση επιλεγμένου κειμένου μέσω context menu ή hotkey `Alt+Shift+T` (streaming output).
- Inline κουμπί μετάφρασης κάτω από αναρτήσεις/απαντήσεις X και σχόλια YouTube (streaming output).
- Προαιρετικό κουμπί γρήγορης μετάφρασης δίπλα στην επιλογή.
- Quick translation block στο popup με αλλαγή language pair, αποθήκευση τελευταίου input/output και αποθηκευμένο language pair.
- Υποστηρίζει OpenAI, Claude, Gemini, DeepSeek, YandexGPT, OpenRouter και custom OpenAI-compatible endpoints.
- Λίστα μοντέλων OpenRouter με φίλτρο Free-only και cache.
- Αυτόματη φόρτωση λιστών μοντέλων για OpenAI, Claude, Gemini, OpenRouter και YandexGPT.
- Modes εξόδου: toast κάτω δεξιά ή centered modal (χωρίς output στο extension popup).
- Επιλογή target + source γλώσσας (autodetect διαθέσιμο).
- Τα API keys αποθηκεύονται τοπικά (default) ή συγχρονίζονται μεταξύ συσκευών (optional, less secure).
- Τα αποτελέσματα αποθηκεύονται ως «Last translation / Last error» στο popup.

## Χρήση
1. Ανοίξτε το popup και πατήστε **Settings** (options page).
2. Ρυθμίστε API base URL, key, model, languages και output mode.
3. Σε οποιαδήποτε σελίδα, επιλέξτε κείμενο και χρησιμοποιήστε context menu ή hotkey.
4. Σε X και σχόλια YouTube, πατήστε «Μετάφραση κειμένου» κάτω από υποστηριζόμενο περιεχόμενο για να δείτε inline μετάφραση. Μπορείτε να απενεργοποιήσετε αυτά τα κουμπιά από τα Settings.

## Ρυθμίσεις (Options page)
- Presets παρόχων και custom endpoint.
- Refresh/loading μοντέλων για OpenAI, Claude, Gemini, OpenRouter (user/public, free-only) και YandexGPT.
- Output mode + διάρκεια overlay.
- Toggle για quick selection button.
- Προαιρετικός συγχρονισμός API keys μεταξύ συσκευών με προειδοποίηση ασφαλείας.
- Ξεχωριστά toggles για εμφάνιση ή απόκρυψη κουμπιών μετάφρασης σε X και YouTube.

## Άδειες
- Το content script εκτελείται σε `<all_urls>` για εντοπισμό επιλογής κειμένου και εμφάνιση inline διεπαφής μετάφρασης όπου υποστηρίζεται.
- `contextMenus`, `storage`, `activeTab`, `scripting`, `notifications`
- Host permissions για ρυθμισμένους API providers και X/Twitter APIs

## Ανάπτυξη
- Load unpacked στο `chrome://extensions`
- Entry files: `background.js`, `content.js`, `popup.html`, `popup.js`, `options.html`, `options.js`

## Απόρρητο
Το επιλεγμένο κείμενο στέλνεται μόνο στο API endpoint που ρυθμίζετε.
Δείτε `PRIVACY_POLICY.md`.

## Επικοινωνία
- Email: `xtran@msk.onl`

