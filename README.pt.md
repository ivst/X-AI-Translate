# AI Translate para X e YouTube

<p align="center">
  <img src="icon.png" alt="AI Translate Logo" width="128" height="128" />
</p>

Extensão do Chrome para traduzir textos selecionados, postagens X (Twitter) e comentários do YouTube usando sua própria chave de API (provedores nativos compatíveis e compatíveis com OpenAI).

## Características
- Traduza o texto selecionado através do menu de contexto ou da tecla de atalho `Alt+Shift+T` (saída de streaming).
- Botão de tradução embutido em X postagens/respostas e comentários do YouTube (saída de streaming).
- Botão opcional de tradução rápida próximo à seleção de texto.
- Bloco pop-up de tradução rápida com troca de par de idiomas, última entrada/saída salva e par de idiomas salvo.
- Suporta OpenAI, Claude, Gemini, DeepSeek, YandexGPT, OpenRouter e endpoints personalizados compatíveis com OpenAI.
- Lista de modelos OpenRouter com filtro e cache somente gratuitos.
- Listas de modelos de carregamento automático para OpenAI, Claude, Gemini, OpenRouter e YandexGPT.
- Modos de saída: brinde no canto inferior direito ou modal centralizado (sem saída pop-up de extensão).
- Seleção de idioma de destino + origem (detecção automática disponível).
- As chaves de API podem ser armazenadas localmente (padrão) ou sincronizadas entre dispositivos (opcional, menos seguro).
- Resultados salvos em “Última tradução / Último erro” no pop-up.

## Uso
1. Abra o pop-up → clique em **Settings** (página de opções).
2. Configure o URL base da API, chave, modelo, idiomas e modo de saída.
3. Em qualquer página, selecione o texto e use o menu de contexto ou tecla de atalho.
4. No X e nos comentários do YouTube, clique em «Traduzir texto» sob conteúdo compatível para ver a tradução inline. Você pode desativar esses botões em Settings.

## Configurações (página Opções)
- Predefinições de provedor e endpoint personalizado.
- Atualização/carregamento de modelo para OpenAI, Claude, Gemini, OpenRouter (usuário/público, somente gratuito) e YandexGPT.
- Modo de saída + duração da sobreposição.
- Alternância do botão de seleção rápida.
- Sincronização opcional de chave de API entre dispositivos com aviso de segurança.
- Alternadores separados para mostrar ou ocultar os botões de tradução no X e no YouTube.

## Permissões
- O content script roda em `<all_urls>` para detectar seleção de texto e renderizar a interface de tradução inline onde houver suporte.
- `contextMenus`, `storage`, `activeTab`, `scripting`, `notifications`
- Permissões de host para provedores de API configurados e APIs X/Twitter

## Desenvolvimento
- Carregue descompactado em `chrome://extensions`
- Arquivos de entrada: `background.js`, `content.js`, `popup.html`, `popup.js`, `options.html`, `options.js`

## Privacidade
O texto selecionado é enviado somente para o endpoint da API que você configura.
Consulte `PRIVACY_POLICY.md`.

## Contato
- E-mail: `xtran@msk.onl`
