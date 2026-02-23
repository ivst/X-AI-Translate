# Traductor AI para X y YouTube

[![AI Translate in Chrome Web Store](ai-adv-large.png)](https://chromewebstore.google.com/detail/ai-translate-for-x-and-yo/ccgnhaicdhdhhangmfkddcippajhbbji)

Chrome Web Store: https://chromewebstore.google.com/detail/ai-translate-for-x-and-yo/ccgnhaicdhdhhangmfkddcippajhbbji

Extensión de Chrome para traducir texto seleccionado, publicaciones X (Twitter) y comentarios de YouTube utilizando su propia clave API (proveedores nativos compatibles y compatibles con OpenAI).

## Características
- Traduce el texto seleccionado a través del menú contextual o la tecla de acceso rápido `Alt+Shift+T` (salida de transmisión).
- Botón de traducción en línea debajo de X publicaciones/respuestas y comentarios de YouTube (salida de transmisión).
- Botón opcional de traducción rápida cerca de la selección de texto.
- Bloque emergente de traducción rápida con cambio de par de idiomas, última entrada/salida guardada y par de idiomas guardado.
- Admite OpenAI, Claude, Gemini, DeepSeek, YandexGPT, OpenRouter y puntos finales personalizados compatibles con OpenAI.
- Lista de modelos de OpenRouter con filtro y caché gratuitos.
- Listas de modelos de carga automática para OpenAI, Claude, Gemini, OpenRouter y YandexGPT.
- Modos de salida: brindis en la parte inferior derecha o modal centrado (sin salida emergente de extensión).
- Selección de idioma de destino + origen (detección automática disponible).
- Las claves API se pueden almacenar localmente (predeterminado) o sincronizarse entre dispositivos (opcional, menos seguro).
- Resultados guardados en “Última traducción/Último error” en la ventana emergente.

## Uso
1. Abra la ventana emergente → haga clic en **Settings** (página de opciones).
2. Configure la URL base de la API, la clave, el modelo, los idiomas y el modo de salida.
3. En cualquier página, seleccione texto y use el menú contextual o la tecla de acceso rápido.
4. En X y en los comentarios de YouTube, haz clic en «Traducir texto» bajo contenido compatible para ver la traducción en línea. Puedes desactivar estos botones en Settings.

## Configuración (página de opciones)
- Ajustes preestablecidos del proveedor y punto final personalizado.
- Actualización/carga de modelos para OpenAI, Claude, Gemini, OpenRouter (usuario/público, solo gratuito) y YandexGPT.
- Modo de salida + duración de superposición.
- Alternancia del botón de selección rápida.
- Sincronización de clave API opcional entre dispositivos con advertencia de seguridad.
- Interruptores separados para mostrar u ocultar los botones de traducción en X y YouTube.

## Permisos
- El content script se ejecuta en `<all_urls>` para detectar selección de texto y mostrar la interfaz de traducción en línea donde sea compatible.
- `contextMenus`, `storage`, `activeTab`, `scripting`, `notifications`
- Permisos de host para proveedores de API configurados y API de X/Twitter

## Desarrollo
- Cargar descomprimido en `chrome://extensions`
- Archivos de entrada: `background.js`, `content.js`, `popup.html`, `popup.js`, `options.html`, `options.js`

## Privacidad
El texto seleccionado se envía solo al punto final de API que configure.
Ver `PRIVACY_POLICY.md`.

## Contacto
- Correo electrónico: `xtran@msk.onl`


