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

Start the bridge manually from the repository root:

```text
node bridge/server.mjs
```

Keep the terminal open while the extension uses subscription mode. Select OpenAI or Claude in the extension settings, choose `Subscription`, and click `Connect`.

## Background mode

On Windows and macOS, the repository includes a per-user autostart script. It registers the bridge to start when the current user signs in, so no terminal window is needed during normal use.

Run the command from the repository root once:

Windows PowerShell:

```text
powershell -ExecutionPolicy Bypass -File bridge/install-windows.ps1
```

macOS:

```text
bash bridge/install-macos.sh
```

The bridge still listens only on `http://127.0.0.1:32123`. The background process runs as the current user so it can use the same Codex or Claude Code login. If the repository is moved, run the installer again. To remove autostart, run `powershell -ExecutionPolicy Bypass -File bridge/uninstall-windows.ps1` on Windows or `bash bridge/uninstall-macos.sh` on macOS.

## Optional command overrides

If the CLI is not available on `PATH`, set one of these variables before starting the bridge:

```text
AI_TRANSLATE_CODEX_COMMAND=C:\path\to\codex.cmd
AI_TRANSLATE_CLAUDE_COMMAND=C:\path\to\claude.cmd
```

`AI_TRANSLATE_BRIDGE_PORT` can change the port, but the extension currently expects `32123`.

Subscription mode is opt-in. If the bridge is stopped or authentication expires, translation returns an explicit error and never falls back to an API key automatically.
