import React, { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight, FolderOpen, Trash2, ExternalLink } from 'lucide-react'

const api = window.acmigo

export default function CalendarView() {
  const [history, setHistory] = useState([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    api?.getHistory().then(h => setHistory(h || []))
  }, [])

  // Build a map: date-string -> count
  const countMap = {}
  history.forEach(item => {
    if (item.completedAt) {
      const day = item.completedAt.slice(0, 10)
      countMap[day] = (countMap[day] || 0) + 1
    }
  })

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) })
  const startPad = (days[0].getDay() + 6) % 7 // Monday-start padding

  // Items for selected day or filtered by search
  const selectedDayStr = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : null
  const displayItems = history.filter(item => {
    if (search) return (item.title || item.url).toLowerCase().includes(search.toLowerCase())
    if (selectedDayStr) return item.completedAt?.startsWith(selectedDayStr)
    return true
  }).slice(0, 100)

  const handleClear = async () => {
    if (confirm('Clear all download history?')) {
      await api?.clearHistory()
      setHistory([])
    }
  }

  const removeItem = (id) => setHistory(prev => prev.filter(h => h.id !== id))

  return (
    <div className="p-6 flex gap-5 h-full overflow-hidden">
      {/* Calendar panel */}
      <div className="w-80 shrink-0 flex flex-col gap-4">
        <div className="card">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
              className="p-1.5 rounded-lg hover:text-white transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-white">{format(currentMonth, 'MMMM yyyy')}</span>
            <button
              onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
              className="p-1.5 rounded-lg hover:text-white transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
              <div key={d} className="text-center text-xs py-1 font-medium" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
            {days.map(day => {
              const key = format(day, 'yyyy-MM-dd')
              const count = countMap[key] || 0
              const isSelected = selectedDay && isSameDay(day, selectedDay)
              const isToday = isSameDay(day, new Date())

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className="relative flex flex-col items-center py-1.5 rounded-lg text-xs transition-all duration-150"
                  style={isSelected
                    ? { background: 'rgba(124,58,237,0.35)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.5)' }
                    : isToday
                    ? { background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }
                    : { background: 'transparent', color: count ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)', border: '1px solid transparent' }
                  }
                >
                  <span>{format(day, 'd')}</span>
                  {count > 0 && (
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-0.5"
                      style={{ background: isSelected ? '#c4b5fd' : '#7c3aed' }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="text-xs px-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <p>Total: <strong className="text-white">{history.length}</strong> downloads</p>
          {selectedDay && (
            <p>On {format(selectedDay, 'MMM d')}: <strong className="text-white">{countMap[selectedDayStr] || 0}</strong></p>
          )}
        </div>
      </div>

      {/* History list */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold gradient-text">
            {selectedDay ? `Downloads on ${format(selectedDay, 'MMMM d, yyyy')}` : 'Download History'}
          </h1>
          <button onClick={handleClear} className="btn-ghost text-xs py-1.5 flex items-center gap-1.5" style={{ color: '#f87171' }}>
            <Trash2 size={12} /> Clear All
          </button>
        </div>

        <input
          type="search"
          placeholder="Search history…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field mb-4 text-sm"
        />

        <div className="flex-1 overflow-y-auto pr-1">
          {displayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="text-5xl opacity-20">🗂️</div>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {search ? 'No results found' : selectedDay ? 'No downloads on this day' : 'No history yet'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {displayItems.map(item => (
                <div key={item.id} className="card flex items-center gap-3 py-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base"
                    style={{ background: 'rgba(255,255,255,0.05)' }}
                  >
                    {item.format === 'mp3' ? '🎵' : '🎬'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.title || item.url}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {item.completedAt ? format(new Date(item.completedAt), 'MMM d, HH:mm') : ''}
                      </span>
                      <span className={item.format === 'mp3' ? 'tag-mp3' : 'tag-mp4'}>{(item.format || 'mp4').toUpperCase()}</span>
                      {item.quality && <span className="tag-dl">{item.quality}p</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {item.filePath && (
                      <button
                        onClick={() => api?.showInFolder(item.filePath)}
                        className="p-1.5 rounded-lg hover:text-white transition-colors"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                        title="Show in folder"
                      >
                        <FolderOpen size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => api?.openExternal(item.url)}
                      className="p-1.5 rounded-lg hover:text-white transition-colors"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                      title="Open URL"
                    >
                      <ExternalLink size={14} />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 rounded-lg hover:text-red-400 transition-colors"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
