# AI Translate pour X et YouTube

Extension Chrome pour traduire le texte sélectionné, les posts X (Twitter) et les commentaires YouTube avec votre propre clé API (compatible OpenAI et fournisseurs natifs pris en charge).

## Fonctionnalités
- Traduction du texte sélectionné via le menu contextuel ou le raccourci `Alt+Shift+T` (sortie en streaming).
- Bouton de traduction inline sous les posts/réponses X et les commentaires YouTube (sortie en streaming).
- Bouton de traduction rapide optionnel près de la sélection.
- Bloc de traduction rapide dans le popup avec inversion de la paire de langues, dernier texte entrée/sortie sauvegardé et paire de langues sauvegardée.
- Prend en charge OpenAI, Claude, Gemini, DeepSeek, YandexGPT, OpenRouter et des endpoints personnalisés compatibles OpenAI.
- Liste de modèles OpenRouter avec filtre Free-only et cache.
- Chargement automatique des listes de modèles pour OpenAI, Claude, Gemini, OpenRouter et YandexGPT.
- Modes de sortie : toast en bas à droite ou modal centré (pas de sortie dans le popup de l’extension).
- Sélection de la langue source et cible (détection automatique disponible).
- Les clés API peuvent être stockées en local (par défaut) ou synchronisées entre appareils (optionnel, moins sécurisé).
- Résultats sauvegardés dans « Last translation / Last error » dans le popup.

## Utilisation
1. Ouvrez le popup et cliquez sur **Open settings** (page options).
2. Configurez l’URL API de base, la clé, le modèle, les langues et le mode de sortie.
3. Sur n’importe quelle page, sélectionnez du texte puis utilisez le menu contextuel ou le raccourci.
4. Sur X ou dans les commentaires YouTube, cliquez sur « Traduire le texte » sous le contenu.

## Paramètres (page Options)
- Presets de fournisseurs et endpoint personnalisé.
- Actualisation/chargement des modèles pour OpenAI, Claude, Gemini, OpenRouter (user/public, free-only) et YandexGPT.
- Mode de sortie + durée de l’overlay.
- Interrupteur du bouton de traduction rapide près de la sélection.
- Synchronisation optionnelle des clés API entre appareils avec avertissement de sécurité.

## Permissions
- `contextMenus`, `storage`, `activeTab`, `scripting`, `notifications`
- Permissions d’hôte pour les fournisseurs API configurés et les API X/Twitter

## Développement
- Load unpacked dans `chrome://extensions`
- Fichiers principaux : `background.js`, `content.js`, `popup.html`, `popup.js`, `options.html`, `options.js`

## Confidentialité
Le texte sélectionné est envoyé uniquement vers l’endpoint API que vous configurez.
Voir `PRIVACY_POLICY.md`.

## Contact
- E-mail : `xtran@msk.onl`

