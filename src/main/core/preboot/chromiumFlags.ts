import fs from 'node:fs'

import { app } from 'electron'

import { isLinux, isLinuxWayland, isPiOptimized, isWin, totalMemoryMB } from '@main/core/platform'
import { bootConfigService } from '@main/data/bootConfig'

/**
 * Configure Chromium startup flags — the umbrella term Electron uses for
 * command-line switches and related APIs that affect how Chromium boots.
 *
 * All calls in this function must be made BEFORE app.whenReady() fires:
 * Chromium reads these once at startup and silently ignores later changes.
 * Callers must invoke this synchronously from main/index.ts during the
 * preboot phase, after bootConfigService has loaded.
 *
 * Covers both:
 *   - `app.commandLine.appendSwitch(...)` — raw Chromium switches
 *   - `app.disableHardwareAcceleration()` — Electron convenience API that
 *     maps to a Chromium GPU disable flag internally
 *
 * Electron docs reference:
 *   https://www.electronjs.org/docs/latest/api/command-line-switches
 *
 * See core/preboot/README.md for the preboot membership criteria.
 */
/** KDE sessions get KWallet from Chromium's own detection; leave them alone. */
function isKdeSession(): boolean {
  const { XDG_CURRENT_DESKTOP = '', DESKTOP_SESSION = '', KDE_FULL_SESSION } = process.env
  return Boolean(KDE_FULL_SESSION) || /kde/i.test(`${XDG_CURRENT_DESKTOP}:${DESKTOP_SESSION}`)
}

function getPiV8HeapLimitMB(): number {
  if (totalMemoryMB <= 2560) return 512
  if (totalMemoryMB <= 4608) return 1024
  return 1536
}

/** Only fall back to /tmp when /dev/shm is missing or container-tiny (<128 MB). */
function isDevShmSmall(): boolean {
  try {
    const stats = fs.statfsSync('/dev/shm')
    return stats.bsize * stats.blocks < 128 * 1024 * 1024
  } catch {
    return true
  }
}

export function configureChromiumFlags(): void {
  const enableFeatures = [
    'DocumentPolicyIncludeJSCallStacksInCrashReports',
    'EarlyEstablishGpuChannel',
    'EstablishGpuChannelAsync',
    'PageAllocatorRetryOnCommitFailure'
  ]

  // Disable hardware acceleration if opted out via BootConfig or Pi software-GL env toggle.
  const forceSoftwareGL = isPiOptimized && process.env.CHERRY_PI_SOFTWARE_GL === '1'
  if (bootConfigService.get('app.disable_hardware_acceleration') || forceSoftwareGL) {
    app.disableHardwareAcceleration()
  }

  // Windows: disable Chromium's native window-show animation. Prevents the
  // transparent SelectionAssistant toolbar from flashing on appear.
  // https://github.com/electron/electron/issues/12130#issuecomment-627198990
  if (isWin) {
    app.commandLine.appendSwitch('wm-window-animations-disabled')
  }

  // Linux Wayland: enable the xdg-desktop-portal global-shortcut backend so
  // globalShortcut.register() actually works under Wayland compositors.
  // https://www.electronjs.org/docs/latest/api/global-shortcut
  if (isLinuxWayland) {
    enableFeatures.push('GlobalShortcutsPortal', 'WaylandWindowDecorations')
  }

  // Linux (X11 and Wayland): set the window class/name and select Ozone platform.
  if (isLinux) {
    app.commandLine.appendSwitch('class', 'CherryStudio')
    app.commandLine.appendSwitch('name', 'CherryStudio')
    if (!app.commandLine.hasSwitch('ozone-platform') && !app.commandLine.hasSwitch('ozone-platform-hint')) {
      if (isPiOptimized && isLinuxWayland) {
        // Prefer native Wayland on Pi OS (labwc/Wayfire) to avoid XWayland DRI2 fallback.
        app.commandLine.appendSwitch('ozone-platform', 'wayland')
      } else {
        app.commandLine.appendSwitch('ozone-platform-hint', 'auto')
      }
    }
  }

  // Linux: Chromium uses plaintext key storage on desktops it doesn't recognise
  // (Hyprland, Sway, i3…). Prefer libsecret there; it falls back if unavailable.
  if (isLinux && !app.commandLine.hasSwitch('password-store') && !isKdeSession()) {
    app.commandLine.appendSwitch('password-store', 'gnome-libsecret')
  }

  // Raspberry Pi 4B / low-memory Linux ARM64 optimizations (Debian 13 / Mesa V3D).
  if (isPiOptimized) {
    process.env.CHERRY_PI_OPTIMIZED = '1'
    if (!process.env.UV_THREADPOOL_SIZE) {
      process.env.UV_THREADPOOL_SIZE = '4'
    }

    const heapLimitMB = getPiV8HeapLimitMB()
    app.commandLine.appendSwitch('js-flags', `--max-old-space-size=${heapLimitMB}`)
    app.commandLine.appendSwitch('renderer-process-limit', '3')
    app.commandLine.appendSwitch('num-raster-threads', '2')
    app.commandLine.appendSwitch('disk-cache-size', String(50 * 1024 * 1024))
    app.commandLine.appendSwitch('media-cache-size', String(25 * 1024 * 1024))
    if (isDevShmSmall()) {
      app.commandLine.appendSwitch('disable-dev-shm-usage')
    }
    app.commandLine.appendSwitch('disable-smooth-scrolling')
    app.commandLine.appendSwitch('disable-background-networking')
    app.commandLine.appendSwitch('disable-component-update')
    // VideoCore VI does not implement VA-API; disable libva video decode probing at boot.
    app.commandLine.appendSwitch('disable-accelerated-video-decode')
    app.commandLine.appendSwitch(
      'disable-features',
      'BackForwardCache,MediaRouter,HardwareMediaKeyHandling,VaapiVideoDecoder,VaapiVideoDecodeLinuxGL'
    )

    if (!forceSoftwareGL && !bootConfigService.get('app.disable_hardware_acceleration')) {
      // Use Mesa V3D native EGL/GLES instead of desktop GLX/DRI2 probing.
      app.commandLine.appendSwitch('use-gl', 'angle')
      app.commandLine.appendSwitch('use-angle', 'gles-egl')
      if (process.env.CHERRY_PI_GPU_RASTER === '1') {
        app.commandLine.appendSwitch('enable-gpu-rasterization')
        app.commandLine.appendSwitch('ignore-gpu-blocklist')
      } else {
        // Keep GPU compositing on Mesa V3D but rasterize tiles on CPU to avoid VideoCore VI shader stalls.
        app.commandLine.appendSwitch('disable-gpu-rasterization')
      }
    }
  }

  app.commandLine.appendSwitch('enable-features', enableFeatures.join(','))
}
