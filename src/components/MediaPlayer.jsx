import React, { useState, useRef, useEffect, useCallback } from 'react'
import { X, Play, Pause, Volume2, VolumeX, SkipBack, SkipForward,
         Maximize2, Minimize2, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const api = window.acmigo

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  return `${m}:${String(s).padStart(2,'0')}`
}

const AUDIO_EXTS = ['mp3','m4a','wav','ogg','flac','aac','opus','weba']
const VIDEO_EXTS = ['mp4','webm','mkv','avi','mov','m4v']

function isAudioFile(path) {
  const ext = path.split('.').pop().toLowerCase()
  return AUDIO_EXTS.includes(ext)
}

function isVideoFile(path) {
  const ext = path.split('.').pop().toLowerCase()
  return VIDEO_EXTS.includes(ext)
}

export default function MediaPlayer({ filePath, onClose }) {
  const mediaRef    = useRef(null)
  const progressRef = useRef(null)
  const [playing,   setPlaying]   = useState(false)
  const [current,   setCurrent]   = useState(0)
  const [duration,  setDuration]  = useState(0)
  const [volume,    setVolume]     = useState(1)
  const [muted,     setMuted]      = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [showCtrls,  setShowCtrls] = useState(true)
  const [loading,    setLoading]   = useState(true)
  const [error,      setError]     = useState('')
  const hideTimer   = useRef(null)
  const containerRef = useRef(null)

  const fileName = filePath ? filePath.split(/[/\\]/).pop() : ''
  const isAudio  = filePath ? isAudioFile(filePath) : false
  const isVideo  = filePath ? isVideoFile(filePath) : false

  // Convert file path to file:// URL for Electron
  const fileUrl = filePath ? 'file:///' + filePath.replace(/\\/g, '/').replace(/^\//, '') : ''

  useEffect(() => {
    const el = mediaRef.current
    if (!el) return
    el.volume = volume

    const onLoaded  = () => { setLoading(false); setDuration(el.duration || 0) }
    const onTime    = () => setCurrent(el.currentTime)
    const onEnded   = () => setPlaying(false)
    const onError   = () => { setLoading(false); setError('Ne mogu reproducirati ovaj fajl') }
    const onPlay    = () => setPlaying(true)
    const onPause   = () => setPlaying(false)

    el.addEventListener('loadedmetadata', onLoaded)
    el.addEventListener('timeupdate', onTime)
    el.addEventListener('ended', onEnded)
    el.addEventListener('error', onError)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)

    return () => {
      el.removeEventListener('loadedmetadata', onLoaded)
      el.removeEventListener('timeupdate', onTime)
      el.removeEventListener('ended', onEnded)
      el.removeEventListener('error', onError)
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
    }
  }, [filePath])

  const togglePlay = () => {
    const el = mediaRef.current
    if (!el) return
    playing ? el.pause() : el.play()
  }

  const seek = (e) => {
    const el  = mediaRef.current
    const bar = progressRef.current
    if (!el || !bar || !duration) return
    const rect = bar.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    el.currentTime = pct * duration
  }

  const skip = (sec) => {
    const el = mediaRef.current
    if (!el) return
    el.currentTime = Math.max(0, Math.min(duration, el.currentTime + sec))
  }

  const restart = () => {
    const el = mediaRef.current
    if (!el) return
    el.currentTime = 0
    el.play()
  }

  const changeVolume = (e) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (mediaRef.current) mediaRef.current.volume = v
    if (v === 0) setMuted(true)
    else setMuted(false)
  }

  const toggleMute = () => {
    const el = mediaRef.current
    if (!el) return
    el.muted = !muted
    setMuted(!muted)
  }

  const toggleFullscreen = () => {
    if (!fullscreen) {
      containerRef.current?.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
    setFullscreen(v => !v)
  }

  // Auto-hide controls on video
  const showControls = () => {
    setShowCtrls(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    if (isVideo && playing) {
      hideTimer.current = setTimeout(() => setShowCtrls(false), 3000)
    }
  }

  useEffect(() => {
    if (!isVideo || !playing) { setShowCtrls(true); return }
    hideTimer.current = setTimeout(() => setShowCtrls(false), 3000)
    return () => clearTimeout(hideTimer.current)
  }, [playing, isVideo])

  const progress = duration > 0 ? (current / duration) * 100 : 0

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity:0 }}
        animate={{ opacity:1 }}
        exit={{ opacity:0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)' }}
        onClick={onClose}>

        <motion.div
          ref={containerRef}
          initial={{ scale:0.9, opacity:0 }}
          animate={{ scale:1, opacity:1 }}
          exit={{ scale:0.9, opacity:0 }}
          onClick={e => e.stopPropagation()}
          onMouseMove={showControls}
          className="relative flex flex-col overflow-hidden"
          style={{
            width:  isAudio ? '480px' : '800px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            background: '#07071a',
            borderRadius: '16px',
            border: '1px solid rgba(124,58,237,0.4)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ borderBottom:'1px solid rgba(255,255,255,0.07)', background:'rgba(124,58,237,0.08)' }}>
            <div className="text-lg">{isAudio ? '🎵' : '🎬'}</div>
            <p className="flex-1 text-sm font-medium text-white truncate">{fileName}</p>
            <button onClick={onClose}
              className="p-1.5 rounded-lg hover:text-white transition-colors"
              style={{ color:'rgba(255,255,255,0.4)' }}>
              <X size={16} />
            </button>
          </div>

          {/* Video element */}
          {isVideo && (
            <div className="relative flex-1 flex items-center justify-center"
              style={{ background:'#000', minHeight:'300px' }}
              onClick={togglePlay}>
              <video
                ref={mediaRef}
                src={fileUrl}
                className="max-w-full max-h-full"
                style={{ maxHeight:'60vh' }}
              />
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                </div>
              )}
              {!playing && !loading && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background:'rgba(124,58,237,0.7)', backdropFilter:'blur(4px)' }}>
                    <Play size={28} className="text-white ml-1" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Audio visualizer */}
          {isAudio && (
            <div className="flex items-center justify-center py-10"
              style={{ background:'linear-gradient(135deg,rgba(124,58,237,0.1),rgba(6,182,212,0.1))' }}>
              <audio ref={mediaRef} src={fileUrl} />
              <div className="flex items-end gap-1 h-16">
                {Array.from({length:20}).map((_,i) => (
                  <motion.div key={i}
                    animate={playing ? {
                      height: ['30%','80%','50%','90%','40%','70%','30%'][i%7],
                      transition: { duration: 0.4 + i*0.05, repeat:Infinity, repeatType:'reverse' }
                    } : { height:'20%' }}
                    className="w-2 rounded-full"
                    style={{
                      background: `linear-gradient(to top, #7c3aed, #06b6d4)`,
                      minHeight: '4px',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="px-4 py-8 text-center text-sm" style={{ color:'#f87171' }}>
              {error}<br/>
              <span className="text-xs" style={{ color:'rgba(255,255,255,0.3)' }}>
                Provjeri da li je fajl validan media fajl
              </span>
            </div>
          )}

          {/* Controls */}
          <AnimatePresence>
            {(showCtrls || isAudio || !playing) && (
              <motion.div
                initial={{ opacity:0, y:10 }}
                animate={{ opacity:1, y:0 }}
                exit={{ opacity:0 }}
                className="px-4 py-4 shrink-0"
                style={{ background:'rgba(7,7,26,0.95)', borderTop:'1px solid rgba(255,255,255,0.06)' }}>

                {/* Progress bar */}
                <div className="mb-3">
                  <div ref={progressRef}
                    className="w-full h-1.5 rounded-full cursor-pointer relative group"
                    style={{ background:'rgba(255,255,255,0.1)' }}
                    onClick={seek}>
                    <div className="h-full rounded-full transition-all"
                      style={{ width:`${progress}%`, background:'linear-gradient(90deg,#7c3aed,#06b6d4)' }} />
                    {/* Scrubber dot */}
                    <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ left:`${progress}%`, transform:'translateX(-50%) translateY(-50%)' }} />
                  </div>
                  <div className="flex justify-between mt-1 text-xs" style={{ color:'rgba(255,255,255,0.35)' }}>
                    <span>{formatTime(current)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Buttons row */}
                <div className="flex items-center gap-3">
                  {/* Restart */}
                  <button onClick={restart}
                    className="p-1.5 rounded-lg transition-colors hover:text-white"
                    style={{ color:'rgba(255,255,255,0.4)' }}>
                    <RotateCcw size={16} />
                  </button>

                  {/* Skip back 10s */}
                  <button onClick={() => skip(-10)}
                    className="p-1.5 rounded-lg transition-colors hover:text-white"
                    style={{ color:'rgba(255,255,255,0.4)' }}>
                    <SkipBack size={16} />
                  </button>

                  {/* Play/Pause */}
                  <button onClick={togglePlay}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105"
                    style={{ background:'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
                    {playing
                      ? <Pause size={18} className="text-white" />
                      : <Play size={18} className="text-white ml-0.5" />
                    }
                  </button>

                  {/* Skip forward 10s */}
                  <button onClick={() => skip(10)}
                    className="p-1.5 rounded-lg transition-colors hover:text-white"
                    style={{ color:'rgba(255,255,255,0.4)' }}>
                    <SkipForward size={16} />
                  </button>

                  {/* Spacer */}
                  <div className="flex-1" />

                  {/* Volume */}
                  <button onClick={toggleMute}
                    className="p-1.5 rounded-lg transition-colors hover:text-white"
                    style={{ color:'rgba(255,255,255,0.4)' }}>
                    {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>
                  <input type="range" min="0" max="1" step="0.02"
                    value={muted ? 0 : volume}
                    onChange={changeVolume}
                    className="w-20 accent-purple-500"
                    style={{ accentColor:'#7c3aed' }} />

                  {/* Fullscreen (video only) */}
                  {isVideo && (
                    <button onClick={toggleFullscreen}
                      className="p-1.5 rounded-lg transition-colors hover:text-white"
                      style={{ color:'rgba(255,255,255,0.4)' }}>
                      {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>
                  )}

                  {/* Open in folder */}
                  <button onClick={() => api?.showInFolder(filePath)}
                    className="text-xs px-2.5 py-1.5 rounded-lg transition-all hover:opacity-80"
                    style={{ background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.1)' }}>
                    📂 Folder
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
