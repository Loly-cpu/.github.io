'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface SearchResult {
  type: 'bericht' | 'document' | 'event'
  id: string; title: string; sub?: string; href: string
}

const FB = '#1877F2'

/* ── SVG iconen exact zoals Facebook gebruikt ── */
function IconHome({ active }: { active: boolean }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? FB : '#65676B'}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
}
function IconWatch({ active }: { active: boolean }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? FB : '#65676B'}><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>
}
function IconGroups({ active }: { active: boolean }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? FB : '#65676B'}><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
}
function IconMarketplace({ active }: { active: boolean }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? FB : '#65676B'}><path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm0 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
}
function IconGaming({ active }: { active: boolean }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill={active ? FB : '#65676B'}><path d="M20.5 6h-17l1.35 9.4C5.18 17.4 6.41 18.5 7.8 18.5h8.4c1.39 0 2.62-1.1 2.95-2.6L20.5 6zm-11.5 7H7v2H5v-2H3v-2h2V9h2v2h2v2zm4.25 1.5c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25S14.5 12.56 14.5 13.25 13.94 14.5 13.25 14.5zm2.5-3c-.69 0-1.25-.56-1.25-1.25S15.06 9 15.75 9 17 9.56 17 10.25s-.56 1.25-1.25 1.25z"/></svg>
}
function IconBell({ unread }: { unread: number }) {
  return (
    <div style={{ position: 'relative' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="#1C1E21"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
      {unread > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: '#E41E3F', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 4px', minWidth: 16, textAlign: 'center', border: '2px solid #fff', lineHeight: '14px' }}>{unread > 9 ? '9+' : unread}</span>}
    </div>
  )
}
function IconMessenger() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="#1C1E21"><path d="M12 2C6.36 2 2 6.13 2 11.7c0 2.91 1.19 5.44 3.14 7.17.16.13.26.35.27.59l.05 1.84c.03.72.76 1.19 1.41.89l2.05-.91c.17-.08.36-.09.54-.03 .76.22 1.56.33 2.51.33 5.63 0 10-4.13 10-9.7 0-5.57-4.36-9.7-10-9.7zM7.9 14.5l-2.55-2.7 4.98-2.63 2.6 2.61 4.95-2.61-2.58 2.73-4.95 2.62L7.9 14.5z"/></svg>
}
function IconMenu() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="#1C1E21"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="5" cy="5" r="2"/><circle cx="5" cy="12" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="5" r="2"/><circle cx="19" cy="12" r="2"/><circle cx="19" cy="19" r="2"/></svg>
}

const CENTER_TABS = [
  { href: '/platform',             Icon: IconHome,        label: 'Start',     exact: true },
  { href: '/platform/berichten',   Icon: IconGroups,      label: 'Berichten' },
  { href: '/examenboard',          Icon: IconWatch,       label: 'Examenboard' },
  { href: '/platform/agenda',      Icon: IconMarketplace, label: 'Agenda' },
  { href: '/dashboard',            Icon: IconGaming,      label: 'Taalplatform' },
]

export default function AppTopbar() {
  const router   = useRouter()
  const path     = usePathname()
  const [name, setName]           = useState('')
  const [initials, setInitials]   = useState('?')
  const [isAdmin, setIsAdmin]     = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ]     = useState('')
  const [searchRes, setSearchRes] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [unread, setUnread]       = useState(0)
  const menuRef   = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session?.user) return
      const uid = data.session.user.id
      const email = data.session.user.email ?? ''
      const { data: p } = await supabase.from('profiles').select('display_name, is_admin, is_superadmin, is_blocked').eq('id', uid).single()
      if (p?.is_blocked) { router.replace('/auth/geblokkeerd'); return }
      const n = p?.display_name ?? email.split('@')[0]
      setName(n); setInitials(n[0]?.toUpperCase() ?? '?')
      setIsAdmin(p?.is_admin ?? false)
      setIsSuperAdmin(p?.is_superadmin ?? false)
      const [{ count: total }, { count: read }] = await Promise.all([
        supabase.from('notifications').select('*', { count: 'exact', head: true }),
        supabase.from('notification_reads').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      ])
      setUnread(Math.max(0, (total ?? 0) - (read ?? 0)))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInput.current?.focus(), 40)
    else { setSearchQ(''); setSearchRes([]) }
  }, [searchOpen])

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchRes([]); return }
    setSearching(true)
    const pat = `%${q}%`
    const [posts, docs, evts] = await Promise.all([
      supabase.from('group_posts').select('id,content,group_id').ilike('content', pat).limit(4),
      supabase.from('documents').select('id,title,subject').ilike('title', pat).limit(4),
      supabase.from('events').select('id,title,start_at').ilike('title', pat).limit(4),
    ])
    setSearchRes([
      ...(posts.data ?? []).map(p => ({ type: 'bericht' as const, id: p.id, title: String(p.content).slice(0,60)+'…', sub: 'Bericht', href: `/platform/berichten/${p.group_id}` })),
      ...(docs.data  ?? []).map(d => ({ type: 'document' as const, id: d.id, title: d.title, sub: d.subject ?? 'Document', href: '/platform/documenten' })),
      ...(evts.data  ?? []).map(e => ({ type: 'event' as const, id: String(e.id), title: e.title, sub: new Date(e.start_at).toLocaleDateString('nl-BE',{day:'numeric',month:'short'}), href: '/platform/agenda' })),
    ])
    setSearching(false)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => doSearch(searchQ), 300)
    return () => clearTimeout(t)
  }, [searchQ, doSearch])

  async function logout() { await supabase.auth.signOut(); router.replace('/auth/login') }

  function isActive(href: string, exact?: boolean) {
    return exact ? path === href : path === href || path.startsWith(href + '/')
  }

  const avatarBg = isSuperAdmin ? '#9333ea' : isAdmin ? '#16a34a' : FB

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 56,
      background: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,.1), 0 8px 16px rgba(0,0,0,.06)',
      zIndex: 50, display: 'flex', alignItems: 'stretch',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    }}>

      {/* ── Links: logo + zoek ─────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', flexShrink: 0, minWidth: 240 }}>
        <Link href="/platform" style={{ display: 'flex', textDecoration: 'none', flexShrink: 0 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: FB, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="24" height="24" viewBox="0 0 50 39" fill="white">
              <path d="M16.4992 2H37.5808L22.0816 24.9729H1L16.4992 2Z" />
              <path d="M17.4224 27.102L11.4192 36H33.5008L49 13.0271H32.7024L23.2064 27.102H17.4224Z" />
            </svg>
          </div>
        </Link>

        {/* Zoekbalk — exact Facebook pill */}
        <div ref={searchRef} style={{ position: 'relative' }}>
          <button onClick={() => setSearchOpen(!searchOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F0F2F5', border: 'none', borderRadius: 20, padding: '0 16px', height: 40, cursor: 'pointer', color: '#65676B', fontSize: 15, whiteSpace: 'nowrap' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#65676B" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <span className="hidden md:inline">Zoeken</span>
          </button>

          {searchOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, width: 360, background: '#fff', borderRadius: 8, boxShadow: '0 12px 28px rgba(0,0,0,.2)', zIndex: 200 }}>
              <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#65676B" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                <input ref={searchInput}
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#1C1E21', background: 'transparent', fontFamily: 'inherit' }}
                  placeholder="Zoek op het platform…"
                  value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)} />
                {searching && <div style={{ width: 14, height: 14, border: `2px solid ${FB}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin .6s linear infinite', flexShrink: 0 }} />}
              </div>
              {searchRes.length > 0 && (
                <div style={{ borderTop: '1px solid #E4E6EB', maxHeight: 320, overflowY: 'auto' }}>
                  {searchRes.map(r => (
                    <Link key={r.id} href={r.href} onClick={() => { setSearchOpen(false); setSearchQ('') }}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', textDecoration: 'none' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F2F2F2')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E4E6EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                        {r.type === 'bericht' ? '💬' : r.type === 'document' ? '📄' : '📅'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 15, color: '#1C1E21', margin: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</p>
                        <p style={{ fontSize: 13, color: '#65676B', margin: 0 }}>{r.sub}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              {searchQ.length >= 2 && !searching && searchRes.length === 0 && (
                <div style={{ padding: '16px', textAlign: 'center', color: '#65676B', fontSize: 14 }}>Geen resultaten</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Midden: nav tabs (exact Facebook) ─────────────── */}
      <div className="hidden md:flex" style={{ flex: 1, justifyContent: 'center', alignItems: 'stretch' }}>
        {CENTER_TABS.map(({ href, Icon, label, exact }) => {
          const active = isActive(href, exact)
          return (
            <Link key={href} href={href}
              title={label}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 112, padding: '0 4px', textDecoration: 'none',
                position: 'relative', borderBottom: active ? `3px solid ${FB}` : '3px solid transparent',
                transition: 'border-color .1s',
              }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 100, height: 36, borderRadius: 8,
                background: 'transparent', transition: 'background .1s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F2F2F2')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <Icon active={active} />
              </div>
            </Link>
          )
        })}
      </div>

      {/* ── Rechts: iconen + profiel ────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px', flexShrink: 0, minWidth: 240, justifyContent: 'flex-end' }}>

        {/* Grid/Create button */}
        <button style={{ width: 40, height: 40, borderRadius: '50%', background: '#E4E6EB', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .1s' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#D8DADF')}
          onMouseLeave={e => (e.currentTarget.style.background = '#E4E6EB')}>
          <IconMenu />
        </button>

        {/* Messenger */}
        <button style={{ width: 40, height: 40, borderRadius: '50%', background: '#E4E6EB', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background .1s' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#D8DADF')}
          onMouseLeave={e => (e.currentTarget.style.background = '#E4E6EB')}>
          <IconMessenger />
        </button>

        {/* Notifications */}
        <Link href="/platform/meldingen" style={{ width: 40, height: 40, borderRadius: '50%', background: '#E4E6EB', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', transition: 'background .1s', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = '#D8DADF')}
          onMouseLeave={e => (e.currentTarget.style.background = '#E4E6EB')}>
          <IconBell unread={unread} />
        </Link>

        {/* Profile avatar */}
        <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setMenuOpen(!menuOpen)}
            style={{ width: 40, height: 40, borderRadius: '50%', background: avatarBg, border: menuOpen ? `2px solid ${FB}` : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, transition: 'border-color .1s' }}>
            {initials}
          </button>

          {menuOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 360, background: '#fff', borderRadius: 8, boxShadow: '0 12px 28px rgba(0,0,0,.2)', zIndex: 200, overflow: 'hidden' }}>
              {/* Profile card */}
              <div style={{ padding: '12px 8px 8px' }}>
                <Link href="/platform" onClick={() => setMenuOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, textDecoration: 'none', background: '#fff' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F2F2F2')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: avatarBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, flexShrink: 0 }}>{initials}</div>
                  <div>
                    <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1C1E21' }}>{name}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 14, color: '#65676B' }}>Bekijk jouw profiel</p>
                  </div>
                </Link>
              </div>

              <div style={{ height: 8, background: '#F0F2F5' }} />

              {/* Menu items */}
              <div style={{ padding: '8px' }}>
                {isSuperAdmin && (
                  <Link href="/platform/admin/gebruikers" onClick={() => setMenuOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F2F2F2')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E4E6EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>⚙️</div>
                    <span style={{ fontSize: 15, fontWeight: 500, color: '#1C1E21' }}>Beheer</span>
                  </Link>
                )}
                <button onClick={logout}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, textAlign: 'left' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F2F2F2')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E4E6EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🚪</div>
                  <div>
                    <p style={{ margin: 0, fontSize: 15, fontWeight: 500, color: '#1C1E21' }}>Afmelden</p>
                    <p style={{ margin: 0, fontSize: 13, color: '#65676B' }}>Uitloggen uit jouw account</p>
                  </div>
                </button>
              </div>

              <div style={{ borderTop: '1px solid #E4E6EB', padding: '10px 16px' }}>
                <p style={{ margin: 0, fontSize: 12, color: '#65676B' }}>Schoolplatform · Privacy · Voorwaarden</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
