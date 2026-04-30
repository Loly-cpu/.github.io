'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// ── Inline SVG icons ─────────────────────────────────────────────────────────
function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

const ICONS = {
  home:     'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10',
  calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  chat:     'M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z',
  folder:   'M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z',
  form:     'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
  link:     'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71 M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',
  bell:     'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0',
  grad:     'M22 10v6M2 10l10-5 10 5-10 5z M6 12v5c3 3 9 3 12 0v-5',
  globe:    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  users:    'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75',
  search:   'M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z',
}

// ── Nav item ─────────────────────────────────────────────────────────────────
function NavItem({ href, icon, label, badge, exact }: {
  href: string; icon: keyof typeof ICONS; label: string; badge?: number; exact?: boolean
}) {
  const path = usePathname()
  const isActive = exact ? path === href : path === href || path.startsWith(href + '/')

  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 12px', margin: '1px 8px', borderRadius: 8,
      textDecoration: 'none', fontSize: 13, fontWeight: isActive ? 600 : 400,
      color: isActive ? '#ff520e' : '#5b5b5b',
      background: isActive ? '#fff3ef' : 'transparent',
      transition: 'background 0.1s, color 0.1s',
    }}
      onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = '#f4f4f4' }}
      onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLAnchorElement).style.background = 'transparent' }}
    >
      <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>
        <Icon d={ICONS[icon]} size={16} />
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge && badge > 0 ? (
        <span style={{
          background: '#ef4444', color: '#fff', borderRadius: 10,
          fontSize: 10, fontWeight: 700, padding: '1px 5px', minWidth: 16, textAlign: 'center',
        }}>
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </Link>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{ padding: '10px 20px 4px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {label}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: '#f4f4f4', margin: '6px 0' }} />
}

// ── Main sidebar ─────────────────────────────────────────────────────────────
export default function AppSidebar() {
  const [unread, setUnread]       = useState(0)
  const [isAdmin, setIsAdmin]     = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const uid = data.session.user.id
      const { data: p } = await supabase
        .from('profiles')
        .select('is_admin, is_superadmin')
        .eq('id', uid).single()
      setIsAdmin(p?.is_admin ?? false)
      setIsSuperAdmin(p?.is_superadmin ?? false)

      const [{ count: total }, { count: read }] = await Promise.all([
        supabase.from('notifications').select('*', { count: 'exact', head: true }),
        supabase.from('notification_reads').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      ])
      setUnread(Math.max(0, (total ?? 0) - (read ?? 0)))
    })
  }, [])

  return (
    <aside className="app-sidebar">
      {/* Logo — always links back to /platform */}
      <Link href="/platform" style={{
        height: 48, display: 'flex', alignItems: 'center', padding: '0 16px',
        borderBottom: '1px solid #f4f4f4', flexShrink: 0, textDecoration: 'none',
        transition: 'background 0.1s',
      }}
        onMouseEnter={e => (e.currentTarget.style.background = '#fff3ef')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: '#ff520e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0,
        }}>S</div>
        <span style={{ marginLeft: 10, fontWeight: 700, fontSize: 14, color: '#242424' }}>
          Schoolplatform
        </span>
      </Link>

      {/* Navigation */}
      <nav style={{ padding: '8px 0', overflowY: 'auto', flex: 1 }}>
        <NavItem href="/platform" icon="home"     label="Start"       exact />
        <NavItem href="/platform/agenda"      icon="calendar" label="Agenda" />
        <NavItem href="/platform/berichten"   icon="chat"     label="Berichten" />
        <NavItem href="/platform/documenten"  icon="folder"   label="Documenten" />
        <NavItem href="/platform/formulieren" icon="form"     label="Formulieren" />
        <NavItem href="/platform/links"       icon="link"     label="Links" />
        <NavItem href="/platform/meldingen"   icon="bell"     label="Meldingen" badge={unread} />

        <Divider />
        <SectionLabel label="Modules" />
        <NavItem href="/examenboard" icon="grad"  label="Examenboard" />
        <NavItem href="/dashboard"   icon="globe" label="Taalplatform" />

        {(isAdmin || isSuperAdmin) && (
          <>
            <Divider />
            <SectionLabel label="Beheer" />
            {isSuperAdmin && (
              <NavItem href="/platform/admin/gebruikers" icon="users" label="Gebruikers" />
            )}
            <NavItem href="/platform/admin/feedback" icon="chat" label="Feedback" />
          </>
        )}
      </nav>
    </aside>
  )
}
