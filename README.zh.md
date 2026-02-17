# 适用于 X 和 YouTube 的 AI Translate

Chrome 扩展：使用你自己的 API Key（OpenAI 兼容及受支持的原生提供商）翻译选中文本、X（Twitter）帖子和 YouTube 评论。

## 功能
- 通过右键菜单或快捷键 `Alt+Shift+T` 翻译选中文本（流式输出）。
- 在 X 帖子/回复和 YouTube 评论下方显示内联翻译按钮（流式输出）。
- 可选快速翻译按钮，显示在选中文本附近。
- 在 popup 中提供快速翻译模块：支持语言对切换、保存最近输入/输出以及保存语言对。
- 支持 OpenAI、Claude、Gemini、DeepSeek、YandexGPT、OpenRouter 以及自定义 OpenAI 兼容 endpoint。
- OpenRouter 模型列表支持 Free-only 过滤和缓存。
- 自动加载 OpenAI、Claude、Gemini、OpenRouter、YandexGPT 的模型列表。
- 输出模式：右下角 toast 或居中 modal（不在扩展 popup 中输出）。
- 支持目标语言和源语言选择（含自动检测）。
- API Key 可本地存储（默认）或在设备间同步（可选，安全性较低）。
- 结果会在 popup 中保存为“Last translation / Last error”。

## 使用方法
1. 打开 popup，点击 **Open settings**（options 页面）。
2. 配置 API base URL、密钥、模型、语言和输出模式。
3. 在任意页面选中文本，使用右键菜单或快捷键。
4. 在 X 或 YouTube 评论中，点击内容下方“翻译文本”查看内联翻译。

## 设置（Options 页面）
- 提供商预设和自定义 endpoint。
- OpenAI、Claude、Gemini、OpenRouter（user/public、free-only）和 YandexGPT 的模型刷新/加载。
- 输出模式 + overlay 持续时间。
- 选中文本旁快速翻译按钮开关。
- 可选 API Key 设备间同步（含安全警告）。

## 权限
- `contextMenus`, `storage`, `activeTab`, `scripting`, `notifications`
- 面向已配置 API 提供商和 X/Twitter API 的 host permissions

## 开发
- 在 `chrome://extensions` 使用 Load unpacked
- 入口文件：`background.js`, `content.js`, `popup.html`, `popup.js`, `options.html`, `options.js`

## 隐私
选中文本只会发送到你配置的 API endpoint。
参见 `PRIVACY_POLICY.md`。

## 联系方式
- Email: `xtran@msk.onl`

