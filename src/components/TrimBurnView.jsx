import React, { useState, useEffect, useRef } from 'react'
import { Scissors, Usb, FolderOpen, X, Loader2, RefreshCw, Play, Square } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const api = window.acmigo
function uid() { return Math.random().toString(36).slice(2,10) }

function formatBytes(b) {
  if (!b) return '0 B'
  if (b >= 1e9) return (b/1e9).toFixed(1)+' GB'
  if (b >= 1e6) return (b/1e6).toFixed(1)+' MB'
  return (b/1e3).toFixed(0)+' KB'
}

// ─── Trim Tab ─────────────────────────────────────────────────────────────────
function TrimTab({ initialFile }) {
  const [file,      setFile]     = useState(initialFile || null)
  const [startTime, setStart]    = useState('00:00:00')
  const [endTime,   setEnd]      = useState('')
  const [format,    setFormat]   = useState('mp4')
  const [outDir,    setOutDir]   = useState('')
  const [running,   setRunning]  = useState(false)
  const [pct,       setPct]      = useState(0)
  const [result,    setResult]   = useState(null)
  const [error,     setError]    = useState('')
  const videoRef = useRef(null)

  // When a new file is sent from Queue, load it
  useEffect(() => {
    if (initialFile && initialFile !== file) {
      setFile(initialFile)
      setResult(null)
      setError('')
      setPct(0)
      setStart('00:00:00')
      setEnd('')
      const ext = initialFile.split('.').pop().toLowerCase()
      if (['mp3','m4a','wav','ogg','flac'].includes(ext)) setFormat('mp3')
      else setFormat('mp4')
    }
  }, [initialFile])

  const isAudio = ['mp3','m4a','wav','ogg'].includes(format)

  useEffect(() => {
    if (!api) return
    const off = api.on('trim:progress', d => setPct(d.pct||0))
    return off
  }, [])

  const selectFile = async () => {
    const res = await api?.selectFilesForConvert?.()
    if (res?.[0]) {
      setFile(res[0])
      setResult(null)
      setError('')
      setPct(0)
      // Auto-set format based on file extension
      const ext = res[0].split('.').pop().toLowerCase()
      if (['mp3','m4a','wav','ogg','flac'].includes(ext)) setFormat('mp3')
      else setFormat('mp4')
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const f = Array.from(e.dataTransfer.files)[0]?.path
    if (f) { setFile(f); setResult(null); setError('') }
  }

  const selectOutDir = async () => {
    const dir = await api?.selectDir?.()
    if (dir) setOutDir(dir)
  }

  const handleTrim = async () => {
    if (!file) return
    setRunning(true); setError(''); setPct(0); setResult(null)
    const res = await api?.trimFile?.({
      srcPath:   file,
      outPath:   outDir ? require?.('path')?.join(outDir, '') : null,
      startTime, endTime: endTime || null,
      format,
    })
    setRunning(false)
    if (res?.success) setResult(res.outPath)
    else setError(res?.error || 'Greška')
  }

  const FORMATS = ['mp4','mp3','mkv','webm','m4a','wav','ts']

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h2 className="text-xl font-bold gradient-text flex items-center gap-2">
          <Scissors size={20}/> Reži video / audio
        </h2>
        <p className="text-sm mt-1" style={{color:'rgba(255,255,255,0.4)'}}>
          Izreži dio fajla bez gubitka kvaliteta
        </p>
      </div>

      {/* Drop zone */}
      <div onDrop={handleDrop} onDragOver={e=>e.preventDefault()} onClick={selectFile}
        className="card mb-4 flex flex-col items-center justify-center py-8 gap-2 cursor-pointer"
        style={{borderStyle:'dashed', borderColor: file?'rgba(124,58,237,0.5)':'rgba(255,255,255,0.15)'}}>
        {file ? (
          <>
            <div className="text-2xl">🎬</div>
            <p className="text-sm font-medium text-white">{file.split(/[/\\]/).pop()}</p>
            <p className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>Klikni za promjenu fajla</p>
          </>
        ) : (
          <>
            <FolderOpen size={28} style={{color:'rgba(255,255,255,0.3)'}}/>
            <p className="text-sm" style={{color:'rgba(255,255,255,0.4)'}}>Klikni ili prevuci fajl</p>
            <p className="text-xs" style={{color:'rgba(255,255,255,0.25)'}}>MP4, MKV, TS, MP3, WAV…</p>
          </>
        )}
      </div>

      {file && (
        <>
          {/* Time range */}
          <div className="card mb-4">
            <p className="text-xs font-semibold mb-3" style={{color:'rgba(255,255,255,0.4)'}}>VREMENSKI RASPON</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs mb-1.5" style={{color:'rgba(255,255,255,0.5)'}}>Od (početak)</p>
                <input type="text" value={startTime}
                  onChange={e=>setStart(e.target.value)}
                  placeholder="00:00:00"
                  className="input-field w-full text-center font-mono"/>
                <p className="text-xs mt-1" style={{color:'rgba(255,255,255,0.25)'}}>Format: hh:mm:ss ili mm:ss</p>
              </div>
              <div>
                <p className="text-xs mb-1.5" style={{color:'rgba(255,255,255,0.5)'}}>Do (kraj) — ostavi prazno za kraj fajla</p>
                <input type="text" value={endTime}
                  onChange={e=>setEnd(e.target.value)}
                  placeholder="00:01:30"
                  className="input-field w-full text-center font-mono"/>
                <p className="text-xs mt-1" style={{color:'rgba(255,255,255,0.25)'}}>Prazno = do kraja fajla</p>
              </div>
            </div>
          </div>

          {/* Output format + folder */}
          <div className="card mb-4">
            <p className="text-xs font-semibold mb-3" style={{color:'rgba(255,255,255,0.4)'}}>IZLAZNI FORMAT</p>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {FORMATS.map(f=>(
                <button key={f} onClick={()=>setFormat(f)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={format===f
                    ?{background:'rgba(124,58,237,0.3)',color:'#c4b5fd',border:'1px solid rgba(124,58,237,0.5)'}
                    :{background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.1)'}}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2 rounded-xl text-xs"
                style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',
                        color:outDir?'rgba(255,255,255,0.7)':'rgba(255,255,255,0.25)'}}>
                {outDir || 'Isti folder kao originalni'}
              </div>
              <button onClick={selectOutDir} className="btn-ghost text-xs py-2 flex items-center gap-1.5">
                <FolderOpen size={14}/> Odaberi folder
              </button>
              {outDir && <button onClick={()=>setOutDir('')} style={{color:'rgba(255,255,255,0.3)'}}><X size={15}/></button>}
            </div>
          </div>

          {/* Progress */}
          {running && (
            <div className="card mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm" style={{color:'#fbbf24'}}>✂ Režem…</span>
                <span className="text-sm font-bold" style={{color:'#fbbf24'}}>{pct}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{width:pct+'%',transition:'width 0.3s'}}/>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
              className="card mb-4 flex items-center gap-3"
              style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)'}}>
              <span style={{color:'#4ade80'}}>✓</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{color:'#4ade80'}}>Isječak kreiran!</p>
                <p className="text-xs truncate" style={{color:'rgba(255,255,255,0.4)'}}>{result}</p>
              </div>
              <button onClick={()=>api?.showInFolder(result)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80"
                style={{background:'rgba(34,197,94,0.2)',color:'#4ade80',border:'1px solid rgba(34,197,94,0.4)'}}>
                📂 Folder
              </button>
            </motion.div>
          )}

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm"
              style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#fca5a5'}}>
              {error}
            </div>
          )}

          <button onClick={handleTrim} disabled={running}
            className="btn-primary flex items-center gap-2 text-base px-6 py-3 disabled:opacity-40">
            {running
              ? <><Loader2 size={18} className="animate-spin"/> Režem…</>
              : <><Scissors size={18}/> Reži isječak</>
            }
          </button>
        </>
      )}
    </div>
  )
}

// ─── CD/DVD Burn Tab ─────────────────────────────────────────────────────────
function DiscBurnTab() {
  const [drives,     setDrives]    = useState([])
  const [loading,    setLoading]   = useState(false)
  const [selected,   setSelected]  = useState(null)
  const [files,      setFiles]     = useState([])
  const [burning,    setBurning]   = useState(false)
  const [progress,   setProgress]  = useState(null)
  const [done,       setDone]      = useState(false)
  const [error,      setError]     = useState('')
  const [discLabel,  setDiscLabel] = useState('ACMigo_Disc')
  const [burnSpeed,  setBurnSpeed] = useState('0')

  const SPEEDS = [
    { value:'0', label:'Maksimalna (Auto)' },
    { value:'4', label:'4x (Sporije)' },
    { value:'8', label:'8x' },
    { value:'16', label:'16x' },
    { value:'24', label:'24x' },
    { value:'48', label:'48x (Brzo)' },
  ]

  useEffect(() => {
    if (!api) return
    const off = api.on('disc:progress', d => setProgress(d))
    return off
  }, [])

  const refreshDrives = async () => {
    setLoading(true)
    const list = await api?.listDiscDrives?.() || []
    setDrives(list)
    setLoading(false)
    if (list.length && !selected) setSelected(list[0])
  }

  useEffect(() => { refreshDrives() }, [])

  const addFiles = async () => {
    const res = await api?.selectFilesForConvert?.()
    if (res?.length) setFiles(prev => [...prev, ...res.filter(f => !prev.includes(f))])
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const dropped = Array.from(e.dataTransfer.files).map(f=>f.path).filter(Boolean)
    setFiles(prev => [...prev, ...dropped.filter(f=>!prev.includes(f))])
  }

  const totalSize = files.reduce((acc, f) => {
    try { return acc + (require?.('fs')?.statSync?.(f)?.size || 0) } catch { return acc }
  }, 0)

  const handleBurn = async () => {
    if (!files.length || !selected) return
    setBurning(true); setDone(false); setError('')
    setProgress({ pct:0, status:'Priprema...' })
    const res = await api?.burnDisc?.({
      filePaths: files,
      driveLetter: selected.letter,
      burnSpeed: parseInt(burnSpeed),
      discLabel,
    })
    setBurning(false)
    if (res?.success) setDone(true)
    else if (res?.fallback) setError(res.error)
    else setError(res?.error || 'Greška pri narezivanju')
  }

  const selectedDrive = drives.find(d=>d.id===selected?.id) || selected

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-5">
        <h2 className="text-xl font-bold gradient-text flex items-center gap-2">
          <Usb size={20}/> Snimi na USB
        </h2>
        <p className="text-sm mt-1" style={{color:'rgba(255,255,255,0.4)'}}>
          Kopiraj skinute fajlove direktno na USB
        </p>
      </div>

      {/* Drive selector */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold" style={{color:'rgba(255,255,255,0.4)'}}>ODABERI USB DISK</p>
          <button onClick={refreshDrives} disabled={loading}
            className="flex items-center gap-1.5 btn-ghost text-xs py-1.5">
            {loading ? <Loader2 size={13} className="animate-spin"/> : <RefreshCw size={13}/>}
            Osvježi
          </button>
        </div>

        {drives.length === 0 ? (
          <div className="flex items-center gap-3 px-4 py-6 rounded-xl"
            style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)'}}>
            <Usb size={24} style={{color:'rgba(255,255,255,0.2)'}}/>
            <div>
              <p className="text-sm" style={{color:'rgba(255,255,255,0.4)'}}>Nema USB uređaja</p>
              <p className="text-xs" style={{color:'rgba(255,255,255,0.25)'}}>Priključi USB pa klikni Osvježi</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {drives.map(d=>(
              <div key={d.id} onClick={()=>setSelected(d)}
                className="flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all"
                style={{
                  background: selected?.id===d.id?'rgba(124,58,237,0.15)':'rgba(255,255,255,0.04)',
                  border: selected?.id===d.id?'1px solid rgba(124,58,237,0.4)':'1px solid rgba(255,255,255,0.08)',
                }}>
                {/* USB icon */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{background:'rgba(124,58,237,0.2)'}}>
                  <Usb size={20} style={{color:'#c4b5fd'}}/>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">
                    {d.name || 'Removable Disk'} {d.letter && <span style={{color:'rgba(255,255,255,0.4)'}}>({d.letter})</span>}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {d.size > 0 && (
                      <span className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>
                        Ukupno: {formatBytes(d.size)}
                      </span>
                    )}
                    {d.freeSpace > 0 && (
                      <span className="text-xs" style={{color:'#4ade80'}}>
                        Slobodno: {formatBytes(d.freeSpace)}
                      </span>
                    )}
                  </div>
                  {/* Space bar */}
                  {d.size > 0 && (
                    <div className="mt-1.5 h-1.5 rounded-full overflow-hidden"
                      style={{background:'rgba(255,255,255,0.1)'}}>
                      <div className="h-full rounded-full"
                        style={{
                          width: Math.round((1-d.freeSpace/d.size)*100)+'%',
                          background:'linear-gradient(90deg,#7c3aed,#06b6d4)'
                        }}/>
                    </div>
                  )}
                </div>
                {selected?.id===d.id && (
                  <span style={{color:'#c4b5fd',fontSize:'18px'}}>✓</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Files to burn */}
      <div className="card mb-4"
        onDrop={handleDrop} onDragOver={e=>e.preventDefault()}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold" style={{color:'rgba(255,255,255,0.4)'}}>FAJLOVI ZA SNIMANJE</p>
          <button onClick={addFiles} className="btn-ghost text-xs py-1.5 flex items-center gap-1.5">
            <FolderOpen size={13}/> Dodaj fajlove
          </button>
        </div>

        {files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2"
            style={{borderRadius:'12px',border:'2px dashed rgba(255,255,255,0.1)'}}>
            <FolderOpen size={24} style={{color:'rgba(255,255,255,0.2)'}}/>
            <p className="text-sm" style={{color:'rgba(255,255,255,0.35)'}}>Prevuci fajlove ovdje ili klikni Dodaj</p>
          </div>
        ) : (
          <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
            {files.map((f,i)=>(
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{background:'rgba(255,255,255,0.04)'}}>
                <span className="text-xs flex-1 truncate" style={{color:'rgba(255,255,255,0.7)'}}>
                  {f.split(/[/\\]/).pop()}
                </span>
                <button onClick={()=>setFiles(prev=>prev.filter((_,j)=>j!==i))}
                  style={{color:'rgba(255,255,255,0.3)'}}>
                  <X size={13}/>
                </button>
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <button onClick={()=>setFiles([])} className="text-xs mt-2" style={{color:'#f87171'}}>
            Obriši sve
          </button>
        )}
      </div>

      {/* Progress */}
      {burning && progress && (
        <div className="card mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white truncate">{progress.file || 'Kopiram...'}</span>
            <span className="text-sm font-bold shrink-0 ml-2" style={{color:'#c4b5fd'}}>
              {progress.idx+1}/{progress.total}
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{width:progress.pct+'%',transition:'width 0.3s'}}/>
          </div>
          <p className="text-xs mt-1" style={{color:'rgba(255,255,255,0.3)'}}>{progress.pct}% završeno</p>
        </div>
      )}

      {done && (
        <motion.div initial={{opacity:0}} animate={{opacity:1}}
          className="card mb-4 flex items-center gap-3"
          style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)'}}>
          <span className="text-2xl">✅</span>
          <div>
            <p className="text-sm font-semibold" style={{color:'#4ade80'}}>Snimanje završeno!</p>
            <p className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>
              {files.length} fajl(ova) kopirano na {selectedDrive?.name || 'USB'}
            </p>
          </div>
        </motion.div>
      )}

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#fca5a5'}}>
          {error}
        </div>
      )}

      {/* Burn button */}
      <button onClick={handleBurn}
        disabled={burning || !files.length || !selected || drives.length===0}
        className="btn-primary flex items-center gap-2 text-base px-6 py-3 disabled:opacity-40">
        {burning
          ? <><Loader2 size={18} className="animate-spin"/> Snimujem na USB…</>
          : <><Usb size={18}/> Snimi na USB {selectedDrive ? `(${selectedDrive.letter||selectedDrive.name})` : ''}</>
        }
      </button>
    </div>
  )
}

// ─── Main TrimBurnView ────────────────────────────────────────────────────────
export default function TrimBurnView({ initialFile }) {
  const [tab, setTab] = useState('trim')
  useEffect(() => { if (initialFile) setTab('trim') }, [initialFile])
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-5 pt-4 shrink-0">
        {[
          { id:'trim', label:'✂ Reži isječak' },
          { id:'disc', label:'💿 CD/DVD' },
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className="px-4 py-2 rounded-t-lg text-sm font-semibold transition-all"
            style={tab===t.id
              ?{background:'rgba(124,58,237,0.2)',color:'#c4b5fd',borderBottom:'2px solid #7c3aed'}
              :{color:'rgba(255,255,255,0.4)',borderBottom:'2px solid transparent'}}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto" style={{borderTop:'1px solid rgba(255,255,255,0.08)'}}>
        {tab==='trim' && <TrimTab initialFile={initialFile}/>}
        {tab==='disc' && <DiscBurnTab/>}
      </div>
    </div>
  )
}
