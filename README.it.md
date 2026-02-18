# AI Translate per X e YouTube

<p align="center">
  <img src="icon.png" alt="AI Translate Logo" width="128" height="128" />
</p>

Estensione di Chrome per tradurre testo selezionato, post X (Twitter) e commenti YouTube utilizzando la tua chiave API (provider nativi supportati e compatibili con OpenAI).

## Caratteristiche
- Traduci il testo selezionato tramite il menu contestuale o il tasto di scelta rapida `Alt+Shift+T` (output in streaming).
- Pulsante di traduzione in linea sotto X post/risposte e commenti di YouTube (output in streaming).
- Pulsante di traduzione rapida opzionale vicino alla selezione del testo.
- Blocco di traduzione rapida popup con cambio di coppia linguistica, ultimo input/output salvato e coppia linguistica salvata.
- Supporta OpenAI, Claude, Gemini, DeepSeek, YandexGPT, OpenRouter ed endpoint personalizzati compatibili con OpenAI.
- Elenco dei modelli OpenRouter con filtro e cache solo gratuiti.
- Elenchi di modelli a caricamento automatico per OpenAI, Claude, Gemini, OpenRouter e YandexGPT.
- Modalità di output: toast in basso a destra o modale centrato (nessun output popup di estensione).
- Selezione della lingua di destinazione + di origine (rilevamento automatico disponibile).
- Le chiavi API possono essere archiviate localmente (impostazione predefinita) o sincronizzate su tutti i dispositivi (facoltativo, meno sicuro).
- Risultati salvati in "Ultima traduzione/Ultimo errore" nel popup.

## Utilizzo
1. Apri il popup → fai clic su **Settings** (pagina delle opzioni).
2. Configura l'URL di base dell'API, la chiave, il modello, le lingue e la modalità di output.
3. In qualsiasi pagina, seleziona il testo e utilizza il menu contestuale o il tasto di scelta rapida.
4. Su X e nei commenti YouTube, fai clic su «Traduci testo» sotto contenuti supportati per vedere la traduzione inline. Puoi disattivare questi pulsanti in Settings.

## Impostazioni (pagina Opzioni)
- Preimpostazioni del provider ed endpoint personalizzato.
- Aggiornamento/caricamento del modello per OpenAI, Claude, Gemini, OpenRouter (utente/pubblico, solo gratuito) e YandexGPT.
- Modalità di output + durata della sovrapposizione.
- Attivazione/disattivazione del pulsante di selezione rapida.
- Sincronizzazione opzionale della chiave API tra dispositivi con avviso di sicurezza.
- Interruttori separati per mostrare o nascondere i pulsanti di traduzione su X e YouTube.

## Autorizzazioni
- Il content script viene eseguito su `<all_urls>` per rilevare la selezione del testo e mostrare l’interfaccia di traduzione inline dove supportata.
- `contextMenus`, `storage`, `activeTab`, `scripting`, `notifications`
- Autorizzazioni host per provider API configurati e API X/Twitter

## Sviluppo
- Carica decompresso in `chrome://extensions`
- File di ingresso: `background.js`, `content.js`, `popup.html`, `popup.js`, `options.html`, `options.js`

## Privacy
Il testo selezionato viene inviato solo all'endpoint API configurato.
Vedi `PRIVACY_POLICY.md`.

## Contatto
- E-mail: `xtran@msk.onl`
