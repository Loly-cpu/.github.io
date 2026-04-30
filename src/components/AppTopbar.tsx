'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface SearchResult {
  type: 'bericht' | 'document' | 'event'
  id: string; title: string; sub?: string; href: string
}

function ModuleBreadcrumb() {
  const path = usePathname()
  let module: { icon: string; label: string } | null = null
  if (path.startsWith('/examenboard'))                              module = { icon: '🎓', label: 'Examenboard' }
  else if (path.startsWith('/dashboard') || path.startsWith('/learn') || path.startsWith('/placement')) module = { icon: '🌐', label: 'Taalplatform' }

  if (!module) return null
  return (
    <div className="hidden md:flex" style={{ alignItems: 'center', gap: 6, padding: '0 8px', flexShrink: 0 }}>
      <Link href="/platform" style={{
        display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none',
        color: '#5b5b5b', fontSize: 12, fontWeight: 500, padding: '4px 8px', borderRadius: 6,
        transition: 'background 0.1s',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = '#f4f4f4')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
        Platform
      </Link>
      <span style={{ color: '#d1d5db', fontSize: 12 }}>/</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: '#242424' }}>
        {module.icon} {module.label}
      </span>
    </div>
  )
}

export default function AppTopbar() {
  const router = useRouter()
  const [name, setName]       = useState('')
  const [initials, setInitials] = useState('?')
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ]   = useState('')
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
        .select('display_name, is_admin, is_superadmin').eq('id', uid).single()
      const n = p?.display_name ?? email.split('@')[0]
      setName(n)
      setInitials(n[0]?.toUpperCase() ?? '?')
      setIsAdmin(p?.is_admin ?? false)
      setIsSuperAdmin(p?.is_superadmin ?? false)
    })
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
      ...(evts.data  ?? []).map(e => ({ type: 'event' as const,   id: String(e.id), title: e.title, sub: new Date(e.start_at).toLocaleDateString('nl-BE',{day:'numeric',month:'short'}), href: '/platform/agenda' })),
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

  const avatarBg = isSuperAdmin ? '#9333ea' : isAdmin ? '#16a34a' : '#ff520e'

  return (
    <header className="app-topbar">
      {/* Mobile: hamburger */}
      <button
        className="md:hidden"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: '#5b5b5b', flexShrink: 0 }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 12h18M3 6h18M3 18h18"/>
        </svg>
      </button>

      {/* Mobile logo */}
      <Link href="/platform" className="md:hidden" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
        <div style={{ width: 24, height: 24, borderRadius: 6, background: '#ff520e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12 }}>S</div>
        <span style={{ fontWeight: 700, fontSize: 13, color: '#242424' }}>Platform</span>
      </Link>

      {/* Desktop: module breadcrumb — shows when NOT on /platform */}
      <ModuleBreadcrumb />

      <div style={{ flex: 1 }} />

      {/* Search */}
      <div ref={searchRef} style={{ position: 'relative' }}>
        <button onClick={() => setSearchOpen(!searchOpen)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f4f4f4', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#5b5b5b', fontSize: 13 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <span className="hidden md:inline">Zoeken…</span>
        </button>

        {searchOpen && (
          <div style={{ position: 'absolute', top: '100%', right: 0, width: 340, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.14)', zIndex: 200, overflow: 'hidden', marginTop: 4 }}>
            <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f4f4f4' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input ref={searchInput}
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, color: '#242424' }}
                placeholder="Zoek berichten, documenten, agenda…"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setSearchOpen(false)}
              />
              {searching && <div style={{ width: 12, height: 12, border: '2px solid #ff520e', borderTopColor: 'transparent', borderRadius: '50%', flexShrink: 0, animation: 'spin 0.6s linear infinite' }} />}
            </div>
            {searchRes.length > 0 ? (
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {searchRes.map(r => (
                  <Link key={r.id} href={r.href}
                    onClick={() => { setSearchOpen(false); setSearchQ('') }}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', textDecoration: 'none', borderBottom: '1px solid #f9fafb' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fff3ef')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: 15 }}>{r.type === 'bericht' ? '💬' : r.type === 'document' ? '📄' : '📅'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: '#242424', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{r.sub}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : searchQ.length >= 2 && !searching ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Geen resultaten voor "{searchQ}"</div>
            ) : (
              <div style={{ padding: '12px 14px', fontSize: 12, color: '#9ca3af' }}>Type om te zoeken…</div>
            )}
          </div>
        )}
      </div>

      {/* User menu */}
      <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button onClick={() => setMenuOpen(!menuOpen)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: avatarBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
            {initials}
          </div>
          <span className="hidden md:inline" style={{ fontSize: 13, fontWeight: 500, color: '#242424' }}>{name}</span>
          {isSuperAdmin && (
            <span className="hidden md:inline" style={{ fontSize: 10, background: '#f3e8ff', color: '#7e22ce', borderRadius: 6, padding: '1px 5px', fontWeight: 700 }}>SA</span>
          )}
          {isAdmin && !isSuperAdmin && (
            <span className="hidden md:inline" style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', borderRadius: 6, padding: '1px 5px', fontWeight: 700 }}>A</span>
          )}
        </button>

        {menuOpen && (
          <div style={{ position: 'absolute', top: '100%', right: 0, width: 200, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 200, overflow: 'hidden', marginTop: 4 }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f4f4f4' }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#242424', margin: 0 }}>{name}</p>
              {isSuperAdmin && <p style={{ fontSize: 11, color: '#7e22ce', margin: '1px 0 0', fontWeight: 600 }}>Superadmin</p>}
              {isAdmin && !isSuperAdmin && <p style={{ fontSize: 11, color: '#15803d', margin: '1px 0 0', fontWeight: 600 }}>Admin</p>}
            </div>
            <button onClick={logout}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#5b5b5b', textAlign: 'left' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f4f4f4')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Afmelden
            </button>
          </div>
        )}
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex' }}
          onClick={() => setMobileMenuOpen(false)}>
          <div style={{ width: 260, background: '#fff', height: '100%', borderRight: '1px solid #e8e8e8', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <MobileNavItems onClose={() => setMobileMenuOpen(false)} />
          </div>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.4)' }} />
        </div>
      )}
    </header>
  )
}

function MobileNavItems({ onClose }: { onClose: () => void }) {
  const path = usePathname()
  const router = useRouter()

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  const items = [
    { href: '/platform',             label: '🏠 Start',       exact: true },
    { href: '/platform/agenda',      label: '📅 Agenda' },
    { href: '/platform/berichten',   label: '💬 Berichten' },
    { href: '/platform/documenten',  label: '📁 Documenten' },
    { href: '/platform/formulieren', label: '📝 Formulieren' },
    { href: '/platform/links',       label: '🔗 Links' },
    { href: '/platform/meldingen',   label: '🔔 Meldingen' },
    { href: '/examenboard',          label: '🎓 Examenboard' },
    { href: '/dashboard',            label: '🌐 Taalplatform' },
  ]

  return (
    <nav style={{ padding: '8px 0' }}>
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #f4f4f4', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: '#ff520e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12 }}>S</div>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Schoolplatform</span>
        </div>
      </div>
      {items.map(item => {
        const active = item.exact ? path === item.href : path.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href} onClick={onClose}
            style={{ display: 'block', padding: '12px 20px', fontSize: 14, fontWeight: active ? 600 : 400, color: active ? '#ff520e' : '#242424', textDecoration: 'none', background: active ? '#fff3ef' : 'transparent', borderBottom: '1px solid #f4f4f4' }}>
            {item.label}
          </Link>
        )
      })}
      <button onClick={logout}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#5b5b5b', borderTop: '1px solid #e8e8e8', marginTop: 8 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        Afmelden
      </button>
    </nav>
  )
}

