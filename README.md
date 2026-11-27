# Cherry Studio — Raspberry Pi 4B Edition (Debian 13 / Trixie ARM64)

A Raspberry Pi 4B–optimized build of **Cherry Studio v2.2.3** for **64-bit Debian 13 (Trixie) / Raspberry Pi OS (aarch64)**.

## Quick Download & Install (Raspberry Pi 4B — Debian 13 ARM64)

Run this one-liner in your Raspberry Pi terminal to download the latest `.deb` release, verify its SHA256 checksum, and install it via `apt`:

```bash
curl -fsSL https://raw.githubusercontent.com/777amp/cherry-t2/main/scripts/install-rpi.sh | bash
```

Once installed, launch from the **Applications** menu or via terminal:

```bash
cherry-studio
```

### Portable AppImage (No `sudo` Required)

Download the latest `CherryStudio-*-rpi-arm64.AppImage` from [GitHub Releases](https://github.com/777amp/cherry-t2/releases/latest), then run:

```bash
chmod +x CherryStudio-*-rpi-arm64.AppImage
./CherryStudio-*-rpi-arm64.AppImage
```

---

## Raspberry Pi 4B Optimizations Included

- **Lazy Window Pools (`src/main/core/window/windowRegistry.ts`)**: Disables eager startup pre-warming of 3 hidden Electron renderers (`SubWindow`, `SelectionAction`, `SelectionAgent`), saving ~300–600 MB of idle RAM at launch, caps recycled renderers to `1`, and reclaims idle windows after `60s`.
- **Dynamic V8 & Chromium Memory Caps (`src/main/core/preboot/chromiumFlags.ts`)**:
  - Scales V8 `--max-old-space-size` automatically by board RAM (`512 MB` on 2 GB, `1024 MB` on 4 GB, `1536 MB` on 8 GB) with `--optimize-for-size`.
  - Caps Chromium renderer processes (`--renderer-process-limit=3`), raster threads (`--num-raster-threads=2`), disk cache (`50 MB`), and media cache (`25 MB`).
  - Sets `--disable-dev-shm-usage` and caps `UV_THREADPOOL_SIZE=4` for the Cortex-A72 quad-core CPU.
- **Debian 13 Wayland & VideoCore VI (Mesa V3D) Tuning (`chromiumFlags.ts`, `pi-optimize.css`)**:
  - Auto-selects Wayland/X11 via `--ozone-platform-hint=auto` with `WaylandWindowDecorations` and `GlobalShortcutsPortal`.
  - Disables GPU-stalling `backdrop-filter` blurs and trims heavy transitions/animations in Pi mode.
  - Supports instant software-rendering fallback via `CHERRY_PI_SOFTWARE_GL=1`.
- **microSD-Friendly SQLite Tuning (`src/main/data/db/DbService.ts`)**: Configures `temp_store = MEMORY`, `cache_size = -16000` (16 MB), `mmap_size = 64 MB`, `wal_autocheckpoint = 1000`, and `journal_size_limit = 32 MB`.
- **Zero Background Telemetry Overhead**: Disables Sentry and PostHog analytics in Pi mode.
- **Debian 13 (`t64`) Packaging (`electron-builder.rpi.config.cjs`, `build/linux/postinst.sh`)**: Uses `t64`-compatible Debian 13 dependencies (`libgtk-3-0t64 | libgtk-3-0`, `libasound2t64 | libasound2`, `libatspi2.0-0t64 | libatspi2.0-0`) and sets `chrome-sandbox` SUID root permissions in `postinst`.

---

## Runtime Environment Overrides

```bash
# Force software GL rendering if you encounter compositor/GPU glitches:
CHERRY_PI_SOFTWARE_GL=1 cherry-studio

# Force Pi optimization mode on or off explicitly:
CHERRY_PI_MODE=1 cherry-studio
CHERRY_PI_MODE=0 cherry-studio
```

## Automated Builds & Releases

The GitHub Actions workflow [`.github/workflows/rpi-release.yml`](.github/workflows/rpi-release.yml) builds natively on `ubuntu-24.04-arm` (no QEMU emulation) on any `v*` tag push or manual `workflow_dispatch`, publishing `.deb`, `.AppImage`, and `SHA256SUMS.txt` directly to GitHub Releases.
