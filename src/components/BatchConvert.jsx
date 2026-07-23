import React, { useState, useRef, useEffect } from 'react'
import { FolderOpen, X, Loader2, Square, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../AppContext.jsx'
import { t } from '../i18n.js'

const api = window.acmigo
const FORMATS = ['mp3', 'mp4', 'mkv', 'webm', 'wav', 'm4a', 'avi', 'mov', 'ts', 'flv', 'wmv', 'ogg']

function uid() { return Math.random().toString(36).slice(2, 10) }

function FormatBadge({ value, onChange }) {
  const isAudio = ['mp3','wav','m4a'].includes(value)
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      onClick={e => e.stopPropagation()}
      className="px-2 py-1 rounded-lg text-xs font-bold outline-none cursor-pointer"
      style={{
        background: isAudio ? 'rgba(6,182,212,0.25)' : 'rgba(99,102,241,0.25)',
        color:      isAudio ? '#67e8f9' : '#818cf8',
        border:     isAudio ? '1px solid rgba(6,182,212,0.5)' : '1px solid rgba(99,102,241,0.5)',
        colorScheme: 'dark',
      }}>
      {FORMATS.map(f => (
        <option key={f} value={f} style={{ background:'#1a1a3e', color:'white' }}>
          {f.toUpperCase()}
        </option>
      ))}
    </select>
  )
}

function ConvertItem({ item, onOpenFolder, onFormatChange, onPlay }) {
  const s = {
    waiting:    { bg:'rgba(148,163,184,0.06)', color:'#94a3b8', label:'Čeka' },
    converting: { bg:'rgba(251,191,36,0.06)',  color:'#fbbf24', label:'Konverzija…' },
    done:       { bg:'rgba(34,197,94,0.06)',   color:'#4ade80', label:'Završeno' },
    failed:     { bg:'rgba(239,68,68,0.06)',   color:'#f87171', label:'Greška' },
    cancelled:  { bg:'rgba(107,114,128,0.06)', color:'#6b7280', label:'Prekinuto' },
  }[item.state] || { bg:'rgba(148,163,184,0.06)', color:'#94a3b8', label:'Čeka' }

  return (
    <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }}
      className="rounded-xl mb-2 overflow-hidden"
      style={{ background:s.bg, border:`1px solid ${s.color}25` }}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white truncate">{item.name}</p>
          {item.outPath && item.state === 'done' && (
            <p className="text-xs mt-0.5 truncate" style={{ color:'rgba(255,255,255,0.3)' }}>
              → {item.outPath.split(/[/\\]/).pop()}
            </p>
          )}
          {item.error && <p className="text-xs mt-0.5 truncate" style={{ color:'#f87171' }}>{item.error}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Per-file format selector — only when waiting */}
          {item.state === 'waiting' && (
            <FormatBadge value={item.format} onChange={v => onFormatChange(item.path, v)} />
          )}
          {item.state === 'converting' && (
            <span className="text-xs font-bold" style={{ color:'#fbbf24' }}>{item.pct || 0}%</span>
          )}
          <span className="text-xs font-medium" style={{ color:s.color }}>{s.label}</span>
          {item.state === 'done' && item.outPath && (
            <div className="flex items-center gap-1">
              <button onClick={() => onPlay && onPlay(item.outPath)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:opacity-80"
                style={{ background:'rgba(124,58,237,0.15)', color:'#c4b5fd', border:'1px solid rgba(124,58,237,0.3)' }}>
                ▶ Play
              </button>
              <button onClick={() => onOpenFolder(item.outPath)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:opacity-80"
                style={{ background:'rgba(34,197,94,0.15)', color:'#4ade80', border:'1px solid rgba(34,197,94,0.3)' }}>
                📂 Folder
              </button>
            </div>
          )}
        </div>
      </div>
      {item.state === 'converting' && (
        <div className="progress-bar mx-4 mb-2.5" style={{ height:'3px' }}>
          <div className="progress-fill" style={{ width:`${item.pct||0}%`, transition:'width 0.3s ease' }} />
        </div>
      )}
    </motion.div>
  )
}

export default function BatchConvert({ onPlay }) {
  const { lang }               = useApp()
  const [files, setFiles]      = useState([])           // raw file paths
  const [defaultFmt, setDFmt]  = useState('mp3')        // default for newly added files
  const [outDir, setOutDir]    = useState('')
  const [running, setRunning]  = useState(false)
  const [items, setItems]      = useState([])            // { path, name, format, state, pct, outPath, error }
  const stopRef                = useRef(false)

  useEffect(() => {
    if (!api) return
    const off = api.on('convert:progress', (data) => {
      setItems(prev => prev.map(i => i.path === data.path ? { ...i, pct: data.pct } : i))
    })
    return off
  }, [])

  const addFiles = async () => {
    const result = await api?.selectFilesForConvert?.()
    if (!result?.length) return
    const newFiles = result.filter(f => !files.includes(f))
    setFiles(prev => [...prev, ...newFiles])
    // Add to items list with default format
    setItems(prev => [
      ...prev,
      ...newFiles.map(f => ({
        path: f, name: f.split(/[/\\]/).pop(),
        format: defaultFmt, state: 'waiting', pct: 0, outPath: null, error: null,
      }))
    ])
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files).map(f => f.path).filter(Boolean)
    const newFiles = dropped.filter(f => !files.includes(f))
    setFiles(prev => [...prev, ...newFiles])
    setItems(prev => [
      ...prev,
      ...newFiles.map(f => ({
        path: f, name: f.split(/[/\\]/).pop(),
        format: defaultFmt, state: 'waiting', pct: 0, outPath: null, error: null,
      }))
    ])
  }

  const removeFile = (path) => {
    setFiles(prev => prev.filter(f => f !== path))
    setItems(prev => prev.filter(i => i.path !== path))
  }

  const updateFormat = (path, fmt) => {
    setItems(prev => prev.map(i => i.path === path ? { ...i, format: fmt } : i))
  }

  const selectOutDir = async () => {
    const dir = await api?.selectDir()
    if (dir) setOutDir(dir)
  }

  const clearAll = () => {
    setFiles([])
    setItems([])
  }

  const handleStop = () => { stopRef.current = true }

  const startConvert = async () => {
    const waiting = items.filter(i => i.state === 'waiting')
    if (!waiting.length) return
    stopRef.current = false
    setRunning(true)

    for (let i = 0; i < waiting.length; i++) {
      if (stopRef.current) {
        setItems(prev => prev.map(x =>
          x.state === 'waiting' ? { ...x, state: 'cancelled' } : x
        ))
        break
      }

      const item = waiting[i]
      setItems(prev => prev.map(x => x.path === item.path ? { ...x, state: 'converting', pct: 0 } : x))

      try {
        const res = await api?.convertFile?.(item.path, item.format, outDir || null)
        if (stopRef.current) {
          setItems(prev => prev.map(x => x.path === item.path ? { ...x, state: 'cancelled' } : x))
          break
        }
        setItems(prev => prev.map(x => x.path === item.path ? {
          ...x,
          state:   res?.success ? 'done' : 'failed',
          outPath: res?.outPath || null,
          error:   res?.error   || null,
          pct:     res?.success ? 100 : 0,
        } : x))
      } catch (e) {
        setItems(prev => prev.map(x => x.path === item.path ? { ...x, state: 'failed', error: e.message } : x))
      }
    }

    setRunning(false)
    stopRef.current = false
  }

  const openFolder = (filePath) => { if (api && filePath) api.showInFolder(filePath) }

  const waitingItems    = items.filter(i => i.state === 'waiting')
  const doneCount       = items.filter(i => i.state === 'done').length
  const failedCount     = items.filter(i => i.state === 'failed').length
  const cancelledCount  = items.filter(i => i.state === 'cancelled').length
  const currentItem     = items.find(i => i.state === 'converting')

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold gradient-text mb-1">{t('batchConvert', lang)}</h1>
      <p className="text-sm mb-5" style={{ color:'rgba(255,255,255,0.4)' }}>
        Svaki fajl može imati svoj format — klikni na oznaku formata da promijeniš
      </p>

      {/* Drop zone */}
      <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={addFiles}
        className="card mb-4 flex flex-col items-center justify-center py-8 gap-3 cursor-pointer"
        style={{ borderStyle:'dashed', borderColor:'rgba(124,58,237,0.4)' }}>
        <FolderOpen size={30} style={{ color:'#7c3aed', opacity:0.7 }} />
        <p className="text-sm" style={{ color:'rgba(255,255,255,0.5)' }}>Klikni ili prevuci fajlove ovdje</p>
        <p className="text-xs" style={{ color:'rgba(255,255,255,0.3)' }}>MP4, MKV, WebM, MP3, M4A, WAV…</p>
      </div>

      {/* Output folder */}
      <div className="card mb-4">
        <p className="text-xs font-semibold mb-2" style={{ color:'rgba(255,255,255,0.4)' }}>{t('outputFolder', lang)}</p>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2 rounded-xl text-xs truncate"
            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                     color: outDir ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)' }}>
            {outDir || t('sameAsSource', lang)}
          </div>
          <button onClick={selectOutDir} className="btn-ghost flex items-center gap-2 py-2 shrink-0 text-xs">
            <FolderOpen size={14} /> Odaberi
          </button>
          {outDir && (
            <button onClick={() => setOutDir('')}
              className="p-2 rounded-xl transition-colors hover:text-red-400"
              style={{ color:'rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Default format + action buttons */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color:'rgba(255,255,255,0.5)' }}>{t('convertTo', lang)}:</span>
          <select value={defaultFmt} onChange={e => setDFmt(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background:'#13132e', border:'1px solid rgba(255,255,255,0.15)', color:'white', colorScheme:'dark' }}>
            {FORMATS.map(f => <option key={f} value={f}>{f.toUpperCase()}</option>)}
          </select>
        </div>

        {!running ? (
          <button onClick={startConvert} disabled={!waitingItems.length}
            className="btn-primary flex items-center gap-2 disabled:opacity-40">
            <RefreshCw size={15} /> Pokreni konverziju
          </button>
        ) : (
          <button onClick={handleStop}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background:'rgba(239,68,68,0.15)', color:'#f87171', border:'1px solid rgba(239,68,68,0.35)' }}>
            <Square size={15} /> Stop
          </button>
        )}

        {items.length > 0 && !running && (
          <button onClick={clearAll} className="text-xs" style={{ color:'rgba(255,255,255,0.3)' }}>
            Obriši listu
          </button>
        )}
      </div>

      {/* Items */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}>
            {/* Status */}
            <div className="flex items-center gap-3 mb-3 text-xs">
              {running && currentItem && (
                <div className="flex items-center gap-2" style={{ color:'#fbbf24' }}>
                  <Loader2 size={12} className="animate-spin" />
                  <span>{currentItem.name} — {currentItem.pct||0}% ({doneCount}/{items.length})</span>
                </div>
              )}
              {!running && (
                <>
                  {doneCount > 0 && <span style={{ color:'#4ade80' }}>✓ {doneCount} završeno</span>}
                  {failedCount > 0 && <span style={{ color:'#f87171' }}>✗ {failedCount} greška</span>}
                  {cancelledCount > 0 && <span style={{ color:'#6b7280' }}>⊘ {cancelledCount} prekinuto</span>}
                  {waitingItems.length > 0 && <span style={{ color:'#94a3b8' }}>⏳ {waitingItems.length} čeka</span>}
                </>
              )}
            </div>

            {items.map((item, i) => (
              <div key={item.path} className="relative">
                <ConvertItem item={item} onOpenFolder={openFolder} onFormatChange={updateFormat} onPlay={onPlay} />
                {item.state === 'waiting' && (
                  <button onClick={() => removeFile(item.path)}
                    className="absolute top-2 right-2 p-1 rounded hover:text-red-400 transition-colors"
                    style={{ color:'rgba(255,255,255,0.2)' }}>
                    <X size={13} />
                  </button>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
