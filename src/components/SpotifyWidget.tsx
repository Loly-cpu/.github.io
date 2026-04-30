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
}

interface LastfmTrack {
  name: string
  artist: { '#text': string }
  image: { '#text': string; size: string }[]
  url: string
  '@attr'?: { nowplaying: string }
}

async function fetchLastfm(username: string): Promise<NowPlaying> {
  const key = process.env.NEXT_PUBLIC_LASTFM_API_KEY
  if (!key || !username) return { connected: false }
  const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${key}&format=json&limit=1`
  const res = await fetch(url)
  if (!res.ok) return { connected: false }
  const data = await res.json()
  const track: LastfmTrack | undefined = data?.recenttracks?.track?.[0]
  if (!track) return { connected: true, playing: false }
  const playing = track['@attr']?.nowplaying === 'true'
  const art = track.image?.find((i: { size: string }) => i.size === 'large')?.['#text'] ?? ''
  return {
    connected: true,
    playing,
    track: track.name,
    artist: track.artist['#text'],
    album_art: art && !art.includes('2a96cbd8b46e442fc41c2b86b821562f') ? art : undefined,
    track_url: track.url,
  }
}

export default function SpotifyWidget() {
  const [open, setOpen]             = useState(false)
  const [np, setNp]                 = useState<NowPlaying | null>(null)
  const [lastfmUser, setLastfmUser] = useState<string | null>(null)
  const [inputUser, setInputUser]   = useState('')
  const [saving, setSaving]         = useState(false)
  const intervalRef                 = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const uid = data.session.user.id
      const { data: token } = await supabase.from('spotify_tokens').select('display_name').eq('user_id', uid).maybeSingle()
      const stored = token?.display_name ?? localStorage.getItem('lastfm_username')
      if (stored) { setLastfmUser(stored); fetchLastfm(stored).then(setNp) }
    })
  }, [])

  useEffect(() => {
    if (!lastfmUser) return
    intervalRef.current = setInterval(() => fetchLastfm(lastfmUser).then(setNp), 15000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [lastfmUser])

  async function saveUsername() {
    if (!inputUser.trim()) return
    setSaving(true)
    localStorage.setItem('lastfm_username', inputUser.trim())
    // Save to spotify_tokens.display_name (reusing the field for lastfm username)
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await supabase.from('spotify_tokens').upsert({
        user_id: session.user.id,
        display_name: inputUser.trim(),
        access_token: '', refresh_token: '', expires_at: new Date(0).toISOString(),
      })
    }
    setLastfmUser(inputUser.trim())
    const result = await fetchLastfm(inputUser.trim())
    setNp(result)
    setSaving(false)
  }

  const isPlaying = np?.connected && np?.playing && np?.track

  return (
    <>
      <button
        onClick={() => { setOpen(o => !o); if (lastfmUser) fetchLastfm(lastfmUser).then(setNp) }}
        title="Muziek"
        style={{
          position: 'fixed', bottom: 72, right: 20, zIndex: 80,
          width: 42, height: 42, borderRadius: '50%',
          background: isPlaying ? '#1DB954' : '#1a1a1a',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isPlaying ? '0 2px 12px rgba(29,185,84,0.5)' : '0 2px 8px rgba(0,0,0,0.3)',
          transition: 'all 0.2s',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 124, right: 20, zIndex: 81,
          background: '#121212', borderRadius: 16, padding: 16, width: 280,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
          color: '#fff',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#1DB954">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {lastfmUser ? `@${lastfmUser}` : 'Muziek'}
              </span>
            </div>
            <button onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>

          {!lastfmUser ? (
            <div>
              <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 10 }}>
                Vul je <strong style={{ color: '#fff' }}>Last.fm gebruikersnaam</strong> in om te zien wat je afspeelt op Spotify.
              </p>
              <p style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>
                Nog geen Last.fm? Maak gratis aan op <span style={{ color: '#d11f4b' }}>last.fm</span> en koppel Spotify via Settings → Applications.
              </p>
              <input
                style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 10px', fontSize: 13, color: '#fff', marginBottom: 8, boxSizing: 'border-box' }}
                placeholder="jouw-lastfm-username"
                value={inputUser}
                onChange={e => setInputUser(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveUsername() }}
              />
              <button onClick={saveUsername} disabled={!inputUser.trim() || saving}
                style={{ width: '100%', background: '#1DB954', color: '#000', border: 'none', borderRadius: 8, padding: '8px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: !inputUser.trim() || saving ? 0.6 : 1 }}>
                {saving ? 'Opslaan…' : 'Verbinden'}
              </button>
            </div>
          ) : isPlaying ? (
            <div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {np?.album_art && (
                  <img src={np.album_art} alt="album" style={{ width: 52, height: 52, borderRadius: 6, flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {np?.track_url
                      ? <a href={np.track_url} target="_blank" rel="noreferrer" style={{ color: '#fff', textDecoration: 'none' }}>{np?.track}</a>
                      : np?.track}
                  </p>
                  <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{np?.artist}</p>
                  <span style={{ fontSize: 10, color: '#1DB954', fontWeight: 700 }}>▶ Nu aan het afspelen</span>
                </div>
              </div>
              <button onClick={() => { setLastfmUser(null); localStorage.removeItem('lastfm_username') }}
                style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 10, cursor: 'pointer', marginTop: 10, textDecoration: 'underline' }}>
                Ander account
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Niks aan het afspelen.</p>
              <p style={{ fontSize: 11, color: '#6b7280' }}>Speel iets af op Spotify en het verschijnt hier.</p>
              <button onClick={() => { setLastfmUser(null); localStorage.removeItem('lastfm_username') }}
                style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 10, cursor: 'pointer', marginTop: 8, textDecoration: 'underline' }}>
                Ander account
              </button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
