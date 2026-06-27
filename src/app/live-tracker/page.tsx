'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

/* ═══════════════════════════════════════════════════════════
   LIVE TRACKER — zelfstandige real-time dashboard pagina
   Werkt direct in de browser zonder backend.
   - Live klok
   - Live-updatende statistieken (online, actieve sessies)
   - Live activiteitenfeed
   - Live sparkline grafiek
   - Werkende sessie-stopwatch met rondes
═══════════════════════════════════════════════════════════ */

type Activity = {
  id: number
  user: string
  action: string
  time: Date
  color: string
}

type Stat = {
  label: string
  value: number
  unit?: string
  trend: number
  color: string
}

const NAMES = [
  'Sanne', 'Daan', 'Emma', 'Lucas', 'Noor', 'Finn', 'Mila',
  'Sem', 'Tess', 'Liam', 'Saar', 'Bram', 'Eva', 'Jens',
]
const ACTIONS = [
  'startte een sessie',
  'voltooide een oefening',
  'behaalde een streak',
  'verdiende 50 punten',
  'sloot zich aan',
  'haalde level 4',
  'beantwoordde een quiz',
  'bekeek de agenda',
]
const COLORS = ['#2563EB', '#16A34A', '#DC2626', '#9333EA', '#EA580C', '#0891B2']

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString('nl-NL', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function fmtDuration(ms: number) {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

export default function LiveTrackerPage() {
  const [now, setNow] = useState<Date>(new Date())
  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState<Stat[]>([
    { label: 'Online nu', value: 42, unit: '', trend: 0, color: '#16A34A' },
    { label: 'Actieve sessies', value: 18, unit: '', trend: 0, color: '#2563EB' },
    { label: 'Acties / min', value: 73, unit: '', trend: 0, color: '#9333EA' },
    { label: 'Gem. responstijd', value: 120, unit: 'ms', trend: 0, color: '#EA580C' },
  ])
  const [feed, setFeed] = useState<Activity[]>([])
  const [series, setSeries] = useState<number[]>(
    Array.from({ length: 40 }, () => 50 + Math.round(Math.random() * 40)),
  )

  // Stopwatch state
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [laps, setLaps] = useState<number[]>([])
  const startRef = useRef<number>(0)
  const baseRef = useRef<number>(0)

  const idRef = useRef(0)

  useEffect(() => setMounted(true), [])

  // Live klok (1s)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Live stats + grafiek (elke 2s)
  useEffect(() => {
    const t = setInterval(() => {
      setStats((prev) =>
        prev.map((s) => {
          const delta = Math.round((Math.random() - 0.45) * (s.label.includes('respons') ? 14 : 6))
          const next = Math.max(0, s.value + delta)
          return { ...s, value: next, trend: delta }
        }),
      )
      setSeries((prev) => {
        const next = [...prev.slice(1), 40 + Math.round(Math.random() * 60)]
        return next
      })
    }, 2000)
    return () => clearInterval(t)
  }, [])

  // Live feed (elke 1.6s)
  useEffect(() => {
    const t = setInterval(() => {
      const item: Activity = {
        id: idRef.current++,
        user: pick(NAMES),
        action: pick(ACTIONS),
        time: new Date(),
        color: pick(COLORS),
      }
      setFeed((prev) => [item, ...prev].slice(0, 25))
    }, 1600)
    return () => clearInterval(t)
  }, [])

  // Stopwatch ticker
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => {
      setElapsed(baseRef.current + (Date.now() - startRef.current))
    }, 50)
    return () => clearInterval(t)
  }, [running])

  const toggleRun = useCallback(() => {
    if (running) {
      baseRef.current = baseRef.current + (Date.now() - startRef.current)
      setRunning(false)
    } else {
      startRef.current = Date.now()
      setRunning(true)
    }
  }, [running])

  const reset = useCallback(() => {
    setRunning(false)
    setElapsed(0)
    baseRef.current = 0
    setLaps([])
  }, [])

  const addLap = useCallback(() => {
    setLaps((prev) => [elapsed, ...prev])
  }, [elapsed])

  // Sparkline path
  const W = 100
  const H = 100
  const max = Math.max(...series, 1)
  const min = Math.min(...series, 0)
  const range = max - min || 1
  const points = series.map((v, i) => {
    const x = (i / (series.length - 1)) * W
    const y = H - ((v - min) / range) * (H - 8) - 4
    return `${x.toFixed(2)},${y.toFixed(2)}`
  })
  const linePath = `M ${points.join(' L ')}`
  const areaPath = `${linePath} L ${W},${H} L 0,${H} Z`

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-100 font-sans">
      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.8)} }
        @keyframes slide-in { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        .feed-item { animation: slide-in .35s ease both; }
        .live-dot { animation: pulse-dot 1.4s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0B1120]/90 backdrop-blur z-10">
        <div className="flex items-center gap-3">
          <span className="live-dot inline-block w-3 h-3 rounded-full bg-green-400 shadow-[0_0_12px] shadow-green-400" />
          <h1 className="text-xl font-semibold tracking-tight">Live Tracker</h1>
          <span className="text-xs uppercase tracking-widest text-green-400/80 border border-green-400/30 rounded-full px-2 py-0.5">
            Live
          </span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono tabular-nums">
            {mounted ? fmtTime(now) : '--:--:--'}
          </div>
          <div className="text-xs text-slate-400">
            {mounted ? now.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Stats grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur transition hover:bg-white/10"
            >
              <div className="text-xs text-slate-400 mb-2">{s.label}</div>
              <div className="flex items-end gap-2">
                <span
                  className="text-3xl font-bold tabular-nums"
                  style={{ color: s.color }}
                >
                  {s.value}
                </span>
                {s.unit && <span className="text-sm text-slate-400 mb-1">{s.unit}</span>}
              </div>
              <div
                className={`text-xs mt-2 font-medium ${
                  s.trend > 0 ? 'text-green-400' : s.trend < 0 ? 'text-red-400' : 'text-slate-500'
                }`}
              >
                {s.trend > 0 ? '▲' : s.trend < 0 ? '▼' : '■'} {Math.abs(s.trend)}{' '}
                <span className="text-slate-500">t.o.v. vorige</span>
              </div>
            </div>
          ))}
        </section>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chart + Stopwatch */}
          <section className="lg:col-span-2 space-y-6">
            {/* Live chart */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Activiteit per interval</h2>
                <span className="text-xs text-slate-400">laatste {series.length} metingen</span>
              </div>
              <div className="relative h-48">
                <svg
                  viewBox={`0 0 ${W} ${H}`}
                  preserveAspectRatio="none"
                  className="w-full h-full"
                >
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563EB" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={areaPath} fill="url(#grad)" />
                  <path
                    d={linePath}
                    fill="none"
                    stroke="#60A5FA"
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
            </div>

            {/* Stopwatch / sessie-tracker */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
              <h2 className="font-semibold mb-4">Sessie-tracker</h2>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="text-5xl font-mono tabular-nums tracking-tight">
                  {fmtDuration(elapsed)}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={toggleRun}
                    className={`px-5 py-2.5 rounded-xl font-medium transition ${
                      running
                        ? 'bg-red-500/90 hover:bg-red-500 text-white'
                        : 'bg-green-500/90 hover:bg-green-500 text-white'
                    }`}
                  >
                    {running ? 'Pauze' : 'Start'}
                  </button>
                  <button
                    onClick={addLap}
                    disabled={!running}
                    className="px-5 py-2.5 rounded-xl font-medium bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Ronde
                  </button>
                  <button
                    onClick={reset}
                    className="px-5 py-2.5 rounded-xl font-medium bg-white/10 hover:bg-white/20 transition"
                  >
                    Reset
                  </button>
                </div>
              </div>
              {laps.length > 0 && (
                <ul className="mt-4 space-y-1 max-h-40 overflow-y-auto">
                  {laps.map((l, i) => (
                    <li
                      key={i}
                      className="flex justify-between text-sm font-mono text-slate-300 border-b border-white/5 py-1"
                    >
                      <span className="text-slate-500">Ronde {laps.length - i}</span>
                      <span>{fmtDuration(l)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Live feed */}
          <section className="rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <span className="live-dot inline-block w-2 h-2 rounded-full bg-green-400" />
              <h2 className="font-semibold">Live feed</h2>
            </div>
            <ul className="space-y-3 overflow-y-auto max-h-[28rem] pr-1">
              {feed.length === 0 && (
                <li className="text-sm text-slate-500">Wachten op activiteit…</li>
              )}
              {feed.map((a) => (
                <li key={a.id} className="feed-item flex items-start gap-3">
                  <span
                    className="mt-1 inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold text-white shrink-0"
                    style={{ backgroundColor: a.color }}
                  >
                    {a.user.slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm leading-snug">
                      <span className="font-medium">{a.user}</span>{' '}
                      <span className="text-slate-400">{a.action}</span>
                    </p>
                    <p className="text-xs text-slate-500 font-mono">{fmtTime(a.time)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <footer className="text-center text-xs text-slate-600 pt-4">
          Live Tracker · realtime demo · data wordt client-side gesimuleerd
        </footer>
      </main>
    </div>
  )
}
