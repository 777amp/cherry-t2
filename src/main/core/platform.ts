import fs from 'node:fs'
import os from 'node:os'

export const isMac = process.platform === 'darwin'
export const isWin = process.platform === 'win32'
export const isLinux = process.platform === 'linux'
export const isLinuxArm64 = isLinux && process.arch === 'arm64'
// Session type, not Chromium's ozone backend: a Wayland session forced onto X11 via --ozone-platform=x11 still reads true.
export const isLinuxWayland =
  isLinux && (process.env.XDG_SESSION_TYPE === 'wayland' || Boolean(process.env.WAYLAND_DISPLAY))
export const isDev = process.env.NODE_ENV === 'development'
export const isPortable = isWin && 'PORTABLE_EXECUTABLE_DIR' in process.env
// onnxruntime-node ships no darwin-x64 binding (arm64 only) — gates local model
// inference (embedding + OCR) off on Intel Mac.
export const isDarwinX64 = isMac && process.arch === 'x64'
// @firecrawl/anydoc ships no win32-arm64 binding or wasm fallback.
export const isWinArm64 = isWin && process.arch === 'arm64'

function detectRaspberryPi(): boolean {
  if (!isLinux) return false
  try {
    const model = fs.readFileSync('/proc/device-tree/model', 'utf8')
    return /raspberry pi/i.test(model)
  } catch {
    return false
  }
}

export const totalMemoryMB = Math.round(os.totalmem() / (1024 * 1024))
export const isRaspberryPi = detectRaspberryPi()

// Active on Raspberry Pi hardware or <=8GB Linux ARM64 SBCs; overridable via CHERRY_PI_MODE=1|0.
export const isPiOptimized =
  process.env.CHERRY_PI_MODE === '1'
    ? true
    : process.env.CHERRY_PI_MODE === '0'
      ? false
      : isRaspberryPi || (isLinuxArm64 && totalMemoryMB <= 8192)
