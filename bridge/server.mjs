import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

const HOST = process.env.AI_TRANSLATE_BRIDGE_HOST || "127.0.0.1";
const PORT = Number(process.env.AI_TRANSLATE_BRIDGE_PORT || 32123);
const WORKDIR = process.env.AI_TRANSLATE_WORKDIR || tmpdir();
const MAX_BODY_SIZE = 1024 * 1024;
const TRANSLATION_TIMEOUT_MS = 120000;
const SUPPORTED_PROVIDERS = new Set(["openai", "claude"]);

function commandSpec(provider) {
  const configured = provider === "openai"
    ? process.env.AI_TRANSLATE_CODEX_COMMAND
    : process.env.AI_TRANSLATE_CLAUDE_COMMAND;
  const command = configured || (
    process.platform === "win32"
      ? `${provider === "openai" ? "codex" : "claude"}.cmd`
      : provider === "openai" ? "codex" : "claude"
  );

  if (process.platform === "win32" && command.toLowerCase().endsWith(".ps1")) {
    return {
      command: "powershell.exe",
      args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", command]
    };
  }
  return { command, args: [] };
}

function spawnCli(provider, args, options = {}) {
  const spec = commandSpec(provider);
  return spawn(spec.command, [...spec.args, ...args], {
    cwd: WORKDIR,
    env: process.env,
    windowsHide: options.windowsHide !== false,
    shell: process.platform === "win32" && spec.command.toLowerCase().endsWith(".cmd"),
    stdio: options.stdio || ["pipe", "pipe", "pipe"]
  });
}

function runCli(provider, args, options = {}) {
  return new Promise((resolveResult) => {
    const child = spawnCli(provider, args, options);
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      child.kill();
      finish(-1, "The provider CLI timed out.");
    }, options.timeoutMs || 15000);

    const finish = (code, error = "") => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolveResult({ code, stdout, stderr, error });
    };

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => finish(-1, error.message));
    child.on("close", (code) => finish(code ?? -1));
  });
}

function writeJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function writeStreamEvent(res, payload) {
  res.write(`${JSON.stringify(payload)}\n`);
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || "";
  if (origin.startsWith("chrome-extension://")) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
}

function readJson(req) {
  return new Promise((resolveBody, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > MAX_BODY_SIZE) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolveBody({});
        return;
      }
      try {
        resolveBody(JSON.parse(body));
      } catch (_) {
        reject(new Error("Request body must be valid JSON."));
      }
    });
    req.on("error", reject);
  });
}

function getAuthStatus(provider) {
  if (provider === "openai") {
    return runCli(provider, ["login", "status"], { timeoutMs: 15000 }).then((result) => ({
      ok: true,
      provider,
      installed: !result.error,
      authenticated: result.code === 0,
      account: result.code === 0 ? result.stdout.trim() : "",
      error: result.code === 0 ? "" : result.stderr.trim() || result.error
    }));
  }

  return runCli(provider, ["--version"], { timeoutMs: 15000 }).then((result) => ({
    ok: true,
    provider,
    installed: !result.error,
    authenticated: null,
    account: "",
    message: result.error
      ? "Install Claude Code and run it once to sign in."
      : "Claude Code is installed. Run the login flow once, then translate a text to verify the session."
  }));
}

function startAuth(provider) {
  const args = provider === "openai" ? ["login"] : [];
  const child = spawnCli(provider, args, {
    windowsHide: false,
    stdio: "inherit"
  });
  child.on("error", () => {});
  return {
    ok: true,
    provider,
    message: provider === "openai"
      ? "Codex login started. Complete the browser flow and return to the extension."
      : "Claude Code login started in the bridge terminal. Complete the browser flow there."
  };
}

async function logout(provider) {
  const result = await runCli(provider, ["logout"], { timeoutMs: 15000 });
  if (result.code !== 0) {
    throw new Error(result.stderr.trim() || result.error || "Provider logout failed.");
  }
  return { ok: true, provider };
}

function buildPrompt({ text, targetLang, sourceLang }) {
  const source = sourceLang && sourceLang !== "auto"
    ? `The source language is ${sourceLang}.`
    : "Detect the source language automatically.";
  return [
    "Translate the following text.",
    source,
    `Translate it to ${targetLang || "en"}.`,
    "Return only the translated text. Do not explain, summarize, quote, or modify it.",
    "",
    "TEXT:",
    String(text || "")
  ].join("\n");
}

function textFromEvent(provider, event) {
  if (!event || typeof event !== "object") return "";

  if (provider === "openai") {
    if (event.type === "response.output_text.delta") return event.delta || "";
    if (event.type === "item.completed" || event.type === "item.updated") {
      const item = event.item || {};
      if (item.type === "agent_message") return item.text || "";
    }
    if (event.type === "turn.completed") {
      return event.output_text || event.turn?.output_text || "";
    }
    return event.output_text || "";
  }

  if (event.type === "content_block_delta") return event.delta?.text || "";
  if (event.type === "assistant") {
    return (event.message?.content || [])
      .map((part) => typeof part?.text === "string" ? part.text : "")
      .join("");
  }
  if (event.type === "result") return event.result || "";
  return "";
}

function appendOutput(state, candidate, res) {
  if (typeof candidate !== "string" || !candidate) return;
  let delta = candidate;
  if (candidate.startsWith(state.fullText)) {
    delta = candidate.slice(state.fullText.length);
  }
  if (!delta) return;
  state.fullText += delta;
  writeStreamEvent(res, { type: "delta", text: delta });
}

function translate(provider, payload, res) {
  const args = provider === "openai"
    ? [
      "exec",
      "--json",
      "--ephemeral",
      "--skip-git-repo-check",
      "--sandbox",
      "read-only",
      "--color",
      "never",
      ...(payload.model ? ["--model", payload.model] : [])
    ]
    : [
      "-p",
      "--output-format",
      "stream-json",
      "--max-turns",
      "1",
      "--permission-mode",
      "plan"
    ];
  const child = spawnCli(provider, args);
  const state = { fullText: "", settled: false };
  let stderr = "";
  const finish = (error = "") => {
    if (state.settled) return;
    state.settled = true;
    if (error) {
      writeStreamEvent(res, { type: "error", error });
    } else if (!state.fullText.trim()) {
      writeStreamEvent(res, { type: "error", error: "The subscription provider returned an empty response." });
    } else {
      writeStreamEvent(res, { type: "done", text: state.fullText.trim() });
    }
    res.end();
  };

  const lines = createInterface({ input: child.stdout });
  lines.on("line", (line) => {
    try {
      appendOutput(state, textFromEvent(provider, JSON.parse(line)), res);
    } catch (_) {
      // Ignore non-JSON diagnostic lines from the CLI.
    }
  });
  child.stderr?.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  child.on("error", (error) => finish(error.message));
  child.on("close", (code) => {
    if (code !== 0) {
      finish(stderr.trim() || `Provider CLI exited with code ${code}.`);
      return;
    }
    finish();
  });
  res.on("close", () => {
    if (!state.settled) child.kill();
  });
  child.stdin.end(buildPrompt(payload));
}

async function handle(req, res) {
  setCorsHeaders(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === "GET" && req.url === "/health") {
    writeJson(res, 200, { ok: true, bridge: "ai-translate", version: "1.0.0" });
    return;
  }

  if (req.method !== "POST") {
    writeJson(res, 405, { ok: false, error: "Method not allowed." });
    return;
  }

  const body = await readJson(req);
  const provider = body.provider;
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    writeJson(res, 400, { ok: false, error: "Subscription mode supports only OpenAI and Claude." });
    return;
  }

  if (req.url === "/v1/auth/status") {
    writeJson(res, 200, await getAuthStatus(provider));
    return;
  }
  if (req.url === "/v1/auth/login") {
    writeJson(res, 200, startAuth(provider));
    return;
  }
  if (req.url === "/v1/auth/logout") {
    writeJson(res, 200, await logout(provider));
    return;
  }
  if (req.url === "/v1/translate") {
    if (!String(body.text || "").trim()) {
      writeJson(res, 400, { ok: false, error: "Text is required." });
      return;
    }
    res.writeHead(200, {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "Connection": "keep-alive"
    });
    translate(provider, body, res);
    return;
  }
  writeJson(res, 404, { ok: false, error: "Not found." });
}

const server = createServer((req, res) => {
  handle(req, res).catch((error) => {
    if (!res.headersSent) {
      writeJson(res, 500, { ok: false, error: error.message || String(error) });
    } else {
      writeStreamEvent(res, { type: "error", error: error.message || String(error) });
      res.end();
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`AI Translate subscription bridge listening on http://${HOST}:${PORT}`);
  console.log(`Working directory: ${resolve(WORKDIR)}`);
});
