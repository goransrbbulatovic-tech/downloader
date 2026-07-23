# 🎬 ACMigo Video Downloader Pro

A powerful, beautiful, cross-platform desktop video downloader built with Electron + React.

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Electron](https://img.shields.io/badge/Electron-29-9feaf9?logo=electron)
![React](https://img.shields.io/badge/React-18-61dafb?logo=react)

---

## ✨ Features

- **Universal downloader** — YouTube, Vimeo, TikTok, Twitter/X, Instagram, Facebook, Twitch, Reddit, SoundCloud, Dailymotion, and 1000+ other sites
- **Format support** — MP4, MP3, WebM, MKV
- **Quality selection** — 4K, 2K, 1080p, 720p, 480p, 360p, or best available
- **Multi-URL queue** — Paste or enter multiple links, download them all in sequence
- **Live progress** — Speed, ETA, file size shown per download
- **MP3 extraction** — Best-quality audio extraction via FFmpeg
- **Download history** — Full log with calendar view
- **Statistics** — Charts for downloads by format, source, and time
- **Reminders** — Schedule notifications ("download that lecture tonight")
- **Modern UI** — Dark glassmorphism design with smooth animations

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run (Development)

```bash
git clone https://github.com/YOUR_USERNAME/acmigo-video-downloader-pro.git
cd acmigo-video-downloader-pro
npm install
npm run dev
```

On first launch, go to **Settings** and click **"Install Automatically"** to download yt-dlp.
Or install it manually:

```bash
# Windows (pip)
pip install yt-dlp

# macOS (Homebrew)
brew install yt-dlp ffmpeg

# Linux
sudo pip install yt-dlp
sudo apt install ffmpeg
```

### Build for Production

```bash
# All platforms (on current OS)
npm run build

# Specific platform
npm run build:win    # Windows installer (.exe)
npm run build:mac    # macOS disk image (.dmg)
npm run build:linux  # Linux AppImage
```

Output files are in the `release/` folder.

---

## 📦 GitHub Releases (CI/CD)

Push a version tag to trigger automated builds for all platforms:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions will build for Windows, macOS, and Linux and create a release with downloadable installers.

---

## 🏗️ Project Structure

```
acmigo-video-downloader-pro/
├── electron/
│   ├── main.js          # Main process: yt-dlp spawning, IPC, data storage
│   └── preload.js       # Secure context bridge
├── src/
│   ├── components/
│   │   ├── TitleBar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Downloader.jsx   # Main download UI
│   │   ├── Queue.jsx        # Active downloads
│   │   ├── Statistics.jsx   # Charts
│   │   ├── CalendarView.jsx # History
│   │   ├── Reminders.jsx    # Notifications
│   │   └── SettingsView.jsx # App settings
│   ├── styles/
│   │   └── globals.css
│   ├── App.jsx
│   ├── main.jsx
│   └── index.html
├── assets/
│   └── icon.svg / icon.png
├── .github/
│   └── workflows/
│       └── build.yml    # CI/CD for all platforms
├── electron-builder.yml
├── package.json
├── vite.config.js
└── tailwind.config.js
```

---

## ⚙️ Tech Stack

| Layer | Tech |
|-------|------|
| Desktop shell | [Electron](https://electronjs.org) 29 |
| Frontend | [React](https://react.dev) 18 + [Vite](https://vitejs.dev) 5 |
| Styling | [Tailwind CSS](https://tailwindcss.com) 3 |
| Animations | [Framer Motion](https://framer.motion.com) |
| Charts | [Recharts](https://recharts.org) |
| Download engine | [yt-dlp](https://github.com/yt-dlp/yt-dlp) (spawned via Node.js) |
| Packaging | [electron-builder](https://www.electron.build) |

---

## 📝 License

MIT — free to use, modify, and distribute.

---

## 🙏 Credits

Powered by the incredible [yt-dlp](https://github.com/yt-dlp/yt-dlp) project.
