'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

/* ── Exacte Facebook sidebar icon kleuren ── */
const ITEMS = [
  { href: '/platform',             label: 'Start',        emoji: '🏠', bg: '#1877F2', exact: true },
  { href: '/platform/berichten',   label: 'Berichten',    emoji: '💬', bg: '#1877F2' },
  { href: '/platform/cijfers',     label: 'Cijfers',      emoji: '📊', bg: '#02B875' },
  { href: '/platform/agenda',      label: 'Agenda',       emoji: '📅', bg: '#E4409E' },
  { href: '/platform/documenten',  label: 'Documenten',   emoji: '📁', bg: '#F5C400' },
  { href: '/platform/formulieren', label: 'Formulieren',  emoji: '📝', bg: '#FF7043' },
  { href: '/platform/links',       label: 'Links',        emoji: '🔗', bg: '#8B5CF6' },
  { href: '/platform/meldingen',   label: 'Meldingen',    emoji: '🔔', bg: '#E41E3F', badge: true },
]
const MODULES = [
  { href: '/examenboard', label: 'Examenboard', emoji: '🎓', bg: '#1877F2' },
  { href: '/dashboard',   label: 'Taalplatform',emoji: '🌐', bg: '#02B875' },
]

export default function AppSidebar() {
  const path = usePathname()
  const [open,         setOpen]         = useState(true)
  const [unread,       setUnread]       = useState(0)
  const [isAdmin,      setIsAdmin]      = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [displayName,  setDisplayName]  = useState('')
  const [initials,     setInitials]     = useState('?')
  const [avatarBg,     setAvatarBg]     = useState('#1877F2')

  useEffect(() => {
    const stored = localStorage.getItem('sidebar-collapsed')
    if (stored === 'true') setOpen(false)
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebar-collapsed', String(!open))
    document.body.classList.toggle('sidebar-collapsed', !open)
  }, [open])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const uid = data.session.user.id
      const { data: p } = await supabase.from('profiles').select('display_name,is_admin,is_superadmin').eq('id', uid).single()
      setIsAdmin(p?.is_admin ?? false); setIsSuperAdmin(p?.is_superadmin ?? false)
      const n = p?.display_name ?? data.session.user.email?.split('@')[0] ?? '?'
      setDisplayName(n); setInitials(n[0]?.toUpperCase() ?? '?')
      setAvatarBg(p?.is_superadmin ? '#9333ea' : p?.is_admin ? '#16a34a' : '#1877F2')
      const [{ count: tot }, { count: rd }] = await Promise.all([
        supabase.from('notifications').select('*', { count: 'exact', head: true }),
        supabase.from('notification_reads').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      ])
      setUnread(Math.max(0, (tot ?? 0) - (rd ?? 0)))
    })
  }, [])

  function isActive(href: string, exact?: boolean) {
    return exact ? path === href : path === href || path.startsWith(href + '/')
  }

  /* ── Exact Facebook sidebar item ── */
  function SidebarItem({ href, label, emoji, bg, badge, exact }: { href: string; label: string; emoji: string; bg: string; badge?: boolean; exact?: boolean }) {
    const act   = isActive(href, exact)
    const count = badge ? unread : 0
    return (
      <Link href={href}
        style={{
          display: 'flex', alignItems: 'center', gap: open ? 12 : 0,
          height: 56, padding: open ? '0 8px' : '0',
          justifyContent: open ? 'flex-start' : 'center',
          borderRadius: 8, textDecoration: 'none',
          background: act ? '#E7F3FF' : 'transparent',
          transition: 'background .1s', position: 'relative',
        }}
        onMouseEnter={e => { if (!act) e.currentTarget.style.background = '#F2F2F2' }}
        onMouseLeave={e => { if (!act) e.currentTarget.style.background = 'transparent' }}>

        {/* Icon circle — exact Facebook colored circle */}
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: act ? bg : '#E4E6EB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
          filter: act ? 'none' : 'grayscale(1) opacity(0.7)',
          transition: 'background .1s, filter .1s',
        }}>
          {emoji}
        </div>

        {/* Label */}
        {open && (
          <span style={{ fontSize: 15, fontWeight: act ? 700 : 400, color: '#1C1E21', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {label}
          </span>
        )}

        {/* Badge */}
        {count > 0 && open && (
          <span style={{ background: '#E41E3F', color: '#fff', borderRadius: 10, fontSize: 11, fontWeight: 700, padding: '2px 6px', minWidth: 20, textAlign: 'center', flexShrink: 0 }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
        {count > 0 && !open && (
          <span style={{ position: 'absolute', top: 10, right: 8, width: 8, height: 8, borderRadius: '50%', background: '#E41E3F', border: '2px solid #fff' }} />
        )}
      </Link>
    )
  }

  return (
    <div className="app-sidebar" style={{ width: open ? 280 : 72, minWidth: open ? 280 : 72, padding: '8px', overflowX: 'hidden' }}>

      {/* Profile link — exact Facebook */}
      <Link href="/platform"
        style={{
          display: 'flex', alignItems: 'center', gap: open ? 12 : 0,
          height: 56, padding: open ? '0 8px' : '0',
          justifyContent: open ? 'flex-start' : 'center',
          borderRadius: 8, textDecoration: 'none',
          transition: 'background .1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F2F2F2')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
          {initials}
        </div>
        {open && <span style={{ fontSize: 15, fontWeight: 600, color: '#1C1E21', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>}
      </Link>

      {/* Divider */}
      <div style={{ height: 1, background: '#E4E6EB', margin: '8px 4px' }} />

      {/* Main nav */}
      {ITEMS.map(item => <SidebarItem key={item.href} {...item} />)}

      {/* Divider + Modules */}
      <div style={{ height: 1, background: '#E4E6EB', margin: '8px 4px' }} />
      {open && <p style={{ margin: '4px 8px 4px', fontSize: 12, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Modules</p>}
      {MODULES.map(item => <SidebarItem key={item.href} {...item} />)}

      {/* Admin */}
      {(isAdmin || isSuperAdmin) && (
        <>
          <div style={{ height: 1, background: '#E4E6EB', margin: '8px 4px' }} />
          {open && <p style={{ margin: '4px 8px 4px', fontSize: 12, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Beheer</p>}
          {isSuperAdmin && <SidebarItem href="/platform/admin/gebruikers" label="Gebruikers" emoji="👥" bg="#8B5CF6" />}
          <SidebarItem href="/platform/admin/feedback" label="Feedback" emoji="💌" bg="#E4409E" />
        </>
      )}

      {/* Spacer + collapse */}
      <div style={{ flex: 1 }} />
      <div style={{ height: 1, background: '#E4E6EB', margin: '8px 4px' }} />
      <button onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: open ? 12 : 0,
          height: 56, padding: open ? '0 8px' : '0',
          justifyContent: open ? 'flex-start' : 'center',
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          borderRadius: 8, transition: 'background .1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#F2F2F2')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E4E6EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18 }}>
          {open ? '◀' : '▶'}
        </div>
        {open && <span style={{ fontSize: 15, fontWeight: 400, color: '#1C1E21' }}>Inklappen</span>}
      </button>
    </div>
  )
}
