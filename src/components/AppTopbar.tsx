'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { SearchIcon, LogOutIcon, SettingsIcon } from 'lucide-react'

interface SearchResult {
  type: 'bericht' | 'document' | 'event'
  id: string; title: string; sub?: string; href: string
}

const FB = '#1877F2'

export default function AppTopbar() {
  const router = useRouter()
  const [name, setName]           = useState('')
  const [initials, setInitials]   = useState('?')
  const [isAdmin, setIsAdmin]     = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ]     = useState('')
  const [searchRes, setSearchRes] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const menuRef     = useRef<HTMLDivElement>(null)
  const searchRef   = useRef<HTMLDivElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session?.user) return
      const uid   = data.session.user.id
      const email = data.session.user.email ?? ''
      const { data: p } = await supabase.from('profiles')
        .select('display_name, is_admin, is_superadmin, is_blocked').eq('id', uid).single()
      if (p?.is_blocked) { router.replace('/auth/geblokkeerd'); return }
      const n = p?.display_name ?? email.split('@')[0]
      setName(n)
      setInitials(n[0]?.toUpperCase() ?? '?')
      setIsAdmin(p?.is_admin ?? false)
      setIsSuperAdmin(p?.is_superadmin ?? false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current   && !menuRef.current.contains(e.target as Node))   setMenuOpen(false)
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

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  const avatarBg = isSuperAdmin ? '#9333ea' : isAdmin ? '#16a34a' : FB

  return (
    <header className="app-topbar">

      {/* Logo — Facebook-stijl blauwe cirkel met "S" */}
      <Link href="/platform" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: FB, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 50 39" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.4992 2H37.5808L22.0816 24.9729H1L16.4992 2Z" />
            <path d="M17.4224 27.102L11.4192 36H33.5008L49 13.0271H32.7024L23.2064 27.102H17.4224Z" />
          </svg>
        </div>
        <span className="hidden md:block" style={{ fontWeight: 800, fontSize: 20, color: FB, letterSpacing: '-0.5px' }}>school</span>
      </Link>

      {/* Zoekbalk — Facebook-stijl grijs afgerond */}
      <div ref={searchRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button onClick={() => setSearchOpen(!searchOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#F0F2F5', border: 'none', borderRadius: 20,
            padding: '8px 16px', cursor: 'pointer', color: '#65676B',
            fontSize: 15, minWidth: 40,
          }}>
          <SearchIcon size={16} color="#65676B" />
          <span className="hidden md:inline">Zoeken</span>
        </button>

        {searchOpen && (
          <div style={{ position: 'absolute', top: '100%', left: 0, width: 360, background: '#fff', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.18)', zIndex: 200, overflow: 'hidden', marginTop: 6 }}>
            <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #E4E6EB' }}>
              <SearchIcon size={16} color="#65676B" />
              <input ref={searchInput}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: '#1C1E21', background: 'transparent' }}
                placeholder="Zoek berichten, documenten, agenda…"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)}
              />
              {searching && <div style={{ width: 14, height: 14, border: `2px solid ${FB}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite', flexShrink: 0 }} />}
            </div>
            {searchRes.length > 0 ? (
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {searchRes.map(r => (
                  <Link key={r.id} href={r.href}
                    onClick={() => { setSearchOpen(false); setSearchQ('') }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F0F2F5')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E4E6EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                      {r.type === 'bericht' ? '💬' : r.type === 'document' ? '📄' : '📅'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 15, color: '#1C1E21', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{r.title}</p>
                      <p style={{ fontSize: 13, color: '#65676B', margin: 0 }}>{r.sub}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : searchQ.length >= 2 && !searching ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#65676B', fontSize: 14 }}>Geen resultaten voor &quot;{searchQ}&quot;</div>
            ) : (
              <div style={{ padding: '14px', fontSize: 14, color: '#65676B' }}>Type om te zoeken…</div>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* Rechts: profiel avatar + naam */}
      <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: menuOpen ? '#E7F3FF' : 'none', border: 'none', cursor: 'pointer',
            padding: '4px 8px 4px 4px', borderRadius: 20, transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (!menuOpen) e.currentTarget.style.background = '#F0F2F5' }}
          onMouseLeave={e => { if (!menuOpen) e.currentTarget.style.background = 'transparent' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15 }}>
            {initials}
          </div>
          <span className="hidden md:inline" style={{ fontSize: 15, fontWeight: 600, color: '#1C1E21' }}>{name}</span>
          {isSuperAdmin && <span className="hidden md:inline" style={{ fontSize: 10, background: '#f3e8ff', color: '#7e22ce', borderRadius: 6, padding: '2px 6px', fontWeight: 700 }}>SA</span>}
          {isAdmin && !isSuperAdmin && <span className="hidden md:inline" style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', borderRadius: 6, padding: '2px 6px', fontWeight: 700 }}>A</span>}
        </button>

        {menuOpen && (
          <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 240, background: '#fff', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.16)', zIndex: 200, overflow: 'hidden' }}>
            {/* Profile row */}
            <Link href="/platform" onClick={() => setMenuOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', textDecoration: 'none', borderBottom: '1px solid #E4E6EB' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F0F2F5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: avatarBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, flexShrink: 0 }}>{initials}</div>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1C1E21' }}>{name}</p>
                <p style={{ margin: '1px 0 0', fontSize: 13, color: '#65676B' }}>Profiel bekijken</p>
              </div>
            </Link>

            <div style={{ padding: '6px' }}>
              {isSuperAdmin && (
                <Link href="/platform/admin/gebruikers" onClick={() => setMenuOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 8, textDecoration: 'none', color: '#1C1E21' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F0F2F5')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E4E6EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SettingsIcon size={18} color="#1C1E21" />
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>Beheer</span>
                </Link>
              )}
              <button onClick={logout}
                style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 8, textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F0F2F5')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E4E6EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LogOutIcon size={18} color="#1C1E21" />
                </div>
                <span style={{ fontSize: 15, fontWeight: 500, color: '#1C1E21' }}>Afmelden</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile hamburger */}
      <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{ background: '#F0F2F5', border: 'none', cursor: 'pointer', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1C1E21" strokeWidth="2.5">
          <path d="M3 12h18M3 6h18M3 18h18"/>
        </svg>
      </button>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}
          onClick={() => setMobileMenuOpen(false)}>
          <div style={{ width: 280, background: '#fff', height: '100%', overflowY: 'auto', boxShadow: '4px 0 16px rgba(0,0,0,0.15)' }}
            onClick={e => e.stopPropagation()}>
            <MobileNavItems onClose={() => setMobileMenuOpen(false)} onLogout={logout} name={name} initials={initials} avatarBg={avatarBg} />
          </div>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.5)' }} />
        </div>
      )}
    </header>
  )
}

function MobileNavItems({ onClose, onLogout, name, initials, avatarBg }: {
  onClose: () => void; onLogout: () => void; name: string; initials: string; avatarBg: string
}) {
  const path = usePathname()

  const items = [
    { href: '/platform',             label: 'Start',         icon: '🏠', exact: true },
    { href: '/platform/agenda',      label: 'Agenda',        icon: '📅' },
    { href: '/platform/berichten',   label: 'Berichten',     icon: '💬' },
    { href: '/platform/cijfers',     label: 'Cijfers',       icon: '📊' },
    { href: '/platform/documenten',  label: 'Documenten',    icon: '📁' },
    { href: '/platform/formulieren', label: 'Formulieren',   icon: '📝' },
    { href: '/platform/links',       label: 'Links',         icon: '🔗' },
    { href: '/platform/meldingen',   label: 'Meldingen',     icon: '🔔' },
    { href: '/examenboard',          label: 'Examenboard',   icon: '🎓' },
    { href: '/dashboard',            label: 'Taalplatform',  icon: '🌐' },
  ]

  return (
    <nav style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <div style={{ padding: '16px', borderBottom: '1px solid #E4E6EB', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: avatarBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>{initials}</div>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#1C1E21' }}>{name}</span>
      </div>
      {items.map(item => {
        const active = item.exact ? path === item.href : path.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href} onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', fontSize: 15, fontWeight: active ? 700 : 400, color: active ? FB : '#1C1E21', textDecoration: 'none', background: active ? '#E7F3FF' : 'transparent' }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
      <div style={{ height: 1, background: '#E4E6EB', margin: '8px 0' }} />
      <button onClick={onLogout}
        style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#1C1E21' }}>
        <span style={{ fontSize: 20 }}>🚪</span>
        Afmelden
      </button>
    </nav>
  )
}
