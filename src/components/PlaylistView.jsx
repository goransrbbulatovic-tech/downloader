import React, { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Download, Loader2, X, Play, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const api = window.acmigo
const STORAGE_KEY = 'acmigo_mylist_v2'

function uid() { return Math.random().toString(36).slice(2, 10) }

function cleanUrl(raw) {
  try {
    const u = new URL(raw.trim())
    ;['list','index','start_radio','ab_channel'].forEach(p => u.searchParams.delete(p))
    return u.toString()
  } catch { return raw.trim() }
}

const FORMATS  = ['mp4','mp3','webm','mkv','wav','m4a']
const QUALITIES = ['best','2160','1080','720','480','360']

function FormatPicker({ value, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {FORMATS.map(f => (
        <button key={f} onClick={() => onChange(f)}
          className="px-2 py-0.5 rounded text-xs font-semibold transition-all"
          style={value === f
            ? { background:'rgba(124,58,237,0.35)', color:'#c4b5fd', border:'1px solid rgba(124,58,237,0.6)' }
            : { background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.1)' }
          }>
          {f.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

function QualityPicker({ value, onChange, disabled }) {
  if (disabled) return null
  return (
    <div className="flex gap-1 flex-wrap">
      {QUALITIES.map(q => (
        <button key={q} onClick={() => onChange(q)}
          className="px-2 py-0.5 rounded text-xs font-semibold transition-all"
          style={value === q
            ? { background:'rgba(99,102,241,0.3)', color:'#a5b4fc', border:'1px solid rgba(99,102,241,0.5)' }
            : { background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.35)', border:'1px solid rgba(255,255,255,0.08)' }
          }>
          {q === 'best' ? 'Best' : q + 'p'}
        </button>
      ))}
    </div>
  )
}

export default function PlaylistView({ addToQueue, downloads, onPlay }) {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
  })
  const [newUrl, setNewUrl]     = useState('')
  const [fetching, setFetching] = useState(false)
  const [error, setError]       = useState('')
  const [expanded, setExpanded]   = useState(new Set()) // IDs with format picker open
  const [outDir, setOutDir]       = useState('')
  const inputRef    = useRef(null)



  const selectOutDir = async () => {
    const dir = await api?.selectDir()
    if (dir) setOutDir(dir)
  }

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const handleAdd = async () => {
    const raw = newUrl.trim()
    if (!raw || !raw.startsWith('http')) { setError('Unesi validan link'); return }
    setError('')
    setFetching(true)
    const url = cleanUrl(raw)
    if (items.find(i => i.url === url)) { setError('Ovaj link je već u listi'); setFetching(false); return }

    let title = url
    try { const info = await api?.getVideoInfo(url); if (info?.title) title = info.title } catch {}

    setItems(prev => [...prev, {
      id: uid(), url, title,
      format: 'mp4', quality: '1080',   // default per-item
    }])
    setNewUrl('')
    setFetching(false)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const updateItem = (id, patch) => setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i))
  const removeItem = (id) => {
    setItems(prev => prev.filter(i => i.id !== id))
    setTimeout(() => inputRef.current?.focus(), 50)
  }
  const clearAll = () => {
    setItems([])
    setTimeout(() => inputRef.current?.focus(), 50)
  }
  const toggleExpand = (id) => setExpanded(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
  })

  // Selection
  const [selected, setSelected] = useState(new Set())
  const toggleSel = (id) => setSelected(prev => { const n = new Set(prev); n.has(id)?n.delete(id):n.add(id); return n })
  const toggleAll = () => selected.size === items.length ? setSelected(new Set()) : setSelected(new Set(items.map(i=>i.id)))
  const allSelected = items.length > 0 && selected.size === items.length

  const startDownload = (toDownload) => {
    if (!toDownload.length) { setError('Odaberi bar jedan video'); return }
    const qItems = toDownload.map(i => ({
      id: uid(), url: i.url, title: i.title,
      format: i.format, quality: i.format === 'mp3' ? 'best' : i.quality,
      audioOnly: i.format === 'mp3', state: 'queued', progress: 0,
      outDir: outDir || null,
    }))
    addToQueue(qItems)
    setSelected(new Set())
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const getStatus = (url) => downloads.find(d => d.url === url)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold gradient-text">📋 Moja Lista</h1>
        <p className="text-sm mt-1" style={{ color:'rgba(255,255,255,0.4)' }}>
          Svaki video ima svoj format i kvalitet — ostaju dok ih sam ne obrišeš
        </p>
      </div>

      {/* Add URL */}
      <div className="card mb-4">
        <p className="text-sm font-semibold text-white mb-3">Dodaj video link</p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="url"
            value={newUrl}
            onChange={e => { setNewUrl(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && !fetching && handleAdd()}
            placeholder="https://youtube.com/watch?v=..."
            className="input-field flex-1"
            disabled={fetching}
            autoComplete="off"
          />
          <button
            onClick={handleAdd}
            disabled={fetching || !newUrl.trim()}
            className="btn-primary flex items-center gap-2 shrink-0 disabled:opacity-40 px-4">
            {fetching ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {fetching ? 'Učitavam...' : 'Dodaj'}
          </button>
        </div>
        {error && <p className="text-xs mt-2" style={{ color:'#f87171' }}>{error}</p>}
        <p className="text-xs mt-2" style={{ color:'rgba(255,255,255,0.2)' }}>
          💡 &list= se automatski uklanja — dodaje se samo taj jedan video
        </p>
      </div>

      {/* Output folder */}
      <div className="card mb-4">
        <p className="text-xs font-semibold mb-2" style={{ color:'rgba(255,255,255,0.4)' }}>
          FOLDER ZA SNIMANJE
        </p>
        <div className="flex gap-2">
          <div className="flex-1 px-3 py-2 rounded-xl text-xs truncate"
            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
                     color: outDir ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)' }}>
            {outDir || 'Podrazumjevani Downloads folder'}
          </div>
          <button onClick={selectOutDir}
            className="btn-ghost flex items-center gap-2 py-2 shrink-0 text-xs">
            📁 Odaberi
          </button>
          {outDir && (
            <button onClick={() => setOutDir('')}
              className="p-2 rounded-xl hover:text-red-400 transition-colors"
              style={{ color:'rgba(255,255,255,0.3)', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)' }}>
              ✕
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="text-5xl opacity-20">📋</div>
          <p className="text-sm" style={{ color:'rgba(255,255,255,0.3)' }}>
            Lista je prazna. Dodaj YouTube linkove gore.
          </p>
        </div>
      ) : (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2"
            onMouseDown={e => { e.preventDefault(); inputRef.current?.focus() }}>
            <div className="flex items-center gap-2">
              <button onClick={toggleAll}
                className="flex items-center gap-1.5 text-xs transition-colors hover:text-white"
                style={{ color:'rgba(255,255,255,0.4)' }}>
                <div className="w-4 h-4 rounded border flex items-center justify-center"
                  style={{ borderColor:allSelected?'#7c3aed':'rgba(255,255,255,0.3)', background:allSelected?'#7c3aed':'transparent' }}>
                  {allSelected && <span className="text-white text-xs">✓</span>}
                </div>
                {allSelected ? 'Odznači sve' : 'Odaberi sve'}
              </button>
              <span className="text-xs" style={{ color:'rgba(255,255,255,0.3)' }}>
                {items.length} videa · {selected.size} odabrano
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selected.size > 0 && (
                <button onClick={() => startDownload(items.filter(i=>selected.has(i.id)))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background:'rgba(124,58,237,0.25)', border:'1px solid rgba(124,58,237,0.5)', color:'#c4b5fd' }}>
                  <Download size={13} /> Skini odabrane ({selected.size})
                </button>
              )}
              <button onClick={() => startDownload(items)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background:'rgba(34,197,94,0.15)', border:'1px solid rgba(34,197,94,0.3)', color:'#4ade80' }}>
                <Play size={13} /> Skini sve ({items.length})
              </button>
              <button onClick={clearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171' }}>
                <Trash2 size={13} /> Obriši sve
              </button>
            </div>
          </div>

          {/* Items — onMouseDown prevents stealing focus from input */}
          <div className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {items.map((item, i) => {
                const dl      = getStatus(item.url)
                const isSel   = selected.has(item.id)
                const isOpen  = expanded.has(item.id)
                const isAudio = item.format === 'mp3' || item.format === 'wav' || item.format === 'm4a'

                return (
                  <motion.div key={item.id} layout
                    initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, x:30 }}
                    className="rounded-xl overflow-hidden"
                    style={{
                      background: isSel ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.03)',
                      border: isSel ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(255,255,255,0.06)',
                    }}>
                    {/* Main row */}
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      {/* Checkbox */}
                      <div onClick={() => toggleSel(item.id)}
                        className="w-5 h-5 rounded border flex items-center justify-center shrink-0 cursor-pointer"
                        style={{ borderColor:isSel?'#7c3aed':'rgba(255,255,255,0.25)', background:isSel?'#7c3aed':'transparent' }}>
                        {isSel && <span className="text-white" style={{ fontSize:'11px' }}>✓</span>}
                      </div>

                      {/* Number */}
                      <span className="text-xs shrink-0" style={{ color:'rgba(255,255,255,0.25)', minWidth:'22px' }}>
                        {i+1}.
                      </span>

                      {/* Title — click to select */}
                      <p onClick={() => toggleSel(item.id)}
                        className="text-sm text-white truncate flex-1 cursor-pointer">{item.title}</p>

                      {/* Format badge */}
                      <button onClick={() => toggleExpand(item.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold shrink-0 transition-all"
                        style={{
                          background: isAudio ? 'rgba(6,182,212,0.2)' : 'rgba(99,102,241,0.2)',
                          color:      isAudio ? '#67e8f9' : '#818cf8',
                          border:     isAudio ? '1px solid rgba(6,182,212,0.4)' : '1px solid rgba(99,102,241,0.4)',
                        }}>
                        {item.format.toUpperCase()}
                        {!isAudio && <span style={{ opacity:0.7, fontSize:'10px' }}>{item.quality === 'best' ? '' : ' '+item.quality+'p'}</span>}
                        <ChevronDown size={11} style={{ opacity:0.7, transform: isOpen?'rotate(180deg)':'none', transition:'transform 0.2s' }} />
                      </button>

                      {/* Download status */}
                      {dl && (
                        <span className="text-xs shrink-0 px-2 py-0.5 rounded-full font-medium"
                          style={{
                            background: dl.state==='completed'?'rgba(34,197,94,0.15)':dl.state==='failed'?'rgba(239,68,68,0.15)':dl.state==='downloading'?'rgba(251,191,36,0.15)':'rgba(148,163,184,0.15)',
                            color:      dl.state==='completed'?'#4ade80':dl.state==='failed'?'#f87171':dl.state==='downloading'?'#fbbf24':'#94a3b8',
                          }}>
                          {dl.state==='completed'?'✓':dl.state==='failed'?'✗':dl.state==='downloading'?`${(dl.progress||0).toFixed(0)}%`:dl.state==='queued'?'⏳':dl.state}
                        </span>
                      )}

                      {/* Remove */}
                      <button onClick={() => removeItem(item.id)}
                        className="p-1 rounded-lg hover:text-red-400 transition-colors shrink-0"
                        style={{ color:'rgba(255,255,255,0.2)' }}>
                        <X size={14} />
                      </button>
                    </div>

                    {/* Expandable format/quality picker */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
                          className="overflow-hidden">
                          <div className="px-4 pb-3 pt-1 flex flex-col gap-2"
                            style={{ borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                            <div>
                              <p className="text-xs mb-1.5" style={{ color:'rgba(255,255,255,0.35)' }}>FORMAT</p>
                              <FormatPicker value={item.format} onChange={v => updateItem(item.id, { format:v, quality: v==='mp3'||v==='wav'||v==='m4a' ? 'best' : item.quality })} />
                            </div>
                            {!isAudio && (
                              <div>
                                <p className="text-xs mb-1.5" style={{ color:'rgba(255,255,255,0.35)' }}>KVALITET</p>
                                <QualityPicker value={item.quality} onChange={v => updateItem(item.id, { quality:v })} />
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  )
}
