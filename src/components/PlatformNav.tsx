'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const NAV: { href: string; label: string }[] = [
  { href: '/platform',             label: 'Start'        },
  { href: '/platform/agenda',      label: 'Agenda'       },
  { href: '/platform/groepen',     label: 'Berichten'    },
  { href: '/platform/documenten',  label: 'Documenten'   },
  { href: '/platform/formulieren', label: 'Formulieren'  },
  { href: '/platform/links',       label: 'Links'        },
  { href: '/platform/meldingen',   label: 'Meldingen'    },
]

export default function PlatformNav() {
  const path     = usePathname()
  const router   = useRouter()
  const [name, setName]           = useState('')
  const [initials, setInitials]   = useState('?')
  const [unread, setUnread]       = useState(0)
  const [profileOpen, setProfile] = useState(false)
  const [mobileOpen, setMobile]   = useState(false)
  const profileRef                = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session?.user) return
      const uid   = data.session.user.id
      const email = data.session.user.email ?? ''
      const { data: p } = await supabase.from('profiles').select('display_name').eq('id', uid).single()
      const n = p?.display_name ?? email.split('@')[0]
      setName(n)
      setInitials(n[0]?.toUpperCase() ?? '?')
      const { count } = await supabase
        .from('notifications').select('*', { count: 'exact', head: true })
      setUnread(count ?? 0)
    })
  }, [])

  // Close profile dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfile(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  const active = (href: string) =>
    href === '/platform' ? path === '/platform' : path.startsWith(href)

  return (
    <>
      <header className="smsc-topnav">
        <nav className="smsc-nav">

          {/* ── Profile (left) ───────────────────────────────────── */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setProfile(!profileOpen)}
              className="smsc-nav__btn"
              style={{ gap: 8 }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: '#ff520e', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 12, flexShrink: 0,
              }}>
                {initials}
              </div>
              <span style={{ fontWeight: 500, fontSize: 14 }}>{name}</span>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ color: '#5b5b5b' }}>
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {profileOpen && (
              <div className="smsc-dropdown" style={{ minWidth: 200 }}>
                <Link href="/examenboard" onClick={() => setProfile(false)}>🎓 Examenboard</Link>
                <Link href="/dashboard"   onClick={() => setProfile(false)}>🌐 Taalplatform</Link>
                <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #e8e8e8' }} />
                <button onClick={logout} style={{ color: '#5b5b5b' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
                  </svg>
                  Afmelden
                </button>
              </div>
            )}
          </div>

          <div className="smsc-nav__spacer" />

          {/* ── Main nav items (desktop) ──────────────────────────── */}
          <div className="hidden md:flex" style={{ alignItems: 'stretch' }}>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`smsc-nav__btn ${active(item.href) ? 'smsc-nav__btn--active' : ''}`}
              >
                {item.label}
                {item.href === '/platform/meldingen' && unread > 0 && (
                  <span className="smsc-nav__badge">{unread > 9 ? '9+' : unread}</span>
                )}
              </Link>
            ))}
          </div>

          {/* ── Divider ───────────────────────────────────────────── */}
          <div className="smsc-nav__divider hidden md:block" />

          {/* ── Notifications icon ────────────────────────────────── */}
          <Link href="/platform/meldingen" className="smsc-nav__btn smsc-nav__btn--icon hidden md:flex" title="Meldingen">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {unread > 0 && <span className="smsc-nav__badge">{unread > 9 ? '9+' : unread}</span>}
          </Link>

          {/* ── Logout icon ───────────────────────────────────────── */}
          <button onClick={logout} className="smsc-nav__btn smsc-nav__btn--icon hidden md:flex" title="Afmelden">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>

          {/* ── Mobile hamburger ──────────────────────────────────── */}
          <button
            onClick={() => setMobile(!mobileOpen)}
            className="smsc-nav__btn smsc-nav__btn--icon md:hidden"
          >
            {mobileOpen
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            }
          </button>
        </nav>
      </header>

      {/* ── Mobile menu ───────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          style={{ position: 'fixed', top: 48, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 39 }}
          onClick={() => setMobile(false)}
        >
          <nav style={{ background: '#fff' }} onClick={e => e.stopPropagation()}>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobile(false)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 20px',
                  color: active(item.href) ? '#ff520e' : '#242424',
                  textDecoration: 'none',
                  fontSize: 14,
                  borderBottom: '1px solid #f4f4f4',
                  background: active(item.href) ? '#fff3ef' : 'transparent',
                  fontWeight: active(item.href) ? 500 : 400,
                }}
              >
                {item.label}
                {item.href === '/platform/meldingen' && unread > 0 && (
                  <span className="smsc-nav__badge">{unread > 9 ? '9+' : unread}</span>
                )}
              </Link>
            ))}
            <button onClick={logout}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '14px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#5b5b5b', borderTop: '1px solid #e8e8e8' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              Afmelden
            </button>
          </nav>
        </div>
      )}
    </>
  )
}
