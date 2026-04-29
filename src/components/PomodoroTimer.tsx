'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const MODES = {
  work:  { label: 'Werken',       min: 25, hex: '#ef4444' },
  short: { label: 'Korte pauze',  min: 5,  hex: '#22c55e' },
  long:  { label: 'Lange pauze',  min: 15, hex: '#3b82f6' },
} as const
type Mode = keyof typeof MODES

const SESSIONS_BEFORE_LONG = 4
const R = 38
const CIRC = 2 * Math.PI * R

function chime(ctx: AudioContext, freq: number, startAt: number, dur: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = freq
  osc.type = 'sine'
  gain.gain.setValueAtTime(0.22, startAt)
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + dur)
  osc.start(startAt)
  osc.stop(startAt + dur)
}

export default function PomodoroTimer() {
  const [open, setOpen]       = useState(false)
  const [mode, setMode]       = useState<Mode>('work')
  const [seconds, setSeconds] = useState(MODES.work.min * 60)
  const [running, setRunning] = useState(false)
  const [workDone, setWorkDone] = useState(0)   // work sessions completed this cycle

  const audioCtx = useRef<AudioContext | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const ring = useCallback(() => {
    if (!audioCtx.current) audioCtx.current = new AudioContext()
    const ctx = audioCtx.current
    const t = ctx.currentTime
    chime(ctx, 880,  t,        0.25)
    chime(ctx, 880,  t + 0.35, 0.25)
    chime(ctx, 1100, t + 0.70, 0.45)
  }, [])

  const switchMode = useCallback((m: Mode) => {
    setMode(m)
    setSeconds(MODES[m].min * 60)
    setRunning(false)
  }, [])

  const advance = useCallback(() => {
    ring()
    if (mode === 'work') {
      setWorkDone((w) => {
        const next = w + 1
        if (next % SESSIONS_BEFORE_LONG === 0) {
          switchMode('long')
        } else {
          switchMode('short')
        }
        return next
      })
    } else {
      switchMode('work')
    }
  }, [mode, ring, switchMode])

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) { advance(); return 0 }
          return s - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [running, advance])

  const total = MODES[mode].min * 60
  const elapsed = total - seconds
  const dash = (elapsed / total) * CIRC
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  const { label, hex } = MODES[mode]
  const cyclePos = workDone % SESSIONS_BEFORE_LONG   // 0–3 filled dots in current cycle
  const totalSessions = workDone + 1                  // display "Sessie N"

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Pomodoro timer openen"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-xl flex items-center justify-center text-2xl transition-colors select-none"
        >
          🍅
          {running && (
            <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
          )}
        </button>
      )}

      {/* Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-72 bg-white rounded-2xl shadow-2xl border border-warm-gray overflow-hidden select-none">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-warm-gray">
            <span className="font-bold text-sm text-gray-800">🍅 Pomodoro</span>
            <div className="flex items-center gap-3">
              {running && (
                <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  Bezig
                </span>
              )}
              <button onClick={() => setOpen(false)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 text-gray-500 text-lg leading-none">×</button>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex text-xs border-b border-warm-gray">
            {(Object.entries(MODES) as [Mode, typeof MODES[Mode]][]).map(([m, cfg]) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 font-semibold transition-colors ${
                  mode === m
                    ? 'text-red-600 bg-red-50 border-b-2 border-red-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {cfg.min} min
              </button>
            ))}
          </div>

          {/* Circle */}
          <div className="flex flex-col items-center py-6 gap-4">
            <div className="relative w-24 h-24">
              <svg width="96" height="96" className="-rotate-90">
                <circle cx="48" cy="48" r={R} fill="none" stroke="#f3f4f6" strokeWidth="6" />
                <circle
                  cx="48" cy="48" r={R} fill="none"
                  stroke={hex} strokeWidth="6"
                  strokeDasharray={`${dash} ${CIRC}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.95s linear' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                <span className="text-2xl font-bold tabular-nums text-gray-800 leading-none">{mm}:{ss}</span>
                <span className="text-xs text-gray-400">{label}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Reset */}
              <button
                onClick={() => { setSeconds(total); setRunning(false) }}
                className="w-9 h-9 rounded-full border border-warm-gray text-gray-500 hover:bg-gray-50 flex items-center justify-center"
                title="Opnieuw starten"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                </svg>
              </button>

              {/* Play / Pause */}
              <button
                onClick={() => setRunning((r) => !r)}
                className="w-14 h-14 rounded-full text-white text-xl flex items-center justify-center shadow-md active:scale-95 transition-transform"
                style={{ backgroundColor: hex }}
              >
                {running ? '⏸' : '▶'}
              </button>

              {/* Skip */}
              <button
                onClick={advance}
                className="w-9 h-9 rounded-full border border-warm-gray text-gray-500 hover:bg-gray-50 flex items-center justify-center"
                title="Overslaan"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/>
                </svg>
              </button>
            </div>

            {/* Session dots */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Sessie {totalSessions}</span>
              <div className="flex gap-1.5">
                {Array.from({ length: SESSIONS_BEFORE_LONG }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i < cyclePos
                        ? 'bg-red-400'
                        : i === cyclePos && mode === 'work'
                        ? 'bg-red-200 ring-1 ring-red-400'
                        : 'bg-gray-200'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400">→ 15 min</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
