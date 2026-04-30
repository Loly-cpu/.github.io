'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  HomeIcon, CalendarIcon, MessageCircleIcon, FolderIcon,
  ClipboardListIcon, LinkIcon, BellIcon, GraduationCapIcon,
  GlobeIcon, UsersIcon, MessageSquareIcon, ChevronsRightIcon,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/platform',             Icon: HomeIcon,           label: 'Start',        exact: true },
  { href: '/platform/agenda',      Icon: CalendarIcon,       label: 'Agenda' },
  { href: '/platform/berichten',   Icon: MessageCircleIcon,  label: 'Berichten' },
  { href: '/platform/documenten',  Icon: FolderIcon,         label: 'Documenten' },
  { href: '/platform/formulieren', Icon: ClipboardListIcon,  label: 'Formulieren' },
  { href: '/platform/links',       Icon: LinkIcon,           label: 'Links' },
  { href: '/platform/meldingen',   Icon: BellIcon,           label: 'Meldingen', badge: true },
]

const MODULE_ITEMS = [
  { href: '/examenboard', Icon: GraduationCapIcon, label: 'Examenboard' },
  { href: '/dashboard',   Icon: GlobeIcon,         label: 'Taalplatform' },
]

export default function AppSidebar() {
  const path    = usePathname()
  const [open,        setOpen]        = useState(true)
  const [unread,      setUnread]      = useState(0)
  const [isAdmin,     setIsAdmin]     = useState(false)
  const [isSuperAdmin,setIsSuperAdmin]= useState(false)

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
      const { data: p } = await supabase.from('profiles').select('is_admin, is_superadmin').eq('id', uid).single()
      setIsAdmin(p?.is_admin ?? false)
      setIsSuperAdmin(p?.is_superadmin ?? false)
      const [{ count: total }, { count: read }] = await Promise.all([
        supabase.from('notifications').select('*', { count: 'exact', head: true }),
        supabase.from('notification_reads').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      ])
      setUnread(Math.max(0, (total ?? 0) - (read ?? 0)))
    })
  }, [])

  function isActive(href: string, exact?: boolean) {
    return exact ? path === href : path === href || path.startsWith(href + '/')
  }

  return (
    <aside className="app-sidebar" style={{ width: open ? 220 : 60, minWidth: open ? 220 : 60, transition: 'width 0.25s ease' }}>

      {/* Logo */}
      <div style={{ height: 48, display: 'flex', alignItems: 'center', borderBottom: '1px solid #f3f4f6', flexShrink: 0, overflow: 'hidden', paddingLeft: open ? 12 : 0, justifyContent: open ? 'flex-start' : 'center' }}>
        <Link href="/platform" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flex: 1, height: '100%' }}
          title={open ? undefined : 'Schoolplatform — Home'}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #ff520e, #ff7043)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14, flexShrink: 0, boxShadow: '0 2px 8px rgba(255,82,14,0.3)' }}>S</div>
          {open && <span style={{ fontWeight: 700, fontSize: 14, color: '#111827', whiteSpace: 'nowrap' }}>Schoolplatform</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav style={{ padding: '8px 6px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

        {/* Main nav */}
        <div style={{ marginBottom: 4 }}>
          {NAV_ITEMS.map(({ href, Icon, label, exact, badge }) => {
            const active = isActive(href, exact)
            const count  = badge ? unread : 0
            return (
              <Link key={href} href={href} title={open ? undefined : label}
                style={{
                  display: 'flex', alignItems: 'center', gap: open ? 10 : 0,
                  height: 40, padding: open ? '0 10px' : '0',
                  justifyContent: open ? 'flex-start' : 'center',
                  margin: '1px 0', borderRadius: 8, textDecoration: 'none',
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  color: active ? '#ff520e' : '#4b5563',
                  background: active ? '#fff7ed' : 'transparent',
                  borderLeft: active ? '2px solid #ff520e' : '2px solid transparent',
                  transition: 'all 0.15s',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb' }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                <div style={{ width: open ? 18 : 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} />
                </div>
                {open && <span style={{ flex: 1 }}>{label}</span>}
                {count > 0 && open && (
                  <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>
                    {count > 9 ? '9+' : count}
                  </span>
                )}
                {count > 0 && !open && (
                  <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, background: '#ef4444', borderRadius: '50%' }} />
                )}
              </Link>
            )
          })}
        </div>

        {/* Divider + modules */}
        <div style={{ height: 1, background: '#f3f4f6', margin: '6px 4px 8px' }} />
        {open && <div style={{ padding: '2px 10px 6px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Modules</div>}
        {MODULE_ITEMS.map(({ href, Icon, label }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href} title={open ? undefined : label}
              style={{
                display: 'flex', alignItems: 'center', gap: open ? 10 : 0,
                height: 40, padding: open ? '0 10px' : '0',
                justifyContent: open ? 'flex-start' : 'center',
                margin: '1px 0', borderRadius: 8, textDecoration: 'none',
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? '#ff520e' : '#4b5563',
                background: active ? '#fff7ed' : 'transparent',
                borderLeft: active ? '2px solid #ff520e' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#f9fafb' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
              <div style={{ width: open ? 18 : 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} />
              </div>
              {open && <span>{label}</span>}
            </Link>
          )
        })}

        {/* Beheer (admin) */}
        {(isAdmin || isSuperAdmin) && (
          <>
            <div style={{ height: 1, background: '#f3f4f6', margin: '6px 4px 8px' }} />
            {open && <div style={{ padding: '2px 10px 6px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Beheer</div>}
            {isSuperAdmin && (
              <Link href="/platform/admin/gebruikers" title={open ? undefined : 'Gebruikers'}
                style={{
                  display: 'flex', alignItems: 'center', gap: open ? 10 : 0,
                  height: 40, padding: open ? '0 10px' : '0',
                  justifyContent: open ? 'flex-start' : 'center',
                  margin: '1px 0', borderRadius: 8, textDecoration: 'none',
                  fontSize: 13, color: isActive('/platform/admin/gebruikers') ? '#ff520e' : '#4b5563',
                  background: isActive('/platform/admin/gebruikers') ? '#fff7ed' : 'transparent',
                  borderLeft: isActive('/platform/admin/gebruikers') ? '2px solid #ff520e' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!isActive('/platform/admin/gebruikers')) e.currentTarget.style.background = '#f9fafb' }}
                onMouseLeave={e => { if (!isActive('/platform/admin/gebruikers')) e.currentTarget.style.background = 'transparent' }}>
                <div style={{ width: open ? 18 : 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <UsersIcon size={16} />
                </div>
                {open && <span>Gebruikers</span>}
              </Link>
            )}
            <Link href="/platform/admin/feedback" title={open ? undefined : 'Feedback'}
              style={{
                display: 'flex', alignItems: 'center', gap: open ? 10 : 0,
                height: 40, padding: open ? '0 10px' : '0',
                justifyContent: open ? 'flex-start' : 'center',
                margin: '1px 0', borderRadius: 8, textDecoration: 'none',
                fontSize: 13, color: isActive('/platform/admin/feedback') ? '#ff520e' : '#4b5563',
                background: isActive('/platform/admin/feedback') ? '#fff7ed' : 'transparent',
                borderLeft: isActive('/platform/admin/feedback') ? '2px solid #ff520e' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isActive('/platform/admin/feedback')) e.currentTarget.style.background = '#f9fafb' }}
              onMouseLeave={e => { if (!isActive('/platform/admin/feedback')) e.currentTarget.style.background = 'transparent' }}>
              <div style={{ width: open ? 18 : 40, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MessageSquareIcon size={16} />
              </div>
              {open && <span>Feedback</span>}
            </Link>
          </>
        )}
      </nav>

      {/* Toggle collapse */}
      <button onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', padding: '12px 8px',
          borderTop: '1px solid #f3f4f6', width: '100%', background: 'none',
          border: 'none', cursor: 'pointer', color: '#6b7280',
          justifyContent: open ? 'flex-start' : 'center',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#f9fafb')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
        <div style={{ width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronsRightIcon size={16} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }} />
        </div>
        {open && <span style={{ fontSize: 13, fontWeight: 500 }}>Inklappen</span>}
      </button>
    </aside>
  )
}
