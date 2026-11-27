#!/bin/bash
set -e

APP_DIR="/opt/Cherry Studio"
SANDBOX="$APP_DIR/chrome-sandbox"
BIN_PATH="$APP_DIR/CherryStudio"
SYMLINK_PATH="/usr/local/bin/cherry-studio"

# Debian 13 restricts unprivileged user namespaces; set SUID root on chrome-sandbox
# so Electron's Chromium sandbox works out of the box without --no-sandbox.
if [ -f "$SANDBOX" ]; then
  chown root:root "$SANDBOX"
  chmod 4755 "$SANDBOX"
fi

# Provide a convenient CLI launcher symlink
if [ -x "$BIN_PATH" ]; then
  mkdir -p /usr/local/bin
  ln -sf "$BIN_PATH" "$SYMLINK_PATH"
fi

if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications || true
fi
