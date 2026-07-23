import React, { useState, useEffect } from 'react'
import { useApp, THEMES } from '../AppContext.jsx'
import { t, LANGS } from '../i18n.js'
import {
  FolderOpen, Download, RefreshCw, CheckCircle2,
  AlertCircle, Loader2, Bell, Film, Shield, Trash2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const api = window.acmigo

function Toggle({ value, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="w-11 h-6 rounded-full relative transition-all duration-200 shrink-0 ml-4"
        style={{ background: value ? 'rgba(124,58,237,0.8)' : 'rgba(255,255,255,0.1)' }}
      >
        <div
          className="w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-200"
          style={{ left: value ? '24px' : '4px', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
        />
      </button>
    </div>
  )
}

function Select({ value, onChange, label, options }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <p className="text-sm font-medium text-white">{label}</p>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="px-3 py-1.5 rounded-lg text-sm outline-none ml-4"
        style={{
          background: '#13132e',
          border: '1px solid rgba(255,255,255,0.15)',
          color: 'white',
          colorScheme: 'dark',
          minWidth: '160px',
          cursor: 'pointer',
          appearance: 'auto',
          WebkitAppearance: 'auto',
        }}
      >
        {options.map(o => (
          <option
            key={o.value}
            value={o.value}
            style={{ background: '#13132e', color: 'white' }}
          >
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default function SettingsView({ settings, updateSettings, ytdlpOk, setYtdlpOk }) {
  const { lang, setLang, theme, setTheme } = useApp()
  const [ytdlpStatus, setYtdlpStatus] = useState(null)
  const [installing, setInstalling] = useState(false)
  const [installProgress, setInstallProgress] = useState(0)
  const [updating, setUpdating] = useState(false)
  const [saved, setSaved] = useState(false)

  const [ffmpegOk, setFfmpegOk] = useState(false)
  const [cookieMsg, setCookieMsg] = useState('')

  useEffect(() => {
    api?.ytdlpStatus().then(s => {
      setYtdlpStatus(s)
      setYtdlpOk?.(s.installed)
      setFfmpegOk(!!s.ffmpeg)
    })
  }, [])

  useEffect(() => {
    const off = api?.on('ytdlp:install-progress', pct => setInstallProgress(pct))
    return off
  }, [])

  const patch = async (key, val) => {
    await updateSettings({ [key]: val })
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  const handleSelectDir = async () => {
    const dir = await api?.selectDir()
    if (dir) patch('downloadPath', dir)
  }

  const handleInstall = async () => {
    setInstalling(true)
    setInstallProgress(0)
    const res = await api?.ytdlpInstall()
    setInstalling(false)
    if (res?.success) {
      const s = await api?.ytdlpStatus()
      setYtdlpStatus(s)
      setYtdlpOk?.(s.installed)
    } else {
      alert('Installation failed: ' + res?.error)
    }
  }

  const handleUpdate = async () => {
    setUpdating(true)
    await api?.ytdlpUpdate()
    const s = await api?.ytdlpStatus()
    setYtdlpStatus(s)
    setUpdating(false)
  }

  if (!settings) return (
    <div className="p-6 flex items-center justify-center h-full">
      <Loader2 size={24} className="animate-spin" style={{ color: 'rgba(255,255,255,0.3)' }} />
    </div>
  )

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold gradient-text">Settings</h1>
        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-sm"
              style={{ color: '#4ade80' }}
            >
              <CheckCircle2 size={14} /> Saved
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* yt-dlp status card */}
      <div className="card mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: ytdlpStatus?.installed ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }}
          >
            {ytdlpStatus?.installed
              ? <CheckCircle2 size={18} style={{ color: '#4ade80' }} />
              : <AlertCircle size={18} style={{ color: '#f87171' }} />
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-white">yt-dlp Engine</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {ytdlpStatus?.installed
                ? `Installed · v${ytdlpStatus.version}`
                : 'Not installed — required for downloading'}
            </p>
          </div>
          <div className="flex gap-2 ml-auto">
            {ytdlpStatus?.installed && (
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="btn-ghost text-xs py-1.5 flex items-center gap-1.5"
              >
                {updating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                Update
              </button>
            )}
            {!ytdlpStatus?.installed && (
              <button
                onClick={handleInstall}
                disabled={installing}
                className="btn-primary text-xs py-1.5 flex items-center gap-1.5"
              >
                {installing ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                {installing ? `Installing ${installProgress}%` : 'Install Automatically'}
              </button>
            )}
          </div>
        </div>

        {installing && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${installProgress}%` }} />
          </div>
        )}

        {ytdlpStatus?.installed && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-1 rounded-lg"
              style={ffmpegOk
                ? { background:'rgba(34,197,94,0.12)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.3)' }
                : { background:'rgba(239,68,68,0.12)', color:'#f87171', border:'1px solid rgba(239,68,68,0.3)' }}>
              {ffmpegOk ? '✓ ffmpeg aktivan — 4K/1080p radi' : '✗ ffmpeg nije pronađen — max 720p'}
            </span>
          </div>
        )}
        {!ytdlpStatus?.installed && (
          <p className="text-xs mt-3 px-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            ili instaliraj ručno: <code className="px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>pip install yt-dlp</code>
          </p>
        )}
      </div>

      {/* Download path */}
      <div className="card mb-4">
        <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>DOWNLOAD LOCATION</p>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 px-3 py-2.5 rounded-xl text-sm truncate"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
          >
            {settings.downloadPath || 'Not set'}
          </div>
          <button onClick={handleSelectDir} className="btn-ghost flex items-center gap-2 py-2.5 shrink-0">
            <FolderOpen size={15} /> Browse
          </button>
        </div>
      </div>

      {/* Download options */}
      <div className="card mb-4">
        <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>DOWNLOAD OPTIONS</p>

        <Select
          label="Max Concurrent Downloads"
          value={String(settings.maxConcurrent || 3)}
          onChange={v => patch('maxConcurrent', parseInt(v))}
          options={[
            { value: '1', label: '1 at a time' },
            { value: '2', label: '2 at a time' },
            { value: '3', label: '3 at a time' },
            { value: '5', label: '5 at a time' },
          ]}
        />

        <Select
          label="Default Format"
          value={settings.preferredFormat || 'mp4'}
          onChange={v => patch('preferredFormat', v)}
          options={[
            { value: 'mp4',  label: 'MP4 (Video)' },
            { value: 'mp3',  label: 'MP3 (Audio)' },
            { value: 'webm', label: 'WebM (Video)' },
            { value: 'mkv',  label: 'MKV (Video)' },
          ]}
        />

        <Select
          label="Default Quality"
          value={settings.preferredQuality || '1080'}
          onChange={v => patch('preferredQuality', v)}
          options={[
            { value: 'best', label: 'Best Available' },
            { value: '2160', label: '4K (2160p)' },
            { value: '1440', label: '2K (1440p)' },
            { value: '1080', label: '1080p Full HD' },
            { value: '720',  label: '720p HD' },
            { value: '480',  label: '480p' },
          ]}
        />

        <Toggle
          label="Auto-start Downloads"
          description="Start downloading immediately when URLs are added"
          value={settings.autoStart !== false}
          onChange={v => patch('autoStart', v)}
        />

        <Toggle
          label="Embed Thumbnail"
          description="Embed video thumbnail into downloaded file"
          value={settings.embedThumbnail !== false}
          onChange={v => patch('embedThumbnail', v)}
        />

        <Toggle
          label="Download Subtitles"
          description="Automatically download English subtitles when available"
          value={!!settings.subtitles}
          onChange={v => patch('subtitles', v)}
        />
      </div>

      {/* App options */}
      <div className="card mb-4">
        <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>APPLICATION</p>

        <Toggle
          label="Desktop Notifications"
          description="Show notification when a download completes"
          value={settings.notifications !== false}
          onChange={v => patch('notifications', v)}
        />

        <Toggle
          label="Save Download History"
          description="Keep a record of all completed downloads"
          value={settings.saveHistory !== false}
          onChange={v => patch('saveHistory', v)}
        />
      </div>

      {/* Language + Theme */}
      <div className="card mb-4">
        <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>JEZIK / TEMA</p>

        <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-sm font-medium text-white">{t('language', lang)}</p>
          <select
            value={lang}
            onChange={e => setLang(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm outline-none"
            style={{ background: '#13132e', border: '1px solid rgba(255,255,255,0.15)', color: 'white', colorScheme: 'dark', minWidth: '140px' }}
          >
            {Object.entries(LANGS).map(([k, v]) => (
              <option key={k} value={k} style={{ background: '#13132e', color: 'white' }}>{v}</option>
            ))}
          </select>
        </div>

        <div className="py-3">
          <p className="text-sm font-medium text-white mb-3">{t('theme', lang)}</p>
          <div className="grid grid-cols-3 gap-2">
            {Object.entries(THEMES).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setTheme(key)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={theme === key ? {
                  border: '2px solid #7c3aed',
                  background: val.preview,
                  color: 'white',
                  boxShadow: '0 0 12px rgba(124,58,237,0.4)',
                } : {
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: val.preview,
                  color: 'rgba(255,255,255,0.75)',
                  opacity: 0.85,
                }}
              >
                <span>{val.label}</span>
                {theme === key && <span style={{ marginLeft:'auto' }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card" style={{ background: 'rgba(124,58,237,0.06)', borderColor: 'rgba(124,58,237,0.2)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}
          >▼</div>
          <div>
            <p className="text-sm font-bold text-white">ACMigo Video Downloader Pro</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>v1.0.0 · Powered by yt-dlp · Open Source</p>
          </div>
          <button
            onClick={() => api?.openExternal('https://github.com/yt-dlp/yt-dlp')}
            className="btn-ghost text-xs py-1.5 ml-auto"
          >
            yt-dlp GitHub
          </button>
        </div>
      </div>
    </div>
  )
}
