# AI Translate subscription bridge

The extension keeps API-key providers as the default path. This optional local bridge adds subscription authentication for:

- OpenAI through the authenticated Codex CLI;
- Claude through the authenticated Claude Code CLI.

The bridge listens only on `127.0.0.1:32123`. It does not receive or store API keys. Provider credentials remain managed by the official CLI tools.

## Setup

Install and authenticate the provider CLI you want to use:

```text
npm install -g @openai/codex
codex login
```

```text
npm install -g @anthropic-ai/claude-code
claude
```

For Claude Pro/Max, choose the Claude account login. For OpenAI, complete the ChatGPT login in the browser. On Windows, Claude Code may require Git Bash or WSL according to its installation requirements.

Start the bridge manually from the bridge folder:

```text
node server.mjs
```

Keep the terminal open while the extension uses subscription mode. Select OpenAI or Claude in the extension settings, choose `Subscription`, and click `Connect`.

The extension never executes shell commands. If you need a background service, install it separately from a trusted native installer; that component is intentionally outside the Chrome Web Store package.

## Optional command overrides

If the CLI is not available on `PATH`, set one of these variables before starting the bridge:

```text
AI_TRANSLATE_CODEX_COMMAND=C:\path\to\codex.cmd
AI_TRANSLATE_CLAUDE_COMMAND=C:\path\to\claude.cmd
```

`AI_TRANSLATE_BRIDGE_PORT` can change the port, but the extension currently expects `32123`.

Subscription mode is opt-in. If the bridge is stopped or authentication expires, translation returns an explicit error and never falls back to an API key automatically.
