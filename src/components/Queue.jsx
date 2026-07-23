import React, { useState } from 'react'
import {
  CheckCircle2, XCircle, Loader2, Clock,
  Trash2, StopCircle, RefreshCw, Square, PauseCircle
} from 'lucide-react'
import { useApp } from '../AppContext.jsx'
import { t } from '../i18n.js'
import { motion, AnimatePresence } from 'framer-motion'

const api = window.acmigo

const STATE_LABELS = {
  en: { queued:'Queued', expanding:'Playlist…', downloading:'Downloading', converting:'Converting', completed:'Done', failed:'Failed', cancelled:'Cancelled', paused:'Paused' },
  bs: { queued:'U redu', expanding:'Playlist…', downloading:'Preuzimanje', converting:'Konverzija',  completed:'Završeno', failed:'Greška', cancelled:'Prekinuto', paused:'Pauzirano' },
  sr: { queued:'U redu', expanding:'Playlist…', downloading:'Preuzimanje', converting:'Konverzija',  completed:'Završeno', failed:'Greška', cancelled:'Prekinuto', paused:'Pauzirano' },
  hr: { queued:'U redu', expanding:'Playlist…', downloading:'Preuzimanje', converting:'Konverzija',  completed:'Završeno', failed:'Greška', cancelled:'Prekinuto', paused:'Pauzirano' },
}
const STATE_CONFIG = {
  queued:      { color: '#94a3b8', icon: Clock,       tagClass: 'tag-dl' },
  expanding:   { color: '#a78bfa', icon: Loader2,     tagClass: 'tag-mp3' },
  downloading: { color: '#fbbf24', icon: Loader2,     tagClass: 'tag-dl' },
  converting:  { color: '#a78bfa', icon: RefreshCw,   tagClass: 'tag-mp3' },
  completed:   { color: '#4ade80', icon: CheckCircle2, tagClass: 'tag-done' },
  failed:      { color: '#f87171', icon: XCircle,     tagClass: 'tag-fail' },
  cancelled:   { color: '#6b7280', icon: StopCircle,  tagClass: 'tag-fail' },
  paused:      { color: '#60a5fa', icon: PauseCircle, tagClass: 'tag-dl' },
}

function DownloadItem({ item, onCancel, onRemove, onPlay, onTrim, onNavigate, lang }) {
  const cfg = STATE_CONFIG[item.state] || STATE_CONFIG.queued
  const stateLabel = (STATE_LABELS[lang] || STATE_LABELS.en)[item.state] || item.state
  const Icon = cfg.icon
  const isActive = ['downloading', 'converting', 'expanding'].includes(item.state)

  const openFolder = async () => {
    if (!api) return
    try {
      if (item.filePath) await api.showInFolder(item.filePath)
      else { const s = await api.getSettings(); if (s?.downloadPath) await api.openPath(s.downloadPath) }
    } catch (e) { console.error(e) }
  }

  return (
    <motion.div layout initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, x:40 }}
      className="card mb-3">
      <div className="flex items-center gap-3">
        {/* Thumbnail / icon */}
        <div className="w-12 h-8 rounded-md flex items-center justify-center shrink-0 overflow-hidden"
          style={{ background:'rgba(255,255,255,0.06)' }}>
          {item.thumbnail
            ? <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
            : <Icon size={16} style={{ color:cfg.color }} className={isActive ? 'animate-spin' : ''} />
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-white truncate max-w-xs">{item.title || item.url}</p>
            <span className={cfg.tagClass}>{stateLabel}</span>
            <span className={item.audioOnly ? 'tag-mp3' : 'tag-mp4'}>
              {item.audioOnly ? 'MP3' : (item.format || 'MP4').toUpperCase()}
            </span>
            {item.quality && item.quality !== 'best' && (
              <span className="tag-dl">{item.quality}p</span>
            )}
          </div>

          {isActive && (
            <div className="mt-2">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width:`${item.progress || 0}%` }} />
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs" style={{ color:'rgba(255,255,255,0.4)' }}>
                <span>{(item.progress || 0).toFixed(1)}%</span>
                {item.speed && <span>⚡ {item.speed}</span>}
                {item.eta && <span>⏱ ETA {item.eta}</span>}
                {item.totalSize && <span>📦 {item.totalSize}</span>}
              </div>
            </div>
          )}

          {item.state === 'failed' && item.error && (
            <p className="text-xs mt-1 truncate" style={{ color:'#f87171' }}>{item.error}</p>
          )}

          {item.state === 'completed' && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs" style={{ color:'#4ade80' }}>
                ✓ {item.filePath ? item.filePath.split('\\').pop().split('/').pop() : 'Saved'}
              </span>
              {item.filePath && onPlay && (
                <button onClick={() => onPlay(item.filePath)}
                  className="text-xs px-2 py-0.5 rounded-lg flex items-center gap-1 hover:opacity-80 transition-all"
                  style={{ background:'rgba(124,58,237,0.15)', color:'#c4b5fd', border:'1px solid rgba(124,58,237,0.3)' }}>
                  ▶ Play
                </button>
              )}
              {item.filePath && onNavigate && onTrim && (
                <button onClick={() => { onTrim(item.filePath); onNavigate('trim') }}
                  className="text-xs px-2 py-0.5 rounded-lg flex items-center gap-1 hover:opacity-80 transition-all"
                  style={{ background:'rgba(251,191,36,0.12)', color:'#fbbf24', border:'1px solid rgba(251,191,36,0.3)' }}>
                  ✂ Reži
                </button>
              )}
              <button onClick={openFolder}
                className="text-xs px-2 py-0.5 rounded-lg flex items-center gap-1 hover:opacity-80 transition-all"
                style={{ background:'rgba(34,197,94,0.15)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.3)' }}>
                {t('openFolder', lang)}
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {isActive && (
            <button onClick={() => onCancel(item.id)}
              className="p-1.5 rounded-lg hover:text-red-400 transition-colors"
              style={{ color:'rgba(255,255,255,0.3)' }} title="Zaustavi">
              <StopCircle size={15} />
            </button>
          )}
          {!isActive && (
            <button onClick={() => onRemove(item.id)}
              className="p-1.5 rounded-lg hover:text-red-400 transition-colors"
              style={{ color:'rgba(255,255,255,0.3)' }} title="Ukloni">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function Queue({ downloads, setDownloads, onPlay, onTrim, onNavigate }) {
  const { lang } = useApp()
  const [filter, setFilter] = useState('all')
  const [stopping, setStopping] = useState(false)

  const handleCancel = async (id) => {
    await api?.cancelDownload(id)
    setDownloads(prev => prev.map(d => d.id === id ? { ...d, state:'cancelled' } : d))
  }

  const handleRemove = async (id) => {
    await api?.cancelDownload(id).catch(() => {})
    setDownloads(prev => prev.filter(d => d.id !== id))
  }

  const handleClearCompleted = () => {
    setDownloads(prev => prev.filter(d =>
      !['completed','failed','cancelled'].includes(d.state)
    ))
  }

  // Obriši SVE — kills processes + wipes entire list
  const handleClearAll = async () => {
    if (!confirm('Obrisati sve stavke iz liste? Aktivna preuzimanja će biti zaustavljena.')) return
    await api?.clearAll()
    setDownloads([])
  }

  // Stop ALL — kills active + removes queued
  const handleStopAll = async () => {
    setStopping(true)
    await api?.cancelAll()
    setDownloads(prev => prev.map(d =>
      ['downloading','converting','expanding','queued'].includes(d.state)
        ? { ...d, state:'cancelled' }
        : d
    ))
    setStopping(false)
  }

  // Pause All — marks queued items as paused (active ones finish naturally)
  const handlePauseQueue = () => {
    setDownloads(prev => prev.map(d =>
      d.state === 'queued' ? { ...d, state:'paused' } : d
    ))
  }

  // Resume All — un-pause paused items
  const handleResumeQueue = async () => {
    const paused = downloads.filter(d => d.state === 'paused')
    if (!paused.length) return
    setDownloads(prev => prev.map(d =>
      d.state === 'paused' ? { ...d, state:'queued' } : d
    ))
    // Re-add to queue
    await api?.startDownload(paused.map(d => ({ ...d, state:'queued' })))
  }

  const filters = [
    { id:'all',       labelKey:'all' },
    { id:'active',    labelKey:'activeTab' },
    { id:'completed', labelKey:'doneTab' },
    { id:'failed',    labelKey:'failedTab' },
  ]

  const filtered = downloads.filter(d => {
    if (filter === 'all')       return true
    if (filter === 'active')    return ['downloading','converting','queued','expanding','paused'].includes(d.state)
    if (filter === 'completed') return d.state === 'completed'
    if (filter === 'failed')    return ['failed','cancelled'].includes(d.state)
    return true
  })

  const completedCount = downloads.filter(d => d.state === 'completed').length
  const activeCount    = downloads.filter(d => ['downloading','converting','expanding'].includes(d.state)).length
  const queuedCount    = downloads.filter(d => d.state === 'queued').length
  const pausedCount    = downloads.filter(d => d.state === 'paused').length
  const hasActive      = activeCount + queuedCount > 0
  const hasPaused      = pausedCount > 0

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">{t('downloadQueue', lang)}</h1>
          <p className="text-sm mt-1" style={{ color:'rgba(255,255,255,0.4)' }}>
            {downloads.length} {t('total', lang)} · {activeCount} {t('active', lang)} · {completedCount} {t('completed', lang)}
            {pausedCount > 0 && ` · ${pausedCount} pauzirano`}
          </p>
        </div>

        {/* Control buttons */}
        <div className="flex items-center gap-2">
          {/* Pause / Resume */}
          {hasActive && !hasPaused && (
            <button onClick={handlePauseQueue}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background:'rgba(96,165,250,0.15)', color:'#60a5fa', border:'1px solid rgba(96,165,250,0.3)' }}
              title="Pauziraj red čekanja">
              <PauseCircle size={14} /> Pauziraj red
            </button>
          )}
          {hasPaused && (
            <button onClick={handleResumeQueue}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background:'rgba(34,197,94,0.15)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.3)' }}
              title="Nastavi pauzirana preuzimanja">
              <RefreshCw size={14} /> Nastavi
            </button>
          )}

          {/* Stop ALL */}
          {hasActive && (
            <button onClick={handleStopAll} disabled={stopping}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
              style={{ background:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.35)' }}
              title="Zaustavi sve downloade odmah">
              <Square size={14} /> {stopping ? 'Zaustavljam…' : 'Stop sve'}
            </button>
          )}

          {/* Clear finished */}
          {completedCount > 0 && (
            <button onClick={handleClearCompleted}
              className="btn-ghost flex items-center gap-1.5 text-xs py-2">
              <Trash2 size={13} /> Obriši završene
            </button>
          )}

          {/* Clear ALL */}
          {downloads.length > 0 && (
            <button onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background:'rgba(239,68,68,0.1)', color:'#f87171', border:'1px solid rgba(239,68,68,0.25)' }}
              title="Obriši sve iz liste">
              <Trash2 size={13} /> Obriši sve
            </button>
          )}
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-5">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={filter === f.id
              ? { background:'rgba(124,58,237,0.25)', color:'#c4b5fd', border:'1px solid rgba(124,58,237,0.4)' }
              : { background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.08)' }
            }>
            {t(f.labelKey, lang)}
          </button>
        ))}
      </div>

      {/* Items */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="text-5xl opacity-20">📭</div>
          <p className="text-sm" style={{ color:'rgba(255,255,255,0.3)' }}>
            {downloads.length === 0
              ? t('noDownloads', lang)
              : t('noDownloads', lang)}
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {filtered.map(item => (
            <DownloadItem key={item.id} item={item} onCancel={handleCancel} onRemove={handleRemove} onPlay={onPlay} onTrim={onTrim} onNavigate={onNavigate} lang={lang} />
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}
