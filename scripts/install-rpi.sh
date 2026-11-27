#!/usr/bin/env bash
set -euo pipefail

REPO="777amp/cherry-t2"
ARCH="$(dpkg --print-architecture 2>/dev/null || uname -m)"

if [[ "$ARCH" != "arm64" && "$ARCH" != "aarch64" ]]; then
  echo "Error: This installer is built for 64-bit ARM (arm64/aarch64), detected: $ARCH" >&2
  exit 1
fi

echo "==> Fetching latest Cherry Studio (Raspberry Pi 4B) release from $REPO..."
API_URL="https://api.github.com/repos/${REPO}/releases/latest"
RELEASE_JSON="$(curl -fsSL "$API_URL")"

DEB_URL="$(printf '%s' "$RELEASE_JSON" | grep -Eo 'https://[^"]+-rpi-arm64\.deb' | head -n 1)"
SUMS_URL="$(printf '%s' "$RELEASE_JSON" | grep -Eo 'https://[^"]+SHA256SUMS\.txt' | head -n 1 || true)"

if [[ -z "$DEB_URL" ]]; then
  echo "Error: Could not find a -rpi-arm64.deb asset in the latest release of $REPO." >&2
  exit 1
fi

DEB_FILE="$(basename "$DEB_URL")"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "==> Downloading $DEB_FILE..."
curl -fL --progress-bar -o "${TMP_DIR}/${DEB_FILE}" "$DEB_URL"

if [[ -n "$SUMS_URL" ]]; then
  echo "==> Verifying SHA256 checksum..."
  curl -fsSL -o "${TMP_DIR}/SHA256SUMS.txt" "$SUMS_URL"
  (cd "$TMP_DIR" && grep " ${DEB_FILE}\$" SHA256SUMS.txt | sha256sum -c -)
fi

echo "==> Installing $DEB_FILE via apt..."
sudo apt-get update -qq
sudo apt-get install -y "${TMP_DIR}/${DEB_FILE}"

echo ""
echo "Cherry Studio (Raspberry Pi 4B optimized) installed successfully!"
echo "Launch from your Applications menu or run: cherry-studio"
echo "Tip: If you encounter GPU glitches, launch with: CHERRY_PI_SOFTWARE_GL=1 cherry-studio"
