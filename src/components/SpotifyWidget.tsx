'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface NowPlaying {
  connected: boolean
  playing?: boolean
  track?: string
  artist?: string
  album_art?: string
  track_url?: string
  progress_ms?: number
  duration_ms?: number
}

export default function SpotifyWidget() {
  const [userId, setUserId]       = useState<string | null>(null)
  const [np, setNp]               = useState<NowPlaying | null>(null)
  const [open, setOpen]           = useState(false)
  const [connected, setConnected] = useState(false)
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user?.id ?? null
      setUserId(uid)
      if (uid) fetchNowPlaying(uid)
    })
  }, [])

  async function fetchNowPlaying(uid: string) {
    const res = await fetch(`/api/spotify/now-playing?user_id=${uid}`)
    if (!res.ok) return
    const data: NowPlaying = await res.json()
    setConnected(data.connected)
    setNp(data)
  }

  useEffect(() => {
    if (!userId || !connected) return
    intervalRef.current = setInterval(() => fetchNowPlaying(userId), 15000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [userId, connected])

  function handleConnect() {
    if (userId) window.location.href = `/api/auth/spotify?user_id=${userId}`
  }

  if (!userId) return null

  return (
    <>
      <button
        onClick={() => { setOpen(o => !o); if (userId) fetchNowPlaying(userId) }}
        title="Spotify"
        style={{
          position: 'fixed', bottom: 80, right: 20, zIndex: 80,
          width: 42, height: 42, borderRadius: '50%',
          background: connected && np?.playing ? '#1DB954' : '#1a1a1a',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: connected && np?.playing
            ? '0 2px 12px rgba(29,185,84,0.5)'
            : '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'all 0.2s',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 132, right: 20, zIndex: 81,
          background: '#121212', borderRadius: 16, padding: 16, width: 280,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#1DB954">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Spotify</span>
            </div>
            <button onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>

          {!connected ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
                Koppel je Spotify-account om te zien wat je afspeelt.
              </p>
              <button onClick={handleConnect}
                style={{ background: '#1DB954', color: '#000', border: 'none', borderRadius: 20, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                Inloggen met Spotify
              </button>
            </div>
          ) : np?.playing && np.track ? (
            <div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {np.album_art && (
                  <img src={np.album_art} alt="album" style={{ width: 52, height: 52, borderRadius: 6, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {np.track_url
                      ? <a href={np.track_url} target="_blank" rel="noreferrer" style={{ color: '#fff', textDecoration: 'none' }}>{np.track}</a>
                      : np.track}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{np.artist}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <span style={{ fontSize: 10, color: '#1DB954', fontWeight: 700 }}>▶ Nu aan het afspelen</span>
                  </div>
                </div>
              </div>
              {np.progress_ms !== undefined && np.duration_ms && (
                <div style={{ marginTop: 10, height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                  <div style={{ height: '100%', background: '#1DB954', borderRadius: 2, width: `${(np.progress_ms / np.duration_ms) * 100}%` }} />
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <p style={{ fontSize: 12, color: '#9ca3af' }}>Niks aan het afspelen op dit moment.</p>
              <button onClick={handleConnect}
                style={{ background: 'none', border: '1px solid rgba(255,255,255,0.2)', color: '#9ca3af', borderRadius: 20, padding: '6px 14px', fontSize: 11, cursor: 'pointer', marginTop: 8 }}>
                Opnieuw koppelen
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
