'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const MODES = {
  work:  { label: 'Werken',      min: 25, hex: '#ef4444', bg: '#fef2f2' },
  short: { label: 'Korte pauze', min: 5,  hex: '#22c55e', bg: '#f0fdf4' },
  long:  { label: 'Lange pauze', min: 15, hex: '#3b82f6', bg: '#eff6ff' },
} as const
type Mode = keyof typeof MODES

const SESSIONS_BEFORE_LONG = 4
const R    = 38
const CIRC = 2 * Math.PI * R
const SYNC_INTERVAL = 10 // save to Supabase every N seconds

function chime(ctx: AudioContext, freq: number, t: number) {
  const osc  = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain); gain.connect(ctx.destination)
  osc.frequency.value = freq
  osc.type = 'sine'
  gain.gain.setValueAtTime(0.15, t)
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
  osc.start(t); osc.stop(t + 0.4)
}

function notify(title: string, body: string) {
  if (typeof window === 'undefined') return
  if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body })
}

export default function PomodoroTimer() {
  const [open,     setOpen]     = useState(false)
  const [mode,     setMode]     = useState<Mode>('work')
  const [seconds,  setSeconds]  = useState(MODES.work.min * 60)
  const [running,  setRunning]  = useState(false)
  const [workDone, setWorkDone] = useState(0)
  const [soundOn,  setSoundOn]  = useState(true)
  const [flash,    setFlash]    = useState(false)
  const [userId,   setUserId]   = useState<string | null>(null)
  const [synced,   setSynced]   = useState(false)
  const [visible,  setVisible]  = useState(false)

  const audioCtx  = useRef<AudioContext | null>(null)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const syncCount = useRef(0)

  function getCtx() {
    if (!audioCtx.current) audioCtx.current = new AudioContext()
    if (audioCtx.current.state === 'suspended') audioCtx.current.resume()
    return audioCtx.current
  }

  // ── Supabase sync ─────────────────────────────────────────────────────────
  async function saveState(m: Mode, secs: number, run: boolean, done: number) {
    if (!userId) return
    await supabase.from('pomodoro_sessions').upsert({
      user_id: userId, mode: m, seconds_remaining: secs,
      is_running: run, work_done: done,
      started_at: run ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
  }

  // Load from Supabase on mount
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null
      setUserId(uid)
      if (!uid) { setSynced(true); setVisible(false); return }
      setVisible(true)

      const { data: session } = await supabase
        .from('pomodoro_sessions')
        .select('*')
        .eq('user_id', uid)
        .maybeSingle()

      if (session) {
        const m   = session.mode as Mode
        let secs  = session.seconds_remaining
        const run = session.is_running

        // If it was running on another device, calculate elapsed time
        if (run && session.started_at) {
          const elapsed = Math.floor((Date.now() - new Date(session.started_at).getTime()) / 1000)
          secs = Math.max(0, secs - elapsed)
        }

        setMode(m); setSeconds(secs); setRunning(run && secs > 0)
        setWorkDone(session.work_done ?? 0)
      }
      setSynced(true)
    })
  }, [])

  // ── Audio/notifications ────────────────────────────────────────────────────
  const ring = useCallback((isWork: boolean) => {
    if (soundOn) {
      const ctx = getCtx(); const t = ctx.currentTime
      // Kort, zacht belletje: één toon voor werk-klaar, twee tonen voor pauze-klaar
      if (isWork) {
        chime(ctx, 1047, t)          // C6 — helder, kort
      } else {
        chime(ctx, 880, t)           // A5
        chime(ctx, 1047, t + 0.45)  // C6
      }
    }
    setFlash(true); setTimeout(() => setFlash(false), 1200)
    notify(isWork ? '⏰ Focusblok klaar!' : '▶ Pauze voorbij!',
      isWork ? 'Neem een welverdiende pauze.' : 'Klaar voor het volgende focusblok?')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundOn])

  const switchMode = useCallback((m: Mode, done?: number) => {
    const secs = MODES[m].min * 60
    setMode(m); setSeconds(secs); setRunning(false)
    if (userId) saveState(m, secs, false, done ?? workDone)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, workDone])

  const advance = useCallback(() => {
    const wasWork = mode === 'work'
    ring(wasWork)
    if (wasWork) {
      setWorkDone(w => {
        const next = w + 1
        switchMode(next % SESSIONS_BEFORE_LONG === 0 ? 'long' : 'short', next)
        return next
      })
    } else {
      switchMode('work')
    }
  }, [mode, ring, switchMode])

  // ── Timer tick ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!synced) return
    if (running) {
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) { advance(); return 0 }
          // Periodic Supabase sync
          syncCount.current += 1
          if (syncCount.current >= SYNC_INTERVAL) {
            syncCount.current = 0
            if (userId) saveState(mode, s - 1, true, workDone)
          }
          return s - 1
        })
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, advance, synced])

  function handleStart() {
    if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission()
    getCtx()
    const newRunning = !running
    setRunning(newRunning)
    if (userId) saveState(mode, seconds, newRunning, workDone)
  }

  const total    = MODES[mode].min * 60
  const elapsed  = total - seconds
  const dash     = (elapsed / total) * CIRC
  const mm       = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss       = String(seconds % 60).padStart(2, '0')
  const { label, hex, bg } = MODES[mode]
  const cyclePos = workDone % SESSIONS_BEFORE_LONG

  if (!visible) return null

  return (
    <>
      {!open && (
        <button onClick={() => setOpen(true)} title="Pomodoro timer"
          style={{
            position: 'fixed', bottom: 124, right: 20, zIndex: 80,
            width: 42, height: 42, borderRadius: '50%',
            background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239,68,68,0.4)', transition: 'transform 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
          🍅
          {running && <span style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, background: '#4ade80', borderRadius: '50%', border: '2px solid #fff' }} />}
        </button>
      )}

      {open && (
        <div style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 80,
          width: 288, background: flash ? bg : '#fff',
          borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          border: `1px solid ${flash ? hex + '66' : '#e5e7eb'}`,
          overflow: 'hidden', transition: 'background 0.3s, border-color 0.3s',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>🍅 Pomodoro</span>
              {userId && <span style={{ fontSize: 10, color: '#9ca3af' }} title="Gesynchroniseerd">☁</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {running && <span style={{ fontSize: 11, fontWeight: 600, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />Bezig
              </span>}
              <button onClick={() => setSoundOn(s => !s)} title={soundOn ? 'Geluid uit' : 'Geluid aan'}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, opacity: soundOn ? 1 : 0.4 }}>
                {soundOn ? '🔔' : '🔕'}
              </button>
              <button onClick={() => setOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af', lineHeight: 1 }}>×</button>
            </div>
          </div>

          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            {(Object.entries(MODES) as [Mode, typeof MODES[Mode]][]).map(([m, cfg]) => (
              <button key={m} onClick={() => switchMode(m)}
                style={{ flex: 1, padding: '8px 4px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                  background: mode === m ? bg : 'transparent', color: mode === m ? hex : '#6b7280',
                  borderBottom: mode === m ? `2px solid ${hex}` : '2px solid transparent' }}>
                {cfg.min} min
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0 16px', gap: 14 }}>
            <div style={{ position: 'relative', width: 96, height: 96 }}>
              <svg width="96" height="96" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="48" cy="48" r={R} fill="none" stroke="#f3f4f6" strokeWidth="6" />
                <circle cx="48" cy="48" r={R} fill="none" stroke={hex} strokeWidth="6"
                  strokeDasharray={`${dash} ${CIRC}`} strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.95s linear' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                <span style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: '#111827', lineHeight: 1 }}>{mm}:{ss}</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{label}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={() => { const secs = total; setSeconds(secs); setRunning(false); if (userId) saveState(mode, secs, false, workDone) }}
                style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
              </button>
              <button onClick={handleStart}
                style={{ width: 56, height: 56, borderRadius: '50%', border: 'none', background: hex, color: '#fff', fontSize: 20, cursor: 'pointer', boxShadow: `0 4px 14px ${hex}55`, transition: 'transform 0.1s' }}
                onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.95)')}
                onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}>
                {running ? '⏸' : '▶'}
              </button>
              <button onClick={advance}
                style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/></svg>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>Sessie {workDone + 1}</span>
              <div style={{ display: 'flex', gap: 5 }}>
                {Array.from({ length: SESSIONS_BEFORE_LONG }).map((_, i) => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: '50%',
                    background: i < cyclePos ? '#f87171' : i === cyclePos && mode === 'work' ? '#fca5a5' : '#e5e7eb',
                    outline: i === cyclePos && mode === 'work' ? '1.5px solid #ef4444' : 'none', outlineOffset: 1 }} />
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
