import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { motion } from 'framer-motion'

const api = window.acmigo

export default function QRModal({ url, onClose }) {
  const [qr, setQr] = useState(null)

  useEffect(() => {
    if (!url) return
    // QR points to our local server which sends URL to app
    const payload = `http://127.0.0.1:57432/scan?url=${encodeURIComponent(url)}`
    api?.generateQR?.(payload).then(res => {
      if (res?.success) setQr(res.dataUrl)
    })
  }, [url])

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{background:'rgba(0,0,0,0.7)', backdropFilter:'blur(8px)'}}
      onClick={onClose}>
      <motion.div initial={{scale:0.9}} animate={{scale:1}}
        onClick={e=>e.stopPropagation()}
        className="flex flex-col items-center gap-4 p-6 rounded-2xl"
        style={{background:'#07071a', border:'1px solid rgba(124,58,237,0.4)', boxShadow:'0 24px 80px rgba(0,0,0,0.8)'}}>
        <div className="flex items-center justify-between w-full">
          <p className="text-sm font-semibold text-white">📱 Skeniraj telefonom</p>
          <button onClick={onClose} style={{color:'rgba(255,255,255,0.4)'}}><X size={16}/></button>
        </div>
        {qr
          ? <img src={qr} alt="QR" className="rounded-xl" style={{width:200,height:200}}/>
          : <div className="flex items-center justify-center rounded-xl"
              style={{width:200,height:200,background:'rgba(255,255,255,0.05)'}}>
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"/>
            </div>
        }
        <p className="text-xs text-center" style={{color:'rgba(255,255,255,0.4)', maxWidth:'180px'}}>
          Skeniraj QR i link će se automatski poslati u ACMigo
        </p>
        <p className="text-xs font-mono truncate max-w-xs" style={{color:'rgba(255,255,255,0.3)'}}>{url}</p>
      </motion.div>
    </motion.div>
  )
}
