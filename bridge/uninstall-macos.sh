#!/bin/bash
set -eu

LABEL="com.ivst.ai-translate.bridge"
PLIST_PATH="$HOME/Library/LaunchAgents/$LABEL.plist"
UID_VALUE="$(id -u)"

launchctl bootout "gui/$UID_VALUE/$LABEL" >/dev/null 2>&1 || true
rm -f "$PLIST_PATH"
echo "AI Translate bridge autostart was removed."
