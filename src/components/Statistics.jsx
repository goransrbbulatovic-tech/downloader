import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { TrendingUp, Film, Music, HardDrive, Download } from 'lucide-react'

const api = window.acmigo

const COLORS = ['#7c3aed', '#06b6d4', '#ec4899', '#f59e0b', '#22c55e', '#6366f1', '#8b5cf6']

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card flex items-center gap-4">
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${color}20`, border: `1px solid ${color}40` }}
      >
        <Icon size={22} style={{ color }} />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</p>
        {sub && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{sub}</p>}
      </div>
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 rounded-lg text-sm"
        style={{ background: '#13132e', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
      >
        <p className="font-medium">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    )
  }
  return null
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0, n = bytes
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++ }
  return `${n.toFixed(1)} ${units[i]}`
}

export default function Statistics({ downloads }) {
  // Build bandwidth data from active downloads speed history
  const [speedLog, setSpeedLog] = useState([])
  useEffect(() => {
    const active = downloads.filter(d => d.speed && d.state === 'downloading')
    if (active.length === 0) return
    const now = new Date()
    const label = now.getHours() + ':' + String(now.getMinutes()).padStart(2,'0')
    // Parse total speed (sum all active)
    const totalMBs = active.reduce((sum, d) => {
      const m = (d.speed || '').match(/([\d.]+)\s*(MiB|MB|KiB|KB)/)
      if (!m) return sum
      let v = parseFloat(m[1])
      if (m[2].startsWith('K')) v /= 1024
      return sum + v
    }, 0)
    setSpeedLog(prev => {
      const next = [...prev, { label, value: parseFloat(totalMBs.toFixed(2)) }]
      return next.slice(-60) // keep last 60 samples
    })
  }, [downloads])
  const [stats, setStats] = useState(null)

  useEffect(() => {
    api?.getStats().then(setStats)
    const interval = setInterval(() => api?.getStats().then(setStats), 5000)
    return () => clearInterval(interval)
  }, [])

  if (!stats) return (
    <div className="p-6 flex items-center justify-center h-full">
      <div className="text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>Loading stats…</div>
    </div>
  )

  // By format pie data
  const formatData = Object.entries(stats.byFormat || {}).map(([name, value]) => ({ name: name.toUpperCase(), value }))

  // By source bar data (top 8)
  const sourceData = Object.entries(stats.bySource || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }))

  // By day line data (last 30 days)
  const now = new Date()
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (29 - i))
    const key = d.toISOString().slice(0, 10)
    return { date: key.slice(5), value: (stats.byDay || {})[key] || 0 }
  })

  // Session stats from in-memory downloads
  const sessionCompleted = downloads.filter(d => d.state === 'completed').length
  const sessionActive = downloads.filter(d => d.state === 'downloading').length

  return (
    <div className="p-6 overflow-y-auto">
      <h1 className="text-2xl font-bold gradient-text mb-5">Statistics</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Download} label="Total Downloads" value={stats.totalDownloads || 0} color="#7c3aed" />
        <StatCard icon={HardDrive} label="Data Downloaded" value={formatSize(stats.totalSize)} color="#06b6d4" />
        <StatCard icon={Film} label="Session Downloads" value={sessionCompleted} sub="this session" color="#ec4899" />
        <StatCard icon={TrendingUp} label="Active Now" value={sessionActive} color="#22c55e" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Activity line chart */}
        <div className="card">
          <p className="text-sm font-semibold text-white mb-4">Downloads (Last 30 Days)</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={last30}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} axisLine={false} interval={6} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="value" name="Downloads" stroke="#7c3aed" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Format pie */}
        <div className="card">
          <p className="text-sm font-semibold text-white mb-4">By Format</p>
          {formatData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={formatData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                  {formatData.map((entry, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={v => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bandwidth today */}
      <div className="card mb-4">
        <p className="text-sm font-semibold text-white mb-4">Brzina preuzimanja (MB/s)</p>
        {speedLog.length < 2 ? (
          <div className="py-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            Pokreni preuzimanje da vidiš grafikon brzine
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={speedLog}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} axisLine={false} interval={Math.floor(speedLog.length/6)} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} axisLine={false} unit=" MB/s" />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="value" name="MB/s" stroke="#06b6d4" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top sources */}
      <div className="card">
        <p className="text-sm font-semibold text-white mb-4">Top Sources</p>
        {sourceData.length === 0 ? (
          <div className="py-8 text-center text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sourceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickLine={false} axisLine={false} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Downloads" radius={[0, 4, 4, 0]}>
                {sourceData.map((entry, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
