'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface SearchResult {
  type: 'bericht' | 'document' | 'event' | 'melding'
  id: string; title: string; sub?: string; href: string
}

const NAV: { href: string; label: string }[] = [
  { href: '/platform',             label: 'Start'        },
  { href: '/platform/agenda',      label: 'Agenda'       },
  { href: '/platform/berichten',   label: 'Berichten'    },
  { href: '/platform/documenten',  label: 'Documenten'   },
  { href: '/platform/formulieren', label: 'Formulieren'  },
  { href: '/platform/links',       label: 'Links'        },
  { href: '/platform/meldingen',   label: 'Meldingen'    },
]

const BOTTOM_NAV = [
  { href: '/platform',            label: 'Home',      icon: '🏠' },
  { href: '/platform/agenda',     label: 'Agenda',    icon: '📅' },
  { href: '/platform/berichten',  label: 'Berichten', icon: '💬' },
  { href: '/platform/documenten', label: 'Docs',      icon: '📁' },
  { href: '/platform/meldingen',  label: 'Meldingen', icon: '🔔' },
]

export default function PlatformNav() {
  const path     = usePathname()
  const router   = useRouter()
  const [name, setName]             = useState('')
  const [initials, setInitials]     = useState('?')
  const [unread, setUnread]         = useState(0)
  const [isAdmin, setIsAdmin]       = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [profileOpen, setProfile]   = useState(false)
  const [mobileOpen, setMobile]     = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ]       = useState('')
  const [searchRes, setSearchRes]   = useState<SearchResult[]>([])
  const [searching, setSearching]   = useState(false)
  const profileRef                  = useRef<HTMLDivElement>(null)
  const searchRef                   = useRef<HTMLDivElement>(null)
  const searchInputRef              = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session?.user) return
      const uid   = data.session.user.id
      const email = data.session.user.email ?? ''
      const { data: p } = await supabase
        .from('profiles')
        .select('display_name, is_admin, is_superadmin')
        .eq('id', uid).single()
      const n = p?.display_name ?? email.split('@')[0]
      setName(n)
      setInitials(n[0]?.toUpperCase() ?? '?')
      setIsAdmin(p?.is_admin ?? false)
      setIsSuperAdmin(p?.is_superadmin ?? false)

      // Unread = total notifications minus ones this user has read
      const [{ count: total }, { count: read }] = await Promise.all([
        supabase.from('notifications').select('*', { count: 'exact', head: true }),
        supabase.from('notification_reads').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      ])
      setUnread(Math.max(0, (total ?? 0) - (read ?? 0)))
    })
  }, [])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfile(false)
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50)
    else { setSearchQ(''); setSearchRes([]) }
  }, [searchOpen])

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchRes([]); return }
    setSearching(true)
    const pattern = `%${q}%`
    const [posts, docs, events] = await Promise.all([
      supabase.from('group_posts').select('id,content,group_id').ilike('content', pattern).limit(4),
      supabase.from('documents').select('id,title,subject').ilike('title', pattern).limit(4),
      supabase.from('events').select('id,title,type,start_at').ilike('title', pattern).limit(4),
    ])
    const results: SearchResult[] = [
      ...(posts.data ?? []).map(p => ({
        type: 'bericht' as const, id: p.id,
        title: (p.content as string).slice(0, 60) + ((p.content as string).length > 60 ? '…' : ''),
        sub: 'Bericht', href: `/platform/berichten/${p.group_id}`,
      })),
      ...(docs.data ?? []).map(d => ({
        type: 'document' as const, id: d.id,
        title: d.title, sub: d.subject ?? 'Document', href: '/platform/documenten',
      })),
      ...(events.data ?? []).map(e => ({
        type: 'event' as const, id: String(e.id),
        title: e.title, sub: new Date(e.start_at).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' }),
        href: '/platform/agenda',
      })),
    ]
    setSearchRes(results)
    setSearching(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => doSearch(searchQ), 300)
    return () => clearTimeout(t)
  }, [searchQ, doSearch])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  const active = (href: string) =>
    href === '/platform' ? path === '/platform' : path.startsWith(href)

  const avatarBg = isSuperAdmin ? '#9333ea' : isAdmin ? '#16a34a' : '#2563eb'
  const roleBadge = isSuperAdmin
    ? <span style={{ fontSize: 10, background: '#f3e8ff', color: '#7e22ce', borderRadius: 6, padding: '1px 5px', fontWeight: 700, marginLeft: 4 }}>Superadmin</span>
    : isAdmin
      ? <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', borderRadius: 6, padding: '1px 5px', fontWeight: 700, marginLeft: 4 }}>Admin</span>
      : null

  return (
    <>
      <header className="smsc-topnav">
        <nav className="smsc-nav">

          {/* ── Profile (left) ─────────────────────────────────── */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            <button onClick={() => setProfile(!profileOpen)} className="smsc-nav__btn" style={{ gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: avatarBg, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 12, flexShrink: 0,
              }}>
                {initials}
              </div>
              <span style={{ fontWeight: 500, fontSize: 14 }}>{name}</span>
              {roleBadge}
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ color: '#5b5b5b' }}>
                <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {profileOpen && (
              <div className="smsc-dropdown" style={{ minWidth: 200 }}>
                <Link href="/examenboard" onClick={() => setProfile(false)}>🎓 Examenboard</Link>
                <Link href="/dashboard"   onClick={() => setProfile(false)}>🌐 Taalplatform</Link>
                {isSuperAdmin && (
                  <Link href="/platform/admin/gebruikers" onClick={() => setProfile(false)}>👥 Gebruikersbeheer</Link>
                )}
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

          {/* ── Main nav items (desktop) ─────────────────────── */}
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

          <div className="smsc-nav__divider hidden md:block" />

          {/* ── Search icon ────────────────────────────────────── */}
          <div ref={searchRef} style={{ position: 'relative' }}>
            <button onClick={() => setSearchOpen(!searchOpen)}
              className="smsc-nav__btn smsc-nav__btn--icon hidden md:flex" title="Zoeken">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
              </svg>
            </button>
            {searchOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, width: 360,
                background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10,
                boxShadow: '0 8px 24px rgba(0,0,0,0.14)', zIndex: 200, overflow: 'hidden',
              }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid #f4f4f4', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                  <input ref={searchInputRef}
                    style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: '#242424' }}
                    placeholder="Zoek berichten, documenten, agenda…"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') setSearchOpen(false) }}
                  />
                  {searching && <div style={{ width: 14, height: 14, border: '2px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />}
                </div>
                {searchRes.length > 0 ? (
                  <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {searchRes.map(r => (
                      <Link key={r.id} href={r.href}
                        onClick={() => { setSearchOpen(false); setSearchQ('') }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', textDecoration: 'none', borderBottom: '1px solid #f9fafb' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#eff6ff')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ fontSize: 16, flexShrink: 0 }}>
                          {r.type === 'bericht' ? '💬' : r.type === 'document' ? '📄' : '📅'}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, color: '#242424', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</p>
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{r.sub}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : searchQ.length >= 2 && !searching ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
                    Geen resultaten voor "{searchQ}"
                  </div>
                ) : searchQ.length < 2 ? (
                  <div style={{ padding: '16px 14px', fontSize: 12, color: '#9ca3af' }}>
                    Type minimaal 2 tekens om te zoeken
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* ── Notifications icon ─────────────────────────────── */}
          <Link href="/platform/meldingen" className="smsc-nav__btn smsc-nav__btn--icon hidden md:flex" title="Meldingen">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
            {unread > 0 && <span className="smsc-nav__badge">{unread > 9 ? '9+' : unread}</span>}
          </Link>

          {/* ── Logout icon ─────────────────────────────────────── */}
          <button onClick={logout} className="smsc-nav__btn smsc-nav__btn--icon hidden md:flex" title="Afmelden">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>

          {/* ── Mobile hamburger ────────────────────────────────── */}
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

      {/* ── Mobile bottom nav ──────────────────────────────────── */}
      <nav className="smsc-bottom-nav md:hidden">
        {BOTTOM_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', textDecoration: 'none', gap: 2, padding: '4px 0',
              color: active(item.href) ? '#2563eb' : '#5b5b5b',
              borderTop: active(item.href) ? '2px solid #2563eb' : '2px solid transparent',
            }}
          >
            <span style={{ fontSize: 18, position: 'relative' }}>
              {item.icon}
              {item.href === '/platform/meldingen' && unread > 0 && (
                <span className="smsc-nav__badge" style={{ position: 'absolute', top: -4, right: -8, fontSize: 9, minWidth: 14, padding: '0 3px' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </span>
            <span style={{ fontSize: 10, fontWeight: active(item.href) ? 600 : 400 }}>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* ── Mobile hamburger menu ─────────────────────────────── */}
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
                  color: active(item.href) ? '#2563eb' : '#242424',
                  textDecoration: 'none',
                  fontSize: 14,
                  borderBottom: '1px solid #f4f4f4',
                  background: active(item.href) ? '#eff6ff' : 'transparent',
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
