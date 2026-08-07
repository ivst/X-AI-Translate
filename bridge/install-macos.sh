#!/bin/bash
set -eu

LABEL="com.ivst.ai-translate.bridge"
BRIDGE_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_PATH="$BRIDGE_DIR/server.mjs"
NODE_PATH="${AI_TRANSLATE_NODE_COMMAND:-$(command -v node || true)}"
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$PLIST_DIR/$LABEL.plist"
LOG_DIR="$HOME/Library/Logs"
UID_VALUE="$(id -u)"

if [ -z "$NODE_PATH" ]; then
  echo "Node.js was not found on PATH. Install Node.js and run this script again." >&2
  exit 1
fi

mkdir -p "$PLIST_DIR" "$LOG_DIR"

cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_PATH</string>
    <string>--no-warnings</string>
    <string>$SERVER_PATH</string>
  </array>
  <key>WorkingDirectory</key>
  <string>$BRIDGE_DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>$PATH</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>$LOG_DIR/AI-Translate-bridge.log</string>
  <key>StandardErrorPath</key>
  <string>$LOG_DIR/AI-Translate-bridge-error.log</string>
</dict>
</plist>
EOF

launchctl bootout "gui/$UID_VALUE/$LABEL" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$UID_VALUE" "$PLIST_PATH"
launchctl kickstart -k "gui/$UID_VALUE/$LABEL"

echo "AI Translate bridge is registered and started for the current user."
echo "The bridge listens on http://127.0.0.1:32123."
