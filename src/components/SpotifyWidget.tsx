'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { SkipBackIcon, PlayIcon, PauseIcon, SkipForwardIcon, Music2Icon, XIcon } from 'lucide-react'

interface NowPlaying {
  connected: boolean
  playing?: boolean
  track?: string
  artist?: string
  album_art?: string
  track_url?: string
}

async function fetchLastfm(username: string, apiKey: string): Promise<NowPlaying> {
  if (!apiKey || !username) return { connected: false }
  try {
    const res = await fetch(
      `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${apiKey}&format=json&limit=1`
    )
    if (!res.ok) return { connected: false }
    const data = await res.json()
    const track = data?.recenttracks?.track?.[0]
    if (!track) return { connected: true, playing: false }
    const playing = track['@attr']?.nowplaying === 'true'
    const art = track.image?.find((i: { size: string }) => i.size === 'large')?.['#text'] ?? ''
    return {
      connected: true, playing,
      track: track.name,
      artist: track.artist['#text'],
      album_art: art && !art.includes('2a96cbd8b46e442fc41c2b86b821562f') ? art : undefined,
      track_url: track.url,
    }
  } catch {
    return { connected: false }
  }
}

export default function SpotifyWidget() {
  const [open, setOpen]             = useState(false)
  const [np, setNp]                 = useState<NowPlaying | null>(null)
  const [lastfmUser, setLastfmUser] = useState<string | null>(null)
  const [inputUser, setInputUser]   = useState('')
  const [saving, setSaving]         = useState(false)
  const [userId, setUserId]         = useState<string | null>(null)
  const [spotifyConnected, setSpotifyConnected] = useState(false)
  const apiKey = process.env.NEXT_PUBLIC_LASTFM_API_KEY ?? ''
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const uid = data.session.user.id
      setUserId(uid)
      const { data: token } = await supabase.from('spotify_tokens').select('display_name, refresh_token').eq('user_id', uid).maybeSingle()
      if (token?.refresh_token && token.refresh_token !== '') setSpotifyConnected(true)
      const stored = token?.display_name ?? localStorage.getItem('lastfm_username')
      if (stored) {
        setLastfmUser(stored)
        fetchLastfm(stored, apiKey).then(setNp)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!lastfmUser) return
    intervalRef.current = setInterval(() => fetchLastfm(lastfmUser, apiKey).then(setNp), 15000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [lastfmUser, apiKey])

  async function control(action: 'play' | 'pause' | 'next' | 'previous') {
    if (!userId) return
    if (!spotifyConnected) {
      // Fallback: open Spotify in new tab
      window.open('https://open.spotify.com', '_blank')
      return
    }
    await fetch('/api/spotify/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, action }),
    })
    // Ververs na korte pauze
    setTimeout(() => { if (lastfmUser) fetchLastfm(lastfmUser, apiKey).then(setNp) }, 800)
  }

  async function saveUsername() {
    if (!inputUser.trim()) return
    setSaving(true)
    localStorage.setItem('lastfm_username', inputUser.trim())
    if (userId) {
      await supabase.from('spotify_tokens').upsert({
        user_id: userId, display_name: inputUser.trim(),
        access_token: '', refresh_token: '', expires_at: new Date(0).toISOString(),
      })
    }
    setLastfmUser(inputUser.trim())
    const result = await fetchLastfm(inputUser.trim(), apiKey)
    setNp(result)
    setSaving(false)
  }

  const isPlaying = np?.connected && np?.playing && np?.track

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => { setOpen(o => !o); if (lastfmUser) fetchLastfm(lastfmUser, apiKey).then(setNp) }}
        title="Muziek"
        style={{
          position: 'fixed', bottom: 72, right: 20, zIndex: 80,
          width: 42, height: 42, borderRadius: '50%',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
          // Neumorphic style
          background: '#e0e5ec',
          boxShadow: isPlaying
            ? '4px 4px 8px #b8bec7, -4px -4px 8px #ffffff, 0 0 16px rgba(99,102,241,0.4)'
            : '4px 4px 8px #b8bec7, -4px -4px 8px #ffffff',
          color: isPlaying ? '#6366f1' : '#64748b',
        }}
      >
        <Music2Icon size={18} />
      </button>

      {/* Player panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 124, right: 20, zIndex: 81,
          width: 300,
          background: '#e0e5ec',
          borderRadius: 24,
          padding: 24,
          boxShadow: '9px 9px 18px #b8bec7, -9px -9px 18px #ffffff',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Music2Icon size={16} style={{ color: '#6366f1' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>
                {lastfmUser ? `@${lastfmUser}` : 'Muziek'}
              </span>
            </div>
            <button onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
              <XIcon size={16} />
            </button>
          </div>

          {!lastfmUser ? (
            /* Setup */
            <div>
              <div style={{
                background: '#e0e5ec',
                borderRadius: 16,
                padding: 16,
                boxShadow: 'inset 4px 4px 8px #b8bec7, inset -4px -4px 8px #ffffff',
                marginBottom: 12,
              }}>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 10px' }}>
                  Vul je <strong style={{ color: '#374151' }}>Last.fm username</strong> in.{' '}
                  <span style={{ color: '#9ca3af' }}>Koppel Spotify via last.fm → Settings → Apps.</span>
                </p>
                <input
                  style={{
                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 13, color: '#374151', boxSizing: 'border-box',
                  }}
                  placeholder="username..."
                  value={inputUser}
                  onChange={e => setInputUser(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveUsername() }}
                />
              </div>
              <button onClick={saveUsername} disabled={!inputUser.trim() || saving}
                style={{
                  width: '100%', border: 'none', borderRadius: 12, padding: '10px',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  background: '#e0e5ec',
                  color: !inputUser.trim() || saving ? '#9ca3af' : '#6366f1',
                  boxShadow: !inputUser.trim() || saving
                    ? 'inset 2px 2px 6px #b8bec7, inset -2px -2px 6px #ffffff'
                    : '4px 4px 8px #b8bec7, -4px -4px 8px #ffffff',
                  transition: 'all 0.2s',
                }}>
                {saving ? 'Opslaan…' : 'Verbinden'}
              </button>
            </div>
          ) : (
            <div>
              {/* Album art */}
              <div style={{
                width: '100%', aspectRatio: '1', borderRadius: 20, overflow: 'hidden', marginBottom: 20,
                boxShadow: '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff',
              }}>
                {np?.album_art ? (
                  <img src={np.album_art} alt="album" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Music2Icon size={40} style={{ color: 'rgba(255,255,255,0.6)' }} />
                  </div>
                )}
              </div>

              {/* Track info */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1f2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {np?.track ?? '—'}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {np?.artist ?? 'Niks aan het afspelen'}
                </p>
                {isPlaying && (
                  <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, display: 'inline-block', marginTop: 6 }}>▶ Nu aan het afspelen</span>
                )}
              </div>

              {/* Progress bar */}
              <div style={{
                height: 6, borderRadius: 6, marginBottom: 20,
                boxShadow: 'inset 3px 3px 6px #b8bec7, inset -3px -3px 6px #ffffff',
                background: '#e0e5ec', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                  borderRadius: 6, width: isPlaying ? '45%' : '0%',
                  transition: 'width 15s linear',
                }} />
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, alignItems: 'center' }}>
                {[
                  { icon: <SkipBackIcon size={20} />, label: 'Vorige', onClick: () => control('previous') },
                  { icon: isPlaying ? <PauseIcon size={28} /> : <PlayIcon size={28} />, label: 'Spelen', onClick: () => isPlaying ? control('pause') : control('play'), primary: true },
                  { icon: <SkipForwardIcon size={20} />, label: 'Volgende', onClick: () => control('next') },
                ].map(({ icon, label, onClick, primary }) => (
                  <button key={label} onClick={onClick} title={label}
                    style={{
                      width: primary ? 60 : 46, height: primary ? 60 : 46,
                      borderRadius: '50%', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#e0e5ec',
                      color: primary ? '#6366f1' : '#64748b',
                      boxShadow: primary
                        ? '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff'
                        : '4px 4px 8px #b8bec7, -4px -4px 8px #ffffff',
                      transition: 'all 0.15s',
                    }}
                    onMouseDown={e => (e.currentTarget.style.boxShadow = 'inset 3px 3px 6px #b8bec7, inset -3px -3px 6px #ffffff')}
                    onMouseUp={e => (e.currentTarget.style.boxShadow = primary ? '6px 6px 12px #b8bec7, -6px -6px 12px #ffffff' : '4px 4px 8px #b8bec7, -4px -4px 8px #ffffff')}
                  >
                    {icon}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                {!spotifyConnected && (
                  <button onClick={() => userId && (window.location.href = `/api/auth/spotify?user_id=${userId}`)}
                    style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>
                    Spotify koppelen voor bediening
                  </button>
                )}
                <button onClick={() => { setLastfmUser(null); localStorage.removeItem('lastfm_username') }}
                  style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>
                  Ander account
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
