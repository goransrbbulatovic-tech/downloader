import React, { useState, useEffect } from 'react'
import { Bell, Plus, Trash2, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { format, isPast, formatDistanceToNow } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'

const api = window.acmigo

export default function Reminders() {
  const [reminders, setReminders] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ message: '', datetime: '', url: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api?.listReminders().then(r => setReminders(r || []))
  }, [])

  // Listen for fired reminders
  useEffect(() => {
    const off = api?.on('reminder:fired', (r) => {
      setReminders(prev => prev.map(x => x.id === r.id ? { ...x, fired: true } : x))
    })
    return off
  }, [])

  const handleAdd = async () => {
    if (!form.message.trim() || !form.datetime) return
    setSaving(true)
    try {
      const r = await api?.addReminder({ message: form.message, datetime: form.datetime, url: form.url })
      if (r) setReminders(prev => [...prev, r])
      setForm({ message: '', datetime: '', url: '' })
      setShowForm(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    await api?.deleteReminder(id)
    setReminders(prev => prev.filter(r => r.id !== id))
  }

  // Default datetime = now + 1 hour
  const defaultDT = () => {
    const d = new Date(Date.now() + 3600000)
    d.setSeconds(0, 0)
    return d.toISOString().slice(0, 16)
  }

  const upcoming = reminders.filter(r => !isPast(new Date(r.datetime))).sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
  const past     = reminders.filter(r => isPast(new Date(r.datetime))).sort((a, b) => new Date(b.datetime) - new Date(a.datetime))

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Reminders</h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Schedule notifications for downloads or anything
          </p>
        </div>
        <button
          onClick={() => { setShowForm(v => !v); if (!form.datetime) setForm(f => ({ ...f, datetime: defaultDT() })) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={15} /> New Reminder
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-5"
          >
            <div className="card flex flex-col gap-3">
              <p className="text-sm font-semibold text-white">New Reminder</p>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Message *</label>
                <input
                  type="text"
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Download that tutorial series…"
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={form.datetime}
                    onChange={e => setForm(f => ({ ...f, datetime: e.target.value }))}
                    className="input-field"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'rgba(255,255,255,0.5)' }}>URL (optional)</label>
                  <input
                    type="url"
                    value={form.url}
                    onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                    placeholder="https://…"
                    className="input-field"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowForm(false)} className="btn-ghost text-sm py-2">Cancel</button>
                <button
                  onClick={handleAdd}
                  disabled={saving || !form.message.trim() || !form.datetime}
                  className="btn-primary text-sm py-2 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Reminder'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="mb-5">
          <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>UPCOMING</p>
          <div className="flex flex-col gap-2">
            {upcoming.map(r => (
              <div key={r.id} className="card flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)' }}
                >
                  <Bell size={16} style={{ color: '#c4b5fd' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{r.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {format(new Date(r.datetime), 'MMM d, yyyy HH:mm')} · in {formatDistanceToNow(new Date(r.datetime))}
                    </span>
                  </div>
                  {r.url && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#818cf8' }}>
                      🔗 {r.url}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="p-1.5 rounded-lg hover:text-red-400 transition-colors shrink-0"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div>
          <p className="text-xs font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>PAST</p>
          <div className="flex flex-col gap-2">
            {past.slice(0, 20).map(r => (
              <div key={r.id} className="card flex items-start gap-3 opacity-50">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <CheckCircle2 size={16} style={{ color: '#4ade80' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">{r.message}</p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {format(new Date(r.datetime), 'MMM d, yyyy HH:mm')}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(r.id)}
                  className="p-1.5 rounded-lg hover:text-red-400 transition-colors"
                  style={{ color: 'rgba(255,255,255,0.2)' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {reminders.length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Bell size={48} style={{ color: 'rgba(255,255,255,0.1)' }} />
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No reminders yet. Create one to stay on top of your downloads!</p>
        </div>
      )}
    </div>
  )
}
