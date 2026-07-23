import React, { useState, useEffect, useCallback, useRef } from 'react'
import { AppProvider } from './AppContext.jsx'
import Sidebar from './components/Sidebar.jsx'
import TitleBar from './components/TitleBar.jsx'
import Downloader from './components/Downloader.jsx'
import Queue from './components/Queue.jsx'
import Statistics from './components/Statistics.jsx'
import CalendarView from './components/CalendarView.jsx'
import Reminders from './components/Reminders.jsx'
import SettingsView from './components/SettingsView.jsx'
import BatchConvert from './components/BatchConvert.jsx'
import PlaylistView from './components/PlaylistView.jsx'
import SearchView from './components/SearchView.jsx'
import TrimBurnView from './components/TrimBurnView.jsx'
import MediaPlayer from './components/MediaPlayer.jsx'
import { AnimatePresence, motion } from 'framer-motion'

const api = window.acmigo || null
const MAX_CONCURRENT = 3

const VIEW_MAP = {
  download:  Downloader,
  queue:     Queue,
  search:    SearchView,
  trim:      TrimBurnView,
  playlist:  PlaylistView,
  stats:     Statistics,
  calendar:  CalendarView,
  reminders: Reminders,
  convert:   BatchConvert,
  settings:  SettingsView,
}

function Inner() {
  const [view, setView]           = useState('download')
  const [downloads, setDownloads] = useState([])
  const [settings, setSettings]   = useState(null)
  const [ytdlpOk, setYtdlpOk]     = useState(null)
  const [playerFile, setPlayerFile] = useState(null)
  const [trimFile,   setTrimFile]   = useState(null)
  // Track IDs currently running in main process — source of truth for concurrency
  const runningIds = useRef(new Set())

  useEffect(() => {
    if (!api) return
    api.getSettings().then(s => setSettings(s))
    api.ytdlpStatus().then(s => setYtdlpOk(s.installed))
  }, [])

  // Start queued items whenever downloads or runningIds changes
  const tryStartNext = useCallback(() => {
    setDownloads(prev => {
      const slots = MAX_CONCURRENT - runningIds.current.size
      if (slots <= 0) return prev

      const toStart = prev
        .filter(d => d.state === 'queued' && !runningIds.current.has(d.id))
        .slice(0, slots)

      if (toStart.length === 0) return prev

      toStart.forEach(item => {
        runningIds.current.add(item.id)
        api?.startOne(item).catch(() => {
          runningIds.current.delete(item.id)
          setDownloads(p => p.map(d =>
            d.id === item.id ? { ...d, state: 'failed', error: 'Ne mogu pokrenuti' } : d
          ))
        })
      })

      // Mark started items as 'downloading' immediately
      return prev.map(d =>
        toStart.find(s => s.id === d.id) ? { ...d, state: 'downloading' } : d
      )
    })
  }, [])

  // Download events
  useEffect(() => {
    if (!api) return
    const off = api.on('download:event', (evt) => {
      if (!evt || !evt.id) return

      setDownloads(prev => {
        const idx = prev.findIndex(d => d.id === evt.id)
        if (idx < 0) return prev

        const updated = [...prev]
        const item = { ...updated[idx] }
        const wasRunning = ['downloading', 'converting', 'expanding'].includes(item.state)

        switch (evt.type) {
          case 'started':
            item.state = 'downloading'
            break
          case 'progress':
            // Only update progress if item is actually running
            if (wasRunning) {
              item.progress  = evt.percent    ?? item.progress
              item.speed     = evt.speed      ?? item.speed
              item.eta       = evt.eta        ?? item.eta
              item.totalSize = evt.totalSize  ?? item.totalSize
            }
            break
          case 'converting':
            item.state = 'converting'
            break
          case 'destination':
          case 'finalpath':
            item.filePath = evt.filePath
            break
          case 'completed':
            item.state       = 'completed'
            item.progress    = 100
            item.filePath    = evt.filePath ?? item.filePath
            item.completedAt = new Date().toISOString()
            runningIds.current.delete(evt.id)
            break
          case 'error':
          case 'failed':
            // Only update if item isn't already done
            if (!['completed', 'cancelled'].includes(item.state)) {
              item.state = 'failed'
              item.error = evt.message
              runningIds.current.delete(evt.id)
            }
            break
          case 'cancelled':
            item.state = 'cancelled'
            runningIds.current.delete(evt.id)
            break
          default:
            break
        }

        updated[idx] = item
        return updated
      })

      // After a slot opens, try to start next
      if (['completed', 'failed', 'error', 'cancelled'].includes(evt.type)) {
        setTimeout(tryStartNext, 100)
      }
    })
    return off
  }, [tryStartNext])

  // addToQueue
  const addToQueue = useCallback((items) => {
    const fresh = items.map(i => ({ ...i, state: 'queued', progress: 0 }))
    setDownloads(prev => {
      const ids = new Set(prev.map(d => d.id))
      return [...prev, ...fresh.filter(i => !ids.has(i.id))]
    })
    setView('queue')
    setTimeout(tryStartNext, 100)
  }, [tryStartNext])

  const updateSettings = useCallback(async (patch) => {
    const updated = await api?.setSettings(patch)
    if (updated) setSettings(updated)
  }, [])

  const ActiveView = VIEW_MAP[view] || Downloader

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-900)' }}>
      <TitleBar />
      {ytdlpOk === false && (
        <div className="mx-4 mt-2 px-4 py-2.5 rounded-xl text-sm flex items-center gap-3 cursor-pointer"
          style={{ background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', color: '#fbbf24' }}
          onClick={() => setView('settings')}>
          <span>⚠️</span>
          <span><strong>yt-dlp nije instaliran.</strong> Klikni ovdje → Postavke → Instaliraj automatski.</span>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar active={view} onChange={setView} downloads={downloads} />
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={view}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }} className="h-full overflow-y-auto">
              <ActiveView
                downloads={downloads}
                setDownloads={setDownloads}
                settings={settings}
                updateSettings={updateSettings}
                addToQueue={addToQueue}
                onNavigate={setView}
                onPlay={setPlayerFile}
                onTrim={setTrimFile}
                initialFile={view === 'trim' ? trimFile : null}
                ytdlpOk={ytdlpOk}
                setYtdlpOk={setYtdlpOk}
              />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      {/* Media Player Modal */}
      {playerFile && <MediaPlayer filePath={playerFile} onClose={() => setPlayerFile(null)} />}
    </div>
  )
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(e) { return { error: e } }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding:'40px', color:'#f87171', background:'#07071a', height:'100vh', fontFamily:'monospace' }}>
          <h2 style={{ color:'#c4b5fd', marginBottom:'16px' }}>⚠ ACMigo — Greška pri pokretanju</h2>
          <p style={{ marginBottom:'8px', color:'rgba(255,255,255,0.6)' }}>Detalji:</p>
          <pre style={{ fontSize:'12px', color:'#f87171', whiteSpace:'pre-wrap' }}>{String(this.state.error)}</pre>
          <button onClick={() => this.setState({ error: null })}
            style={{ marginTop:'20px', padding:'8px 20px', background:'#7c3aed', color:'white', border:'none', borderRadius:'8px', cursor:'pointer' }}>
            Pokušaj ponovo
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Inner />
      </AppProvider>
    </ErrorBoundary>
  )
}
