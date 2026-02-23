# X と YouTube 向け AI Translate

選択したテキスト、X（Twitter）の投稿、YouTube コメントを、あなた自身の API キー（OpenAI 互換および対応ネイティブプロバイダー）で翻訳する Chrome 拡張機能です。

[![AI Translate in Chrome Web Store](ai-adv-large.png)](https://chromewebstore.google.com/detail/ai-translate-for-x-and-yo/ccgnhaicdhdhhangmfkddcippajhbbji)

Chrome Web Store: https://chromewebstore.google.com/detail/ai-translate-for-x-and-yo/ccgnhaicdhdhhangmfkddcippajhbbji

## 機能
- コンテキストメニューまたはホットキー `Alt+Shift+T` で選択テキストを翻訳（ストリーミング出力）。
- X の投稿/返信と YouTube コメントの下にインライン翻訳ボタンを表示（ストリーミング出力）。
- 選択付近に表示するクイック翻訳ボタン（任意）。
- popup にクイック翻訳ブロックを追加（言語ペア切替、最後の入力/出力保存、言語ペア保存）。
- OpenAI、Claude、Gemini、DeepSeek、YandexGPT、OpenRouter、カスタム OpenAI 互換 endpoint をサポート。
- OpenRouter モデル一覧（Free-only フィルタ + キャッシュ）。
- OpenAI、Claude、Gemini、OpenRouter、YandexGPT のモデル一覧を自動読み込み。
- 出力モード: 右下トーストまたは中央モーダル（拡張 popup への出力なし）。
- 翻訳先/翻訳元言語を選択可能（自動判定あり）。
- API キーはローカル保存（既定）またはデバイス間同期（任意、セキュリティは低下）。
- 結果を popup に「Last translation / Last error」として保存。

## 使い方
1. popup を開き、**Settings**（options ページ）をクリック。
2. API base URL、キー、モデル、言語、出力モードを設定。
3. 任意のページでテキストを選択し、コンテキストメニューまたはホットキーを使用。
4. X と YouTube コメントでは、対応したコンテンツの下にある「テキストを翻訳」をクリックするとインライン翻訳を表示できます。これらのボタンは Settings で無効化できます。

## 設定（Options ページ）
- Provider プリセットとカスタム endpoint。
- OpenAI、Claude、Gemini、OpenRouter（user/public、free-only）、YandexGPT のモデル更新/読み込み。
- 出力モード + overlay 表示時間。
- 選択付近のクイック翻訳ボタン切り替え。
- セキュリティ警告付きの API キー端末間同期（任意）。
- X と YouTube の翻訳ボタン表示を個別に切り替えるトグルを用意。

## 権限
- content script は `<all_urls>` で動作し、テキスト選択を検出して対応箇所でインライン翻訳 UI を表示します。
- `contextMenus`, `storage`, `activeTab`, `scripting`, `notifications`
- 設定済み API プロバイダーおよび X/Twitter API 向け host permissions

## 開発
- `chrome://extensions` で Load unpacked
- エントリーファイル: `background.js`, `content.js`, `popup.html`, `popup.js`, `options.html`, `options.js`

## プライバシー
選択テキストは、あなたが設定した API endpoint にのみ送信されます。
`PRIVACY_POLICY.md` を参照してください。

## 連絡先
- Email: `xtran@msk.onl`

