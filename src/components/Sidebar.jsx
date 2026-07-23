import React from 'react'
import {
  Download, ListVideo, BarChart3, CalendarDays,
  Bell, Settings, Wifi, RefreshCw, PictureInPicture2, ListMusic, Search, Scissors
} from 'lucide-react'
import { useApp } from '../AppContext.jsx'
import { t } from '../i18n.js'

const api = window.acmigo

const NAV = [
  { id: 'download',  labelKey: 'downloader', icon: Download },
  { id: 'search',    labelKey: 'Pretraga',    icon: Search,    static: true },
  { id: 'queue',     labelKey: 'queue',       icon: ListVideo },
  { id: 'playlist',  labelKey: 'Playlist',    icon: ListMusic, static: true },
  { id: 'stats',     labelKey: 'stats',       icon: BarChart3 },
  { id: 'calendar',  labelKey: 'history',     icon: CalendarDays },
  { id: 'reminders', labelKey: 'reminders',   icon: Bell },
  { id: 'convert',   labelKey: 'convert',     icon: RefreshCw },
  { id: 'trim',      labelKey: 'Reži / CD/DVD', icon: Scissors, static: true },
]

export default function Sidebar({ active, onChange, downloads }) {
  const { lang } = useApp()
  const activeCount = downloads.filter(d => ['downloading','converting'].includes(d.state)).length
  const queuedCount = downloads.filter(d => d.state === 'queued').length

  return (
    <aside className="flex flex-col w-52 shrink-0 py-3 px-2 gap-1"
      style={{ borderRight:'1px solid rgba(255,255,255,0.06)', background:'rgba(7,7,26,0.8)' }}>

      <div className="flex-1 flex flex-col gap-0.5">
        {NAV.map(item => {
          const Icon = item.icon
          const isActive = active === item.id
          const badge = item.id === 'queue' && (activeCount + queuedCount) > 0
            ? activeCount + queuedCount : null
          const label = item.static ? item.labelKey : t(item.labelKey, lang)

          return (
            <div key={item.id} onClick={() => onChange(item.id)}
              className={`nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={17} />
              <span className="flex-1">{label}</span>
              {badge && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                  style={{ background:'rgba(124,58,237,0.4)', color:'#c4b5fd', border:'1px solid rgba(124,58,237,0.5)' }}>
                  {badge}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {activeCount > 0 && (
        <div className="px-3 py-2 rounded-xl text-xs flex items-center gap-2"
          style={{ background:'rgba(124,58,237,0.12)', border:'1px solid rgba(124,58,237,0.25)', color:'#c4b5fd' }}>
          <Wifi size={13} className="animate-pulse" />
          <span>{activeCount} aktivno</span>
        </div>
      )}

      <button onClick={() => api?.openMini()}
        className="nav-item justify-center gap-2 text-xs"
        style={{ background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.2)' }}>
        <PictureInPicture2 size={15} />
        <span>{t('miniPlayer', lang)}</span>
      </button>

      <div onClick={() => onChange('settings')}
        className={`nav-item ${active === 'settings' ? 'active' : ''}`}>
        <Settings size={17} />
        <span>{t('settings', lang)}</span>
      </div>

      <p className="text-center text-xs px-3 pb-1" style={{ color:'rgba(255,255,255,0.2)' }}>v1.0.0</p>
    </aside>
  )
}
