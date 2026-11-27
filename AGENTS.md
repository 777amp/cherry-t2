# AGENTS.md — 777amp/cherry-t2

Terse mode default. Load `.agents/skills/caveman/SKILL.md`. Upstream repo rules stay in `CLAUDE.md`.

## Project Info

- Repo: `777amp/cherry-t2` (upstream source: `777amp/cherry-t1`, Cherry Studio `v2.2.3`)
- Stack: Electron `45.2.2`, React `19`, Vite `8`, TypeScript, `better-sqlite3`, Drizzle ORM, pnpm workspace
- Target hardware: Raspberry Pi 4B (`BCM2711` quad-core Cortex-A72, 2 GB / 4 GB / 8 GB RAM, VideoCore VI Mesa V3D, microSD)
- Target OS: Debian 13 (Trixie) / Raspberry Pi OS 64-bit (`arm64` / `aarch64`), Wayland (labwc/Wayfire) and X11
- Active release: `v2.2.3-rpi.1` (`.deb`, `.AppImage`, `SHA256SUMS.txt`)

## Goal

Run full Cherry Studio fast and stable on Raspberry Pi 4B Debian 13 without OOM kills, GPU stalls, or microSD wear. Build and publish ARM64 releases natively on GitHub Actions `ubuntu-24.04-arm` with one-line install.

## What Done

1. **Pi hardware detect** — `src/main/core/platform.ts`
   - Added `isLinuxArm64`, `totalMemoryMB`, `isRaspberryPi` (reads `/proc/device-tree/model`), `isPiOptimized`.
   - Active on Raspberry Pi or Linux ARM64 with `<= 8192 MB` RAM. Override: `CHERRY_PI_MODE=1|0`.

2. **Lazy window pools** — `src/main/core/window/windowRegistry.ts`
   - Switched `SubWindow`, `SelectionAction`, `SelectionAgent` from `standbySize: 1, warmup: 'eager'` to `standbySize: 0, warmup: 'lazy'` on Pi. Saves ~300–600 MB idle RAM at launch.
   - Capped `recycleMaxSize: 1` and `inactivityTimeout: 60` for `SelectionAction`, `SelectionAgent`, `SelectionCapsule`, `Screenshot`.

3. **Chromium, V8, Wayland, V3D flags** — `src/main/core/preboot/chromiumFlags.ts`
   - Exports `CHERRY_PI_OPTIMIZED=1`, caps `UV_THREADPOOL_SIZE=4`.
   - Unified `--enable-features` array so Wayland flags do not overwrite core flags.
   - Added `--ozone-platform-hint=auto`, `WaylandWindowDecorations`, `GlobalShortcutsPortal`.
   - Dynamic V8 heap cap: `512 MB` (`<= 2560 MB` RAM), `1024 MB` (`<= 4608 MB`), `1536 MB` (8 GB) with `--optimize-for-size`.
   - Caps: `--renderer-process-limit=3`, `--num-raster-threads=2`, `--disk-cache-size=52428800`, `--media-cache-size=26214400`.
   - Stability: `--disable-dev-shm-usage`, `--disable-smooth-scrolling`, `--disable-background-networking`, `--disable-component-update`, `--enable-gpu-rasterization`, `--ignore-gpu-blocklist`.
   - Software GL fallback: `CHERRY_PI_SOFTWARE_GL=1`.

4. **Low-power renderer CSS** — `src/preload/preload.ts`, `src/renderer/windows/prepareWindow.ts`, `src/renderer/assets/styles/pi-optimize.css`, `src/renderer/assets/styles/index.css`
   - Preload exposes `window.api.isPiOptimized`.
   - `prepareWindow.ts` adds `pi-optimized` class to `<html>` and skips renderer Sentry init.
   - `pi-optimize.css` strips `backdrop-filter`, sets `text-rendering: optimizeSpeed`, trims transitions to `0.05s`.

5. **microSD SQLite tuning** — `src/main/data/db/DbService.ts`
   - Added Pi PRAGMAs: `temp_store = MEMORY`, `cache_size = -16000`, `mmap_size = 67108864`, `wal_autocheckpoint = 1000`, `journal_size_limit = 33554432`.

6. **Telemetry off on Pi** — `src/main/services/errorReporting/sentry.ts`, `src/main/services/AnalyticsService.ts`
   - Skips Sentry init and PostHog activation when `isPiOptimized` is true.

7. **Debian 13 ARM64 packaging & installer** — `electron-builder.rpi.config.cjs`, `build/linux/postinst.sh`, `scripts/install-rpi.sh`, `package.json`, `README.md`
   - `electron-builder.rpi.config.cjs` extends `electron-builder.yml`, builds `arm64` `.deb` (`xz`) and `.AppImage`, uses Debian 13 `t64` deps (`libgtk-3-0t64 | libgtk-3-0`, `libasound2t64 | libasound2`, `libatspi2.0-0t64 | libatspi2.0-0`), publishes to `777amp/cherry-t2`.
   - `build/linux/postinst.sh` sets `chmod 4755` SUID root on `/opt/Cherry Studio/chrome-sandbox` and symlinks `/usr/local/bin/cherry-studio`.
   - `scripts/install-rpi.sh` fetches latest `.deb` + `SHA256SUMS.txt`, verifies hash, runs `apt-get install`.

8. **GitHub Actions CI/Release** — `.github/workflows/rpi-release.yml`
   - Runs natively on `ubuntu-24.04-arm` (no QEMU) on tag `v*` or `workflow_dispatch`.
   - Builds app, packages `.deb` + `.AppImage`, writes `SHA256SUMS.txt`, publishes GitHub Release with install codeblock.
   - Removed upstream CherryHQ workflows that need CherryHQ secrets.

## Remote Agent Setup

- Skill: `.agents/skills/caveman/SKILL.md` (allowlisted in `.agents/skills/.gitignore` and `.agents/skills/public-skills.txt`).
- MCP config: `.agents/mcp_config.json` (`memory` via `npx -y @modelcontextprotocol/server-memory`). Never commit secret keys; use env vars only.

## Commands

```bash
# Build & package locally on ARM64 Linux
pnpm run build:linux:rpi

# Trigger new release on GitHub Actions
git tag -a v2.2.3-rpi.2 -m "Release v2.2.3-rpi.2"
git push origin v2.2.3-rpi.2

# Install on Raspberry Pi 4B Debian 13
curl -fsSL https://raw.githubusercontent.com/777amp/cherry-t2/main/scripts/install-rpi.sh | bash
```
