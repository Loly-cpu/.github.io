'use client'

import { ReactNode, useState, useLayoutEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import AppTopbar from './AppTopbar'
import AppSidebar from './AppSidebar'
import FeedbackButton from './FeedbackButton'
import { DeleteConfirmProvider } from './DeleteConfirm'

// ── Limelight bottom nav ───────────────────────────────────────────────────────
const BOTTOM_ITEMS = [
  { href: '/platform',            icon: '🏠', label: 'Home',    exact: true },
  { href: '/platform/agenda',     icon: '📅', label: 'Agenda' },
  { href: '/platform/berichten',  icon: '💬', label: 'Chat' },
  { href: '/platform/documenten', icon: '📁', label: 'Docs' },
  { href: '/platform/meldingen',  icon: '🔔', label: 'Meer' },
]

function MobileBottomNav() {
  const path        = usePathname()
  const router      = useRouter()
  const itemRefs    = useRef<(HTMLAnchorElement | null)[]>([])
  const pillRef     = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)

  const activeIdx = BOTTOM_ITEMS.findIndex(item =>
    item.exact ? path === item.href : path.startsWith(item.href)
  )

  useLayoutEffect(() => {
    const pill   = pillRef.current
    const active = itemRefs.current[activeIdx === -1 ? 0 : activeIdx]
    if (pill && active) {
      const left = active.offsetLeft + active.offsetWidth / 2 - pill.offsetWidth / 2
      pill.style.left = `${left}px`
      if (!ready) setTimeout(() => setReady(true), 30)
    }
  }, [activeIdx, ready])

  return (
    <nav style={{
      display: 'flex', alignItems: 'stretch',
      position: 'fixed', bottom: 0, left: 0, right: 0, height: 58,
      background: '#fff', borderTop: '1px solid #e5e7eb', zIndex: 40,
    }} className="md:hidden">
      {/* Limelight pill */}
      <div ref={pillRef} style={{
        position: 'absolute', top: 0, width: 44, height: 3,
        borderRadius: '0 0 4px 4px',
        background: '#ff520e',
        boxShadow: '0 0 12px 2px rgba(255,82,14,0.35)',
        left: -999,
        transition: ready ? 'left 0.3s cubic-bezier(0.4,0,0.2,1)' : 'none',
      }}>
        {/* Limelight glow cone */}
        <div style={{
          position: 'absolute', left: '-30%', top: 3, width: '160%', height: 48,
          clipPath: 'polygon(10% 100%,25% 0,75% 0,90% 100%)',
          background: 'linear-gradient(to bottom, rgba(255,82,14,0.18), transparent)',
          pointerEvents: 'none',
        }} />
      </div>

      {BOTTOM_ITEMS.map((item, i) => {
        const active = item.exact ? path === item.href : path.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href}
            ref={el => { itemRefs.current[i] = el }}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', textDecoration: 'none', gap: 2, padding: '6px 0',
              color: active ? '#ff520e' : '#6b7280',
              fontSize: 10, fontWeight: active ? 600 : 400,
              transition: 'color 0.15s',
            }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

// ── Spotify focus knop ────────────────────────────────────────────────────────
function SpotifyButton() {
  const [open, setOpen]       = useState(false)
  const [url, setUrl]         = useState('')
  const [saved, setSaved]     = useState('')

  const openSpotify = () => {
    const target = saved || 'https://open.spotify.com'
    window.open(target, 'spotify-focus', 'width=400,height=650,left=20,top=60')
  }

  return (
    <>
      <button onClick={() => setOpen(o => !o)}
        title="Spotify focus muziek"
        style={{
          position: 'fixed', bottom: 72, right: 110, zIndex: 80,
          width: 42, height: 42, borderRadius: '50%',
          background: '#1DB954', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(29,185,84,0.4)',
          transition: 'transform 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}>
        {/* Spotify icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
      </button>

      {open && (
        <div style={{ position: 'fixed', bottom: 120, right: 110, zIndex: 81, background: '#fff', borderRadius: 12, padding: 16, width: 260, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', border: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: '#111827' }}>🎵 Spotify Focus</p>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 18 }}>×</button>
          </div>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
            Stel een playlist-URL in of open Spotify direct.
          </p>
          <input
            style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 12, boxSizing: 'border-box', marginBottom: 8 }}
            placeholder="https://open.spotify.com/playlist/..."
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setSaved(url); setOpen(false) } }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            {url && <button onClick={() => { setSaved(url); setOpen(false) }}
              style={{ flex: 1, background: '#f3f4f6', border: 'none', borderRadius: 7, padding: '6px', fontSize: 12, cursor: 'pointer', color: '#374151', fontWeight: 500 }}>
              Opslaan
            </button>}
            <button onClick={() => { openSpotify(); setOpen(false) }}
              style={{ flex: 1, background: '#1DB954', color: '#fff', border: 'none', borderRadius: 7, padding: '6px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
              ▶ Openen
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ── App Layout ────────────────────────────────────────────────────────────────
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <AppTopbar />
      <AppSidebar />
      <main className="app-content">
        {children}
      </main>
      <FeedbackButton />
      <SpotifyButton />
      <DeleteConfirmProvider />
      <MobileBottomNav />
    </div>
  )
}
