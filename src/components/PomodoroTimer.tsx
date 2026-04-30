'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const MODES = {
  work:  { label: 'Werken',      min: 25, hex: '#ef4444', bg: '#fef2f2' },
  short: { label: 'Korte pauze', min: 5,  hex: '#22c55e', bg: '#f0fdf4' },
  long:  { label: 'Lange pauze', min: 15, hex: '#3b82f6', bg: '#eff6ff' },
} as const
type Mode = keyof typeof MODES

const SESSIONS_BEFORE_LONG = 4
const R    = 38
const CIRC = 2 * Math.PI * R

// ── Audio ─────────────────────────────────────────────────────────────────────
function chime(ctx: AudioContext, freq: number, t: number, dur: number) {
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain); gain.connect(ctx.destination)
  osc.frequency.value = freq; osc.type = 'sine'
  gain.gain.setValueAtTime(0.2, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
  osc.start(t); osc.stop(t + dur)
}

// ── Notification ───────────────────────────────────────────────────────────────
function notify(title: string, body: string) {
  if (typeof window === 'undefined') return
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}

export default function PomodoroTimer() {
  const [open,    setOpen]    = useState(false)
  const [mode,    setMode]    = useState<Mode>('work')
  const [seconds, setSeconds] = useState(MODES.work.min * 60)
  const [running, setRunning] = useState(false)
  const [workDone, setWorkDone] = useState(0)
  const [soundOn,  setSoundOn]  = useState(true)
  const [flash,    setFlash]    = useState(false)

  const audioCtx = useRef<AudioContext | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Resume / create AudioContext after user gesture
  function getCtx() {
    if (!audioCtx.current) audioCtx.current = new AudioContext()
    if (audioCtx.current.state === 'suspended') audioCtx.current.resume()
    return audioCtx.current
  }

  const ring = useCallback((isWork: boolean) => {
    if (soundOn) {
      const ctx = getCtx()
      const t   = ctx.currentTime
      if (isWork) {
        chime(ctx, 880,  t,        0.25)
        chime(ctx, 880,  t + 0.35, 0.25)
        chime(ctx, 1100, t + 0.70, 0.45)
      } else {
        chime(ctx, 660, t,        0.3)
        chime(ctx, 880, t + 0.4,  0.4)
      }
    }
    setFlash(true)
    setTimeout(() => setFlash(false), 1200)
    notify(
      isWork ? '⏰ Focusblok klaar!' : '▶ Pauze voorbij!',
      isWork ? 'Neem een welverdiende pauze.' : 'Klaar voor het volgende focusblok?'
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundOn])

  const switchMode = useCallback((m: Mode) => {
    setMode(m); setSeconds(MODES[m].min * 60); setRunning(false)
  }, [])

  const advance = useCallback(() => {
    const wasWork = mode === 'work'
    ring(wasWork)
    if (wasWork) {
      setWorkDone((w) => {
        const next = w + 1
        switchMode(next % SESSIONS_BEFORE_LONG === 0 ? 'long' : 'short')
        return next
      })
    } else {
      switchMode('work')
    }
  }, [mode, ring, switchMode])

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setSeconds((s) => { if (s <= 1) { advance(); return 0 } return s - 1 })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [running, advance])

  function handleStart() {
    // Request notification permission on first start
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    // Ensure audio context is active
    getCtx()
    setRunning((r) => !r)
  }

  const total   = MODES[mode].min * 60
  const elapsed = total - seconds
  const dash    = (elapsed / total) * CIRC
  const mm      = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss      = String(seconds % 60).padStart(2, '0')
  const { label, hex, bg } = MODES[mode]
  const cyclePos      = workDone % SESSIONS_BEFORE_LONG
  const totalSessions = workDone + 1

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Pomodoro timer openen"
          style={{
            position: 'fixed', bottom: 72, right: 64, zIndex: 80,
            width: 44, height: 44, borderRadius: '50%',
            background: '#ef4444', color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239,68,68,0.4)',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          🍅
          {running && (
            <span style={{ position: 'absolute', top: 2, right: 2, width: 10, height: 10, background: '#4ade80', borderRadius: '50%', border: '2px solid #fff' }} />
          )}
        </button>
      )}

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 72, right: 16, zIndex: 80,
          width: 288, background: flash ? bg : '#fff',
          borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          border: `1px solid ${flash ? hex + '66' : '#e5e7eb'}`,
          overflow: 'hidden', transition: 'background 0.3s, border-color 0.3s',
        }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>🍅 Pomodoro</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {running && <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                Bezig
              </span>}
              {/* Sound toggle */}
              <button onClick={() => setSoundOn(s => !s)}
                title={soundOn ? 'Geluid uit' : 'Geluid aan'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, opacity: soundOn ? 1 : 0.4, transition: 'opacity 0.2s', padding: '2px 4px' }}>
                {soundOn ? '🔔' : '🔕'}
              </button>
              <button onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af', lineHeight: 1 }}>×</button>
            </div>
          </div>

          {/* Mode tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            {(Object.entries(MODES) as [Mode, typeof MODES[Mode]][]).map(([m, cfg]) => (
              <button key={m} onClick={() => switchMode(m)}
                style={{
                  flex: 1, padding: '8px 4px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'background 0.1s',
                  background: mode === m ? bg : 'transparent',
                  color: mode === m ? hex : '#6b7280',
                  borderBottom: mode === m ? `2px solid ${hex}` : '2px solid transparent',
                }}>
                {cfg.min} min
              </button>
            ))}
          </div>

          {/* Circle */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0 16px', gap: 14 }}>
            <div style={{ position: 'relative', width: 96, height: 96 }}>
              <svg width="96" height="96" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="48" cy="48" r={R} fill="none" stroke="#f3f4f6" strokeWidth="6" />
                <circle cx="48" cy="48" r={R} fill="none"
                  stroke={hex} strokeWidth="6"
                  strokeDasharray={`${dash} ${CIRC}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.95s linear' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <span style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#111827', lineHeight: 1 }}>{mm}:{ss}</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{label}</span>
              </div>
            </div>

            {/* Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => { setSeconds(total); setRunning(false) }} title="Opnieuw"
                style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
                </svg>
              </button>

              <button onClick={handleStart}
                style={{ width: 56, height: 56, borderRadius: '50%', border: 'none', background: hex, color: '#fff', fontSize: 20, cursor: 'pointer', boxShadow: `0 4px 14px ${hex}55`, transition: 'transform 0.1s, box-shadow 0.1s' }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}>
                {running ? '⏸' : '▶'}
              </button>

              <button onClick={advance} title="Overslaan"
                style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/>
                </svg>
              </button>
            </div>

            {/* Session dots */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>Sessie {totalSessions}</span>
              <div style={{ display: 'flex', gap: 5 }}>
                {Array.from({ length: SESSIONS_BEFORE_LONG }).map((_, i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: i < cyclePos ? '#f87171'
                      : i === cyclePos && mode === 'work' ? '#fca5a5'
                      : '#e5e7eb',
                    outline: i === cyclePos && mode === 'work' ? '1.5px solid #ef4444' : 'none',
                    outlineOffset: 1,
                  }} />
                ))}
              </div>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>→ lange pauze</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
