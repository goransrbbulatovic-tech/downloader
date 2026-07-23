import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Download, RefreshCw, Home, ChevronLeft, ChevronRight,
         Loader2, Search, X, Eye, FileText, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const api = window.acmigo
function uid() { return Math.random().toString(36).slice(2, 10) }

const FORMATS   = ['mp4','mp3','webm','mkv','m4a']
const QUALITIES = ['best','2160','1080','720','480','360']
const HOME_URL  = 'https://www.youtube.com'

const QUICK_SITES = [
  { label:'YouTube',     url:'https://www.youtube.com',              icon:'▶' },
  { label:'Vimeo',       url:'https://vimeo.com',                    icon:'🎬' },
  { label:'TikTok',      url:'https://www.tiktok.com',               icon:'♪' },
  { label:'Instagram',   url:'https://www.instagram.com',            icon:'📸' },
  { label:'Facebook',    url:'https://www.facebook.com/watch',       icon:'👥' },
  { label:'Twitch',      url:'https://www.twitch.tv',                icon:'🟣' },
  { label:'Reddit',      url:'https://www.reddit.com',               icon:'🤖' },
  { label:'Dailymotion', url:'https://www.dailymotion.com',          icon:'🎥' },
  { label:'SoundCloud',  url:'https://soundcloud.com',               icon:'☁' },
  { label:'Twitter/X',   url:'https://x.com',                        icon:'✕' },
]

function isVideoUrl(url) {
  if (!url) return false
  return (
    // YouTube
    /youtube\.com\/watch/.test(url)           ||
    /youtu\.be\/[a-zA-Z0-9_-]/.test(url)      ||
    // TikTok — show on entire site (videos autoplay on feed)
    /tiktok\.com/.test(url)                     ||
    /vm\.tiktok\.com/.test(url)                ||
    // Instagram — show on reels and posts
    /instagram\.com\/(p|reel|tv|stories)\//.test(url) ||
    /instagram\.com\/[^/]+\//.test(url)       ||
    // Facebook
    /facebook\.com\/.+\/videos?\//.test(url) ||
    /fb\.watch\//.test(url)                    ||
    /facebook\.com\/watch/.test(url)           ||
    // Vimeo
    /vimeo\.com\/\d+/.test(url)               ||
    // Twitter/X
    /(twitter|x)\.com\/.+\/status\//.test(url) ||
    // Twitch — show on any channel or video page
    /twitch\.tv\/[a-zA-Z0-9_]+/.test(url)     ||
    // Reddit
    /reddit\.com\/r\/.+\/comments\//.test(url) ||
    // Dailymotion
    /dailymotion\.com\/video\//.test(url)     ||
    /dailymotion\.com\/[^/]+$/.test(url)       ||
    // SoundCloud
    /soundcloud\.com\/.+\/.+/.test(url)
  )
}

function formatDur(sec) {
  if (!sec) return ''
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = Math.floor(sec%60)
  return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`
}
function formatViews(n) {
  if (!n) return ''
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1)+'M'
  if (n >= 1_000) return (n/1_000).toFixed(0)+'K'
  return String(n)
}

// ─── Browser Tab ──────────────────────────────────────────────────────────────
function BrowserTab({ addToQueue }) {
  const webviewRef  = useRef(null)
  const [inputUrl,   setInputUrl]  = useState(HOME_URL)
  const [loading,    setLoading]   = useState(false)
  const [canBack,    setCanBack]   = useState(false)
  const [canFwd,     setCanFwd]    = useState(false)
  const [format,     setFormat]    = useState('mp4')
  const [quality,    setQuality]   = useState('1080')
  const [showDl,     setShowDl]    = useState(false)
  const [curUrl,     setCurUrl]    = useState(null)
  const [pageTitle,  setPageTitle] = useState('')
  const [showQR,     setShowQR]    = useState(false)
  const [qrData,     setQrData]    = useState(null)
  const [copied,       setCopied]      = useState(false)
  const [clipboardUrl, setClipboardUrl] = useState(null)  // URL detected from clipboard
  const lastClipUrl = useRef('')
  const isAudio = format === 'mp3' || format === 'm4a'

  useEffect(() => {
    const wv = webviewRef.current; if (!wv) return
    const checkUrl = (url) => {
      if (!url) return
      setInputUrl(url)
      const isVid = isVideoUrl(url)
      setCurUrl(isVid ? url : null)
      setShowDl(isVid)
    }
    const onStart  = () => setLoading(true)
    const onStop   = () => {
      setLoading(false)
      setCanBack(wv.canGoBack?.() ?? false)
      setCanFwd(wv.canGoForward?.() ?? false)
      const url = wv.getURL?.()
      checkUrl(url)
    }
    const onNav    = (e) => checkUrl(e.url)
    const onTitle  = (e) => {
      const title = e.title || ''
      if (title.startsWith('__ACMIGO_DL__')) {
        const parts = title.replace('__ACMIGO_DL__', '').split('|')
        const url = parts[0]
        const fmt = parts[1] || 'mp4'
        const qual = parts[2] || 'best'
        if (url && url.startsWith('http')) {
          const isAud = fmt === 'mp3' || fmt === 'm4a'
          addToQueue([{
            id: Math.random().toString(36).slice(2),
            url, title: pageTitle || url, format: fmt,
            quality: isAud ? 'best' : qual,
            audioOnly: isAud, state: 'queued', progress: 0
          }])
        }
      } else {
        setPageTitle(title)
      }
    }

    wv.addEventListener('did-start-loading',    onStart)
    wv.addEventListener('did-stop-loading',     onStop)
    wv.addEventListener('did-navigate',         onNav)
    wv.addEventListener('did-navigate-in-page', onNav)
    wv.addEventListener('page-title-updated',   onTitle)
    return () => {
      wv.removeEventListener('did-start-loading',    onStart)
      wv.removeEventListener('did-stop-loading',     onStop)
      wv.removeEventListener('did-navigate',         onNav)
      wv.removeEventListener('did-navigate-in-page', onNav)
      wv.removeEventListener('page-title-updated',   onTitle)
    }
  }, [])

  const navigate = (dest) => {
    const target = dest.startsWith('http') ? dest
      : 'https://www.youtube.com/results?search_query=' + encodeURIComponent(dest)
    webviewRef.current?.loadURL(target)
    setInputUrl(target)
  }

  const download = async () => {
    const wv = webviewRef.current
    // Always get live URL from webview at moment of click
    const liveUrl = wv?.getURL?.() || curUrl
    if (!liveUrl || liveUrl === 'about:blank') return
    const cleanTitle = pageTitle
      .replace(/ [-–] YouTube$/,'').replace(/ [-–] SoundCloud$/,'')
      .replace(/ [-–] TikTok$/,'').replace(/ on Instagram$/,'')
      .replace(/ [-–] Vimeo$/,'').trim() || curUrl

    let downloadUrl = liveUrl

    // For TikTok — extract real video URL from DOM
    if (/tiktok\.com/.test(liveUrl)) {
      try {
        const found = await wv.executeJavaScript(`
          (function() {
            // Method 1: check if URL already has video ID
            if (window.location.pathname.includes('/video/')) {
              return window.location.href;
            }
            // Method 2: find playing video's parent link
            const allVideos = Array.from(document.querySelectorAll('video'));
            for (const v of allVideos) {
              if (!v.paused || v.currentTime > 0) {
                let el = v.parentElement;
                for (let i = 0; i < 10; i++) {
                  if (!el) break;
                  const link = el.querySelector('a[href*="/video/"]');
                  if (link) {
                    const href = link.getAttribute('href');
                    return href.startsWith('http') ? href : 'https://www.tiktok.com' + href;
                  }
                  el = el.parentElement;
                }
              }
            }
            // Method 3: any visible video link in viewport
            const links = Array.from(document.querySelectorAll('a[href*="/video/"]'));
            for (const link of links) {
              const r = link.getBoundingClientRect();
              if (r.top >= -100 && r.top < window.innerHeight) {
                const href = link.getAttribute('href');
                return href.startsWith('http') ? href : 'https://www.tiktok.com' + href;
              }
            }
            // Method 4: use current page URL as-is (might work for some tiktok URLs)
            return window.location.href;
          })()
        `)
        if (found && found !== 'https://www.tiktok.com/') downloadUrl = found
      } catch(e) { /* use original url */ }
    }

    // For Instagram — get specific post/reel URL
    if (/instagram\.com/.test(liveUrl) && !/\/p\/|\/reel\/|\/tv\//.test(liveUrl)) {
      try {
        const found = await wv.executeJavaScript(`
          (function() {
            const link = document.querySelector('a[href*="/reel/"], a[href*="/p/"], a[href*="/tv/"]');
            if (!link) return null;
            const href = link.getAttribute('href');
            return href.startsWith('http') ? href : 'https://www.instagram.com' + href;
          })()
        `)
        if (found) downloadUrl = found
      } catch(e) {}
    }

    addToQueue([{ id:uid(), url:downloadUrl, title:cleanTitle, format,
      quality: isAudio?'best':quality, audioOnly:isAudio, state:'queued', progress:0 }])
    console.log('[ACMigo Download]', downloadUrl)
  }

  const openQR = async () => {
    if (!curUrl) return
    setShowQR(true)
    const res = await api?.generateQR?.(curUrl)
    if (res?.success) setQrData(res.dataUrl)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-2 shrink-0"
        style={{ background:'rgba(0,0,0,0.5)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={()=>webviewRef.current?.goBack()} disabled={!canBack}
          className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-white/10" style={{color:'rgba(255,255,255,0.7)'}}>
          <ChevronLeft size={16}/></button>
        <button onClick={()=>webviewRef.current?.goForward()} disabled={!canFwd}
          className="p-1.5 rounded-lg disabled:opacity-30 hover:bg-white/10" style={{color:'rgba(255,255,255,0.7)'}}>
          <ChevronRight size={16}/></button>
        <button onClick={()=>webviewRef.current?.reload()}
          className="p-1.5 rounded-lg hover:bg-white/10" style={{color:'rgba(255,255,255,0.7)'}}>
          {loading?<Loader2 size={16} className="animate-spin"/>:<RefreshCw size={16}/>}</button>
        <button onClick={()=>navigate(HOME_URL)}
          className="p-1.5 rounded-lg hover:bg-white/10" style={{color:'rgba(255,255,255,0.7)'}}>
          <Home size={16}/></button>
        <input type="text" value={inputUrl} onChange={e=>setInputUrl(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&navigate(inputUrl)}
          className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none"
          style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.8)'}}/>

        {/* Paste & Download */}
        <button onClick={async () => {
            let text = ''
            // Method 1: Electron native clipboard
            try { text = await window.acmigo?.clipboardRead?.() || '' } catch(e) {}
            // Method 2: browser clipboard API
            if (!text) { try { text = await navigator.clipboard.readText() } catch(e) {} }
            // Method 3: check URL bar itself
            if (!text && inputUrl && inputUrl.startsWith('http') && inputUrl !== 'https://www.youtube.com') {
              text = inputUrl
            }
            console.log('[ACMigo Paste] clipboard text:', text)
            if (text && text.startsWith('http')) {
              setClipboardUrl(text)
            } else {
              setClipboardUrl('__empty__')
              setTimeout(() => setClipboardUrl(null), 3000)
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all hover:opacity-80"
          style={{background:'rgba(251,191,36,0.15)',color:'#fbbf24',border:'1px solid rgba(251,191,36,0.35)',whiteSpace:'nowrap'}}>
          📋 Zalijepi link
        </button>
      </div>

      {/* Quick sites */}
      <div className="flex items-center gap-1.5 px-3 py-2 flex-wrap shrink-0"
        style={{background:'rgba(0,0,0,0.25)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        {QUICK_SITES.map(s=>(
          <button key={s.label} onClick={()=>navigate(s.url)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.65)',border:'1px solid rgba(255,255,255,0.1)'}}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Download bar */}
      <AnimatePresence>
        {showDl && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
            className="flex items-center gap-2 px-3 py-2 shrink-0 flex-wrap"
            style={{background:'rgba(124,58,237,0.15)',borderBottom:'1px solid rgba(124,58,237,0.3)'}}>

            <span className="text-xs font-semibold truncate" style={{color:'#c4b5fd',maxWidth:'200px'}}
              title={pageTitle}>
              ⬇ {pageTitle.replace(/ [-–] YouTube$/,'').replace(/ [-–] TikTok$/,'').trim() || 'Preuzmi'}
            </span>

            {/* Formats */}
            <div className="flex gap-1">
              {FORMATS.map(f=>(
                <button key={f} onClick={()=>setFormat(f)}
                  className="px-2 py-1 rounded text-xs font-bold transition-all"
                  style={format===f
                    ?{background:'rgba(124,58,237,0.4)',color:'#c4b5fd',border:'1px solid rgba(124,58,237,0.6)'}
                    :{background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.12)'}}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Quality */}
            {!isAudio && (
              <div className="flex gap-1">
                {QUALITIES.map(q=>(
                  <button key={q} onClick={()=>setQuality(q)}
                    className="px-2 py-1 rounded text-xs font-bold transition-all"
                    style={quality===q
                      ?{background:'rgba(99,102,241,0.4)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.6)'}
                      :{background:'rgba(255,255,255,0.07)',color:'rgba(255,255,255,0.5)',border:'1px solid rgba(255,255,255,0.12)'}}>
                    {q==='best'?'Best':q==='2160'?'4K':q+'p'}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 ml-auto">
              {/* Copy URL — always reads live URL from webview */}
              <button onClick={async () => {
                  const wv = webviewRef.current
                  // Get real-time URL from webview (not cached state)
                  const liveUrl = wv?.getURL?.() || curUrl
                  navigator.clipboard.writeText(liveUrl)
                  setInputUrl(liveUrl)  // also update address bar
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80 transition-all"
                style={{background: copied?'rgba(34,197,94,0.2)':'rgba(255,255,255,0.08)',
                        color: copied?'#4ade80':'rgba(255,255,255,0.6)',
                        border:`1px solid ${copied?'rgba(34,197,94,0.4)':'rgba(255,255,255,0.15)'}`}}>
                {copied ? '✓ Kopirano!' : '📋 Kopiraj link'}
              </button>
              {/* QR button */}
              <button onClick={openQR}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-80"
                style={{background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.6)',border:'1px solid rgba(255,255,255,0.15)'}}>
                📱 QR
              </button>
              {/* Download */}
              <button onClick={download}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold"
                style={{background:'linear-gradient(135deg,#7c3aed,#06b6d4)',color:'white'}}>
                <Download size={13}/> {format.toUpperCase()} {!isAudio?quality+'p':''}
              </button>
              <button onClick={()=>setShowDl(false)} style={{color:'rgba(255,255,255,0.3)'}}>
                <X size={14}/>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="absolute inset-0 z-50 flex items-center justify-center"
            style={{background:'rgba(0,0,0,0.8)'}}
            onClick={()=>{setShowQR(false);setQrData(null)}}>
            <motion.div initial={{scale:0.9}} animate={{scale:1}}
              onClick={e=>e.stopPropagation()}
              className="flex flex-col items-center gap-4 p-6 rounded-2xl"
              style={{background:'#0f0f2e',border:'1px solid rgba(124,58,237,0.5)'}}>
              <p className="text-sm font-semibold" style={{color:'#c4b5fd'}}>📱 Skeniraj telefonom</p>
              {qrData
                ? <img src={qrData} alt="QR" style={{width:200,height:200,borderRadius:12}}/>
                : <div style={{width:200,height:200,display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <Loader2 size={32} className="animate-spin" style={{color:'#7c3aed'}}/>
                  </div>
              }
              <p className="text-xs" style={{color:'rgba(255,255,255,0.4)',textAlign:'center',maxWidth:200}}>
                Skeniraj i link ide direktno u ACMigo
              </p>
              <button onClick={()=>{setShowQR(false);setQrData(null)}}
                className="text-xs px-4 py-2 rounded-lg"
                style={{background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.6)'}}>
                Zatvori
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Webview */}
      <div className="flex-1 relative">
        <webview ref={webviewRef} src={HOME_URL}
          style={{width:'100%',height:'100%',display:'flex'}}
          allowpopups="true" partition="persist:browser"/>
      </div>
    </div>
  )
}

// ─── Grid Search Tab ──────────────────────────────────────────────────────────
const SEARCH_SOURCES = [
  { id:'youtube',     label:'YouTube',    icon:'▶', prefix:'ytsearch15:' },
  { id:'soundcloud',  label:'SoundCloud', icon:'☁', prefix:'scsearch15:' },
  { id:'vimeo',       label:'Vimeo',      icon:'🎬', prefix:'vmsearch15:' },
]

function GridTab({ addToQueue }) {
  const [query,    setQuery]   = useState('')
  const [source,   setSource]  = useState('youtube')
  const [results,  setResults] = useState([])
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState('')
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [formats,  setFormats]  = useState({})
  const [quality,  setQuality]  = useState('1080')
  const inputRef = useRef(null)

  const getFmt = (id) => formats[id] || 'mp4'
  const setFmt = (id, f) => setFormats(prev=>({...prev,[id]:f}))
  const toggleSel = (id) => setSelected(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n})
  const toggleAll = () => selected.size===results.length?setSelected(new Set()):setSelected(new Set(results.map(r=>r.id)))

  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setResults([]); setSearched(true); setSelected(new Set())
    try {
      const res = await api?.searchVideos(query.trim(), source)
      if (!res?.success) setError(res?.error||'Greška pri pretrazi')
      else { setResults(res.results||[]); if (!res.results?.length) setError('Nema rezultata') }
    } catch(e) { setError('Greška: '+e.message) }
    finally { setLoading(false) }
  }

  const downloadSelected = () => {
    const toGet = results.filter(r=>selected.has(r.id))
    if (!toGet.length) return
    addToQueue(toGet.map(r=>{
      const fmt = getFmt(r.id)
      const isAud = fmt==='mp3'||fmt==='m4a'
      return { id:uid(), url:r.url, title:r.title, thumbnail:r.thumbnail,
               format:fmt, quality:isAud?'best':quality, audioOnly:isAud, state:'queued', progress:0 }
    }))
    setSelected(new Set())
  }

  return (
    <div className="p-5 h-full overflow-y-auto">
      {/* Search bar */}
      <div className="card mb-4">
        <div className="flex gap-2 mb-3">
          {SEARCH_SOURCES.map(s=>(
            <button key={s.id} onClick={()=>setSource(s.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={source===s.id
                ?{background:'rgba(124,58,237,0.25)',border:'1px solid rgba(124,58,237,0.5)',color:'#c4b5fd'}
                :{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.4)'}}>
              {s.icon} {s.label}
            </button>
          ))}
          <span className="text-xs ml-2 self-center" style={{color:'rgba(255,255,255,0.25)'}}>
            Za TikTok/Instagram/Facebook koristi Browser tab →
          </span>
        </div>
        <div className="flex gap-2">
          <input ref={inputRef} type="text" value={query}
            onChange={e=>setQuery(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&!loading&&handleSearch()}
            placeholder="Ukucaj šta tražiš…"
            className="input-field flex-1" autoComplete="off"/>
          <button onClick={handleSearch} disabled={loading||!query.trim()}
            className="btn-primary flex items-center gap-2 px-5 disabled:opacity-40">
            {loading?<Loader2 size={16} className="animate-spin"/>:<Search size={16}/>}
            {loading?'Tražim…':'Traži'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm"
          style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#fca5a5'}}>
          {error}
        </div>
      )}

      {/* Bulk actions */}
      {results.length > 0 && (
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <button onClick={toggleAll}
            className="flex items-center gap-1.5 text-xs hover:text-white"
            style={{color:'rgba(255,255,255,0.4)'}}>
            <div className="w-4 h-4 rounded border flex items-center justify-center"
              style={{borderColor:selected.size===results.length?'#7c3aed':'rgba(255,255,255,0.3)',
                      background:selected.size===results.length?'#7c3aed':'transparent'}}>
              {selected.size===results.length&&<span className="text-white text-xs">✓</span>}
            </div>
            {selected.size===results.length?'Odznači sve':'Odaberi sve'}
          </button>
          <span className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>
            {results.length} rezultata · {selected.size} odabrano
          </span>
          <div className="flex gap-1 ml-auto flex-wrap">
            {['best','2160','1080','720','480','360'].map(q=>(
              <button key={q} onClick={()=>setQuality(q)}
                className="px-2 py-1 rounded text-xs font-bold transition-all"
                style={quality===q
                  ?{background:'rgba(99,102,241,0.3)',color:'#a5b4fc',border:'1px solid rgba(99,102,241,0.5)'}
                  :{background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.4)',border:'1px solid rgba(255,255,255,0.1)'}}>
                {q==='best'?'Best':q==='2160'?'4K':q+'p'}
              </button>
            ))}
            <button onClick={()=>{ setQuality('best'); selected.forEach(id=>setFmt(id,'mp3')) }}
              className="px-2 py-1 rounded text-xs font-bold"
              style={{background:'rgba(6,182,212,0.2)',color:'#67e8f9',border:'1px solid rgba(6,182,212,0.4)'}}>
              →MP3
            </button>
          </div>
          {selected.size>0&&(
            <button onClick={downloadSelected}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold"
              style={{background:'linear-gradient(135deg,#7c3aed,#06b6d4)',color:'white'}}>
              <Download size={13}/> Preuzmi odabrane ({selected.size})
            </button>
          )}
        </div>
      )}

      {/* Results */}
      <div className="flex flex-col gap-2">
        {results.map((item,i)=>{
          const isSel=selected.has(item.id), fmt=getFmt(item.id), isAud=fmt==='mp3'||fmt==='m4a'
          return (
            <motion.div key={item.id}
              initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.02}}
              className="flex gap-3 p-3 rounded-xl transition-all"
              style={{background:isSel?'rgba(124,58,237,0.12)':'rgba(255,255,255,0.03)',
                      border:isSel?'1px solid rgba(124,58,237,0.3)':'1px solid rgba(255,255,255,0.06)'}}>
              <div onClick={()=>toggleSel(item.id)}
                className="w-5 h-5 rounded border flex items-center justify-center shrink-0 cursor-pointer mt-1"
                style={{borderColor:isSel?'#7c3aed':'rgba(255,255,255,0.25)',background:isSel?'#7c3aed':'transparent'}}>
                {isSel&&<span className="text-white" style={{fontSize:'11px'}}>✓</span>}
              </div>
              <div className="relative shrink-0 rounded-lg overflow-hidden cursor-pointer"
                onClick={()=>toggleSel(item.id)}
                style={{width:'120px',height:'68px',background:'rgba(0,0,0,0.4)'}}>
                {item.thumbnail
                  ?<img src={item.thumbnail} alt="" className="w-full h-full object-cover"/>
                  :<div className="w-full h-full flex items-center justify-center text-2xl opacity-20">▶</div>}
                {item.duration>0&&(
                  <div className="absolute bottom-1 right-1 px-1 rounded text-white font-bold"
                    style={{background:'rgba(0,0,0,0.8)',fontSize:'10px'}}>
                    {formatDur(item.duration)}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p onClick={()=>toggleSel(item.id)}
                  className="text-sm font-medium text-white line-clamp-2 cursor-pointer mb-1 leading-snug">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 text-xs mb-2" style={{color:'rgba(255,255,255,0.35)'}}>
                  {item.uploader&&<span>{item.uploader}</span>}
                  {item.viewCount>0&&<span className="flex items-center gap-0.5"><Eye size={10}/>{formatViews(item.viewCount)}</span>}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {FORMATS.map(f=>(
                    <button key={f} onClick={()=>setFmt(item.id,f)}
                      className="px-1.5 py-0.5 rounded text-xs font-bold transition-all"
                      style={fmt===f
                        ?{background:'rgba(124,58,237,0.3)',color:'#c4b5fd',border:'1px solid rgba(124,58,237,0.5)'}
                        :{background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.35)',border:'1px solid rgba(255,255,255,0.08)'}}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                  <button onClick={()=>{
                    const f=getFmt(item.id),isA=f==='mp3'||f==='m4a'
                    addToQueue([{id:uid(),url:item.url,title:item.title,thumbnail:item.thumbnail,
                      format:f,quality:isA?'best':quality,audioOnly:isA,state:'queued',progress:0}])
                  }}
                    className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold"
                    style={{background:'rgba(124,58,237,0.2)',color:'#c4b5fd',border:'1px solid rgba(124,58,237,0.35)'}}>
                    <Download size={11}/> Preuzmi
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {!loading&&!searched&&(
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="text-5xl opacity-20">🔍</div>
          <p className="text-sm" style={{color:'rgba(255,255,255,0.3)'}}>Ukucaj šta tražiš i pritisni Enter</p>
        </div>
      )}
    </div>
  )
}

// ─── Features Info Panel ──────────────────────────────────────────────────────
function FeaturesPanel({ addToQueue }) {
  const [scheduleUrl, setScheduleUrl] = useState('')
  const [scheduleTime, setScheduleTime] = useState('02:00')
  const [scheduleFormat, setScheduleFormat] = useState('mp4')
  const [scheduled, setScheduled] = useState([])
  const [importDone, setImportDone] = useState(false)

  const handleSchedule = async () => {
    if (!scheduleUrl.trim()) return
    const [h, m] = scheduleTime.split(':')
    const cronTime = `${m} ${h} * * *`
    const id = uid()
    const items = [{ id: uid(), url: scheduleUrl.trim(), title: scheduleUrl.trim(),
      format: scheduleFormat, quality: '1080', audioOnly: scheduleFormat==='mp3',
      state: 'queued', progress: 0 }]
    await api?.scheduleAdd?.({ id, cronTime, items })
    setScheduled(prev => [...prev, { id, url: scheduleUrl.trim(), time: scheduleTime, format: scheduleFormat }])
    setScheduleUrl('')
  }

  const removeSchedule = async (id) => {
    await api?.scheduleRemove?.(id)
    setScheduled(prev => prev.filter(s => s.id !== id))
  }

  const handleImport = async () => {
    const res = await api?.importUrlList?.()
    if (res?.urls?.length) {
      addToQueue(res.urls.map(url => ({
        id: uid(), url, title: url, format: 'mp4',
        quality: '1080', audioOnly: false, state: 'queued', progress: 0,
      })))
      setImportDone(true)
      setTimeout(() => setImportDone(false), 3000)
    }
  }

  return (
    <div className="p-5 overflow-y-auto h-full">
      <h2 className="text-lg font-bold gradient-text mb-4">⚡ Napredne funkcije</h2>

      {/* Scheduled download */}
      <div className="card mb-4">
        <p className="text-sm font-semibold text-white mb-1 flex items-center gap-2">🌙 Zakazano skidanje</p>
        <p className="text-xs mb-3" style={{color:'rgba(255,255,255,0.4)'}}>Postavi link da se skine automatski u određeno vrijeme</p>
        <div className="flex gap-2 mb-2 flex-wrap">
          <input type="url" value={scheduleUrl} onChange={e=>setScheduleUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="input-field flex-1" style={{minWidth:'200px'}}/>
          <input type="time" value={scheduleTime} onChange={e=>setScheduleTime(e.target.value)}
            className="input-field w-28"
            style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'white',padding:'8px 12px',borderRadius:'10px',outline:'none'}}/>
          <select value={scheduleFormat} onChange={e=>setScheduleFormat(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none"
            style={{background:'#13132e',border:'1px solid rgba(255,255,255,0.15)',color:'white',colorScheme:'dark'}}>
            {FORMATS.map(f=><option key={f} value={f}>{f.toUpperCase()}</option>)}
          </select>
          <button onClick={handleSchedule} disabled={!scheduleUrl.trim()}
            className="btn-primary disabled:opacity-40 flex items-center gap-2">
            <Zap size={14}/> Zakaži
          </button>
        </div>
        {scheduled.length > 0 && (
          <div className="flex flex-col gap-1 mt-2">
            {scheduled.map(s=>(
              <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
                <span className="text-xs" style={{color:'#fbbf24'}}>🕐 {s.time}</span>
                <span className="text-xs text-white truncate flex-1">{s.url}</span>
                <span className="text-xs px-2 py-0.5 rounded" style={{background:'rgba(124,58,237,0.2)',color:'#c4b5fd'}}>{s.format.toUpperCase()}</span>
                <button onClick={()=>removeSchedule(s.id)} style={{color:'rgba(255,255,255,0.3)'}}>
                  <X size={13}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Import list */}
      <div className="card mb-4">
        <p className="text-sm font-semibold text-white mb-1 flex items-center gap-2">📋 Uvezi listu linkova</p>
        <p className="text-xs mb-3" style={{color:'rgba(255,255,255,0.4)'}}>Učitaj .txt fajl sa linkovima (jedan po redu)</p>
        <button onClick={handleImport}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
          style={{background:importDone?'rgba(34,197,94,0.2)':'rgba(255,255,255,0.07)',
                  color:importDone?'#4ade80':'rgba(255,255,255,0.7)',
                  border:`1px solid ${importDone?'rgba(34,197,94,0.4)':'rgba(255,255,255,0.15)'}`}}>
          <FileText size={15}/> {importDone?'✓ Dodano u red!':'Odaberi .txt fajl'}
        </button>
      </div>

      {/* Browser extension */}
      <div className="card mb-4">
        <p className="text-sm font-semibold text-white mb-1">🌐 Chrome ekstenzija</p>
        <p className="text-xs mb-3" style={{color:'rgba(255,255,255,0.4)'}}>
          Klikni dugme u Chromeu → link se direktno pošalje u ACMigo
        </p>
        <div className="text-xs rounded-xl p-3" style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.5)',lineHeight:'1.8'}}>
          1. Otvori <code style={{color:'#c4b5fd'}}>chrome://extensions</code><br/>
          2. Uključi <strong style={{color:'white'}}>Developer mode</strong><br/>
          3. Klikni <strong style={{color:'white'}}>Load unpacked</strong><br/>
          4. Odaberi folder <code style={{color:'#c4b5fd'}}>extension/</code> iz instalacije
        </div>
      </div>

      {/* Auto-update info */}
      <div className="card mb-4">
        <p className="text-sm font-semibold text-white mb-1">🔄 Auto-update yt-dlp</p>
        <p className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>
          yt-dlp se automatski ažurira pri svakom pokretanju programa. Uvijek imaš najnoviju verziju.
        </p>
      </div>

      {/* ID3 tags info */}
      <div className="card">
        <p className="text-sm font-semibold text-white mb-1">🎵 ID3 tagovi</p>
        <p className="text-xs" style={{color:'rgba(255,255,255,0.4)'}}>
          Svaki MP3 koji skineš automatski dobija ID3 tagove — artist, naslov, thumbnail kao cover art.
        </p>
      </div>
    </div>
  )
}

// ─── Main SearchView ──────────────────────────────────────────────────────────
export default function SearchView({ addToQueue }) {
  const [tab, setTab] = useState('grid')
  const tabs = [
    { id:'grid',    label:'🔍 Pretraga' },
    { id:'browser', label:'🌐 Browser' },
    { id:'features',label:'⚡ Funkcije' },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-5 pt-4 shrink-0">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className="px-4 py-2 rounded-t-lg text-sm font-semibold transition-all"
            style={tab===t.id
              ?{background:'rgba(124,58,237,0.2)',color:'#c4b5fd',borderBottom:'2px solid #7c3aed'}
              :{color:'rgba(255,255,255,0.4)',borderBottom:'2px solid transparent'}}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden" style={{borderTop:'1px solid rgba(255,255,255,0.08)'}}>
        {tab==='grid'    && <GridTab addToQueue={addToQueue}/>}
        {tab==='browser' && <BrowserTab addToQueue={addToQueue}/>}
        {tab==='features'&& <FeaturesPanel addToQueue={addToQueue}/>}
      </div>
    </div>
  )
}
