import React from 'react'

export default function TitleBar() {
  const api = window.acmigo

  return (
    <div
      className="flex items-center justify-between px-4 h-11 shrink-0 select-none"
      style={{
        background: 'rgba(7,7,26,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        WebkitAppRegion: 'drag',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5" style={{ WebkitAppRegion: 'no-drag' }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}
        >
          ▼
        </div>
        <span className="text-sm font-semibold text-white">ACMigo Video Downloader Pro</span>
      </div>

      {/* Window controls */}
      <div className="flex items-center gap-1.5" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={() => api?.minimize()}
          className="w-3 h-3 rounded-full transition-opacity hover:opacity-80"
          style={{ background: '#f59e0b' }}
          title="Minimize"
        />
        <button
          onClick={() => api?.maximize()}
          className="w-3 h-3 rounded-full transition-opacity hover:opacity-80"
          style={{ background: '#22c55e' }}
          title="Maximize"
        />
        <button
          onClick={() => api?.close()}
          className="w-3 h-3 rounded-full transition-opacity hover:opacity-80"
          style={{ background: '#ef4444' }}
          title="Close"
        />
      </div>
    </div>
  )
}
