/**
 * Electron Builder configuration tailored for Raspberry Pi 4B (Debian 13 / Trixie ARM64).
 * Extends the base electron-builder.yml with Debian 13 t64-compatible dependencies,
 * chrome-sandbox SUID post-install handling, and GitHub Releases publishing for 777amp/cherry-t2.
 */
module.exports = {
  extends: './electron-builder.yml',
  electronDownload: {
    mirror: 'https://github.com/electron/electron/releases/download/'
  },
  linux: {
    artifactName: 'CherryStudio-${version}-rpi-${arch}.${ext}',
    executableName: 'CherryStudio',
    target: [
      {
        target: 'deb',
        arch: ['arm64']
      }
    ],
    maintainer: '777amp <https://github.com/777amp/cherry-t2>',
    category: 'Utility',
    desktop: {
      entry: {
        Name: 'Cherry Studio',
        Comment: 'AI Assistant optimized for Raspberry Pi 4B (Debian 13)',
        StartupWMClass: 'CherryStudio',
        Categories: 'Utility;Development;'
      }
    },
    mimeTypes: ['x-scheme-handler/cherrystudio']
  },
  deb: {
    packageName: 'cherry-studio',
    compression: 'xz',
    afterInstall: 'build/linux/postinst.sh',
    depends: [
      'libgtk-3-0t64 | libgtk-3-0',
      'libnotify4',
      'libnss3',
      'libxss1',
      'libxtst6',
      'xdg-utils',
      'libatspi2.0-0t64 | libatspi2.0-0',
      'libuuid1',
      'libsecret-1-0',
      'libasound2t64 | libasound2',
      'libgbm1',
      'libdrm2'
    ]
  },
  publish: [
    {
      provider: 'github',
      owner: '777amp',
      repo: 'cherry-t2'
    }
  ]
}
