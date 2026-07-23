import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Plus, Trash2, Download, Loader2, Info, X, Scissors, FileText, Image } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../AppContext.jsx'
import { t } from '../i18n.js'

const api = window.acmigo

const FORMATS = [
  { id: 'mp4',  label: 'MP4 Video', icon: '🎬', color: '#818cf8' },
  { id: 'mp3',  label: 'MP3 Audio', icon: '🎵', color: '#67e8f9' },
  { id: 'webm', label: 'WebM',      icon: '📹', color: '#a78bfa' },
  { id: 'mkv',  label: 'MKV Video', icon: '🎥', color: '#f472b6' },
]

const QUALITIES = [
  { id: 'best', label: 'Best Quality' },
  { id: '2160', label: '4K (2160p)' },
  { id: '1440', label: '2K (1440p)' },
  { id: '1080', label: '1080p FHD' },
  { id: '720',  label: '720p HD' },
  { id: '480',  label: '480p' },
  { id: '360',  label: '360p' },
]

function uid() { return Math.random().toString(36).slice(2, 10) }

function UrlRow({ item, onChange, onRemove, inputRef }) {
  return (
    <motion.div layout initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, x:-20 }}
      className="flex items-center gap-2">
      <input
        type="url"
        value={item.url}
        onChange={e => onChange(item.id, e.target.value)}
        placeholder="https://youtube.com/watch?v=..."
        className="input-field flex-1 text-xs"
        spellCheck={false}
        ref={inputRef}
      />
      <button onClick={() => onRemove(item.id)}
        className="p-2 rounded-lg hover:text-red-400 transition-colors"
        style={{ color: 'rgba(255,255,255,0.3)' }}>
        <X size={15} />
      </button>
    </motion.div>
  )
}

// ─── Main Downloader ──────────────────────────────────────────────────────────
export default function Downloader({ addToQueue, settings }) {
  const { lang } = useApp()
  const [urls, setUrls]           = useState([{ id: uid(), url: '' }])
  const [format, setFormat]       = useState('mp4')
  const [quality, setQuality]     = useState('1080')
  const [loading, setLoading]     = useState(false)
  const [fetchingInfo, setFI]     = useState(false)
  const [previewInfo, setPreview] = useState(null)
  const [error, setError]         = useState('')
  const inputRef               = useRef(null)

  // Extra options (no playlist here — handled separately)
  const [clipMode,  setClipMode]  = useState(false)
  const [clipFrom,  setClipFrom]  = useState('')
  const [clipTo,    setClipTo]    = useState('')
  const [subtitles, setSubtitles] = useState(false)
  const [thumbOnly, setThumbOnly] = useState(false)

  // Persist URL list across navigation
  useEffect(() => {
    try {
      const saved = localStorage.getItem('acmigo_pending_urls')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.length) setUrls(parsed)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      // Only save if there's actual content
      const hasContent = urls.some(u => u.url.trim())
      if (hasContent) localStorage.setItem('acmigo_pending_urls', JSON.stringify(urls))
      else localStorage.removeItem('acmigo_pending_urls')
    } catch {}
  }, [urls])

  const addUrl = () => {
    setUrls(prev => [...prev, { id: uid(), url: '' }])
    setTimeout(() => inputRef.current?.focus(), 50)
  }
  const updateUrl = (id, val) => {
    setUrls(prev => prev.map(u => u.id === id ? { ...u, url: val } : u))
    setPreview(null)
    setPlaylist(null)
  }
  const removeUrl = (id) => {
    if (urls.length === 1) { setUrls([{ id: uid(), url: '' }]); return }
    setUrls(prev => prev.filter(u => u.id !== id))
  }

  const handlePaste = useCallback((e) => {
    const text = e.clipboardData?.getData('text') || ''
    const lines = text.split(/\n/).map(l => l.trim()).filter(l => l.startsWith('http'))
    if (lines.length > 1) {
      e.preventDefault()
      const existing = urls.filter(u => u.url.trim())
      setUrls([...existing, ...lines.map(url => ({ id: uid(), url }))])
    }
  }, [urls])

  const handleDragOver = (e) => e.preventDefault()
  const handleDrop = (e) => {
    e.preventDefault()
    const text = e.dataTransfer.getData('text/plain') || ''
    const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.startsWith('http'))
    if (lines.length > 0) {
      const existing = urls.filter(u => u.url.trim())
      setUrls([...existing, ...lines.map(url => ({ id: uid(), url }))])
    }
  }

  // Regular download (not playlist)
  const handleDownload = async () => {
    const validUrls = urls.filter(u => u.url.trim())
    if (!validUrls.length) { setError('Unesi bar jedan link'); return }
    setError('')
    setLoading(true)
    const isAudio = format === 'mp3'

    // Strip playlist params from URLs — always download single video
    const cleanUrl = (raw) => {
      try {
        const u = new URL(raw.trim())
        ;['list', 'index', 'start_radio', 'ab_channel'].forEach(p => u.searchParams.delete(p))
        return u.toString()
      } catch { return raw.trim() }
    }

    const items = validUrls.map(u => ({
      id:        uid(),
      url:       cleanUrl(u.url),
      format,
      quality:   isAudio ? 'best' : quality,
      state:     'queued',
      progress:  0,
      title:     previewInfo?.title || u.url,
      thumbnail: previewInfo?.thumbnail || null,
      audioOnly: isAudio,
      clipFrom:  clipMode ? clipFrom : '',
      clipTo:    clipMode ? clipTo : '',
      subtitles,
      thumbOnly,
    }))

    addToQueue(items)
    setUrls([{ id: uid(), url: '' }])
    setPreview(null)
    setLoading(false)
    try { localStorage.removeItem('acmigo_pending_urls') } catch {}
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const fetchPreview = async () => {
    const firstUrl = urls.find(u => u.url.trim())?.url
    if (!firstUrl || !api) return
    setFI(true)
    try {
      const info = await api.getVideoInfo(firstUrl)
      setPreview(info)
    } catch(e) { setError('Ne mogu dohvatiti info: ' + e.message) }
    finally { setFI(false) }
  }

  const validCount = urls.filter(u => u.url.trim()).length

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold gradient-text">{t('downloadTitle', lang)}</h1>
        <p className="text-sm mt-1" style={{ color:'rgba(255,255,255,0.4)' }}>
          {t('downloadSub', lang)}
        </p>
      </div>

      {/* URL input */}
      {true && (
        <div className="card mb-4"
          onDragOver={handleDragOver} onDrop={handleDrop}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white">{t('videoUrls', lang)}</span>
            <div className="flex items-center gap-2">
              <button onClick={addUrl} className="btn-ghost text-xs flex items-center gap-1.5 py-1.5">
                <Plus size={13} /> {t('addUrl', lang)}
              </button>
              {urls.some(u => u.url.trim()) && (
                <button onClick={() => { setUrls([{id:uid(),url:''}]); setPreview(null); setError(''); try { localStorage.removeItem('acmigo_pending_urls') } catch {} }}
                  className="text-xs flex items-center gap-1 py-1.5 px-2 rounded-lg transition-all hover:opacity-80"
                  style={{ color:'#f87171', background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)' }}>
                  🗑 Obriši sve
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2" onPaste={handlePaste}>
            <AnimatePresence mode="popLayout">
              {urls.map((item, idx) => (
                <UrlRow key={item.id} item={item} onChange={updateUrl} onRemove={removeUrl} inputRef={idx===0?inputRef:null} />
              ))}
            </AnimatePresence>
          </div>
          <p className="text-xs mt-2" style={{ color:'rgba(255,255,255,0.25)' }}>
            💡 Zalijepi više linkova odjednom · Prevuci iz browsera ovdje
          </p>
        </div>
      )}

      {/* Format + Quality */}
      {true && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="card">
            <p className="text-xs font-semibold mb-3" style={{ color:'rgba(255,255,255,0.5)' }}>{t('format', lang)}</p>
            <div className="grid grid-cols-2 gap-2">
              {FORMATS.map(f => (
                <button key={f.id} onClick={() => setFormat(f.id)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={format === f.id
                    ? { background:`rgba(124,58,237,0.2)`, border:`1px solid ${f.color}55`, color:f.color }
                    : { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)' }
                  }>
                  <span>{f.icon}</span><span>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ opacity:format==='mp3'?0.4:1, pointerEvents:format==='mp3'?'none':'auto' }}>
            <p className="text-xs font-semibold mb-3" style={{ color:'rgba(255,255,255,0.5)' }}>{t('quality', lang)}</p>
            <div className="flex flex-col gap-1">
              {QUALITIES.map(q => (
                <button key={q.id} onClick={() => setQuality(q.id)}
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all"
                  style={quality===q.id
                    ? { background:'rgba(124,58,237,0.2)', border:'1px solid rgba(124,58,237,0.4)', color:'#c4b5fd' }
                    : { background:'transparent', border:'1px solid transparent', color:'rgba(255,255,255,0.4)' }
                  }>
                  <span>{q.label}</span>
                  {quality===q.id && <span style={{ color:'#7c3aed' }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Extra options */}
      {true && (
        <div className="card mb-4">
          <p className="text-xs font-semibold mb-3" style={{ color:'rgba(255,255,255,0.5)' }}>{t('options', lang)}</p>
          <div className="flex flex-wrap gap-2 mb-3">
<button onClick={() => setClipMode(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={clipMode
                ? { background:'rgba(236,72,153,0.2)', border:'1px solid rgba(236,72,153,0.5)', color:'#f472b6' }
                : { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)' }}>
              <Scissors size={13} /> {t('clipMode', lang)}
            </button>

            <button onClick={() => setSubtitles(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={subtitles
                ? { background:'rgba(6,182,212,0.2)', border:'1px solid rgba(6,182,212,0.5)', color:'#67e8f9' }
                : { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)' }}>
              <FileText size={13} /> {t('subtitles', lang)}
            </button>

            <button onClick={() => setThumbOnly(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={thumbOnly
                ? { background:'rgba(251,191,36,0.2)', border:'1px solid rgba(251,191,36,0.5)', color:'#fbbf24' }
                : { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)' }}>
              <Image size={13} /> {t('thumbOnly', lang)}
            </button>
          </div>

          <AnimatePresence>
            {clipMode && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                className="flex items-center gap-3 overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color:'rgba(255,255,255,0.5)' }}>{t('from', lang)}</span>
                  <input value={clipFrom} onChange={e => setClipFrom(e.target.value)}
                    placeholder="00:01:30" className="input-field text-xs w-28" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color:'rgba(255,255,255,0.5)' }}>{t('to', lang)}</span>
                  <input value={clipTo} onChange={e => setClipTo(e.target.value)}
                    placeholder="00:03:45" className="input-field text-xs w-28" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Video preview */}
      {true && (
        <AnimatePresence>
          {previewInfo && (
            <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              className="card mb-4 flex items-center gap-4">
              {previewInfo.thumbnail && (
                <img src={previewInfo.thumbnail} alt="" className="w-24 h-14 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{previewInfo.title}</p>
                <p className="text-xs mt-0.5" style={{ color:'rgba(255,255,255,0.4)' }}>
                  {previewInfo.uploader}
                  {previewInfo.duration && ` · ${Math.floor(previewInfo.duration/60)}:${String(previewInfo.duration%60).padStart(2,'0')}`}
                </p>
              </div>
              <button onClick={() => setPreview(null)} style={{ color:'rgba(255,255,255,0.3)' }}><X size={15}/></button>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5' }}>
          {error}
        </div>
      )}

      {/* Action buttons */}
      {true && (
        <div className="flex items-center gap-3">
          <button onClick={handleDownload} disabled={loading || validCount === 0}
            className="btn-primary flex items-center gap-2 px-6 py-3 text-base disabled:opacity-50">
            {loading
              ? <><Loader2 size={18} className="animate-spin" /> Dodajem...</>
              : <><Download size={18} /> {validCount > 1 ? t('downloadMany', lang).replace('{n}', validCount) : t('downloadBtn', lang)}</>
            }
          </button>

          <button onClick={fetchPreview} disabled={fetchingInfo || !validCount}
            className="btn-ghost flex items-center gap-2 py-3 disabled:opacity-40">
            {fetchingInfo ? <Loader2 size={15} className="animate-spin" /> : <Info size={15} />}
            {t('preview', lang)}
          </button>

          <button onClick={async () => {
              const res = await api?.importUrlList?.()
              if (res?.urls?.length) {
                const existing = urls.filter(u=>u.url.trim())
                setUrls([...existing, ...res.urls.map(url=>({id:uid(),url}))])
              }
            }}
            className="btn-ghost flex items-center gap-2 py-3" style={{ color:'rgba(255,255,255,0.5)' }}>
            📋 Import .txt
          </button>

          <button onClick={() => { setUrls([{id:uid(),url:''}]); setPreview(null); setError(''); try { localStorage.removeItem('acmigo_pending_urls') } catch {} }}
            className="btn-ghost flex items-center gap-2 py-3" style={{ color:'rgba(255,255,255,0.4)' }}>
            <Trash2 size={15} /> {t('clear', lang)}
          </button>
        </div>
      )}

      <div className="mt-8 pt-6" style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
        <p className="text-xs font-semibold mb-3" style={{ color:'rgba(255,255,255,0.3)' }}>{t('platforms', lang)}</p>
        <div className="flex flex-wrap gap-2">
          {['YouTube','Vimeo','Twitter/X','TikTok','Instagram','Facebook','Twitch','Reddit','Dailymotion','SoundCloud','1000+ više'].map(s=>(
            <span key={s} className="text-xs px-2.5 py-1 rounded-full"
              style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.08)' }}>
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
