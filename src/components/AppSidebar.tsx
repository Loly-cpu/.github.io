'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  HomeIcon, CalendarIcon, MessageCircleIcon, FolderIcon,
  ClipboardListIcon, LinkIcon, BellIcon, GraduationCapIcon,
  GlobeIcon, UsersIcon, MessageSquareIcon, BarChart2Icon,
  ChevronLeftIcon, ChevronRightIcon,
} from 'lucide-react'

const NAV_ITEMS = [
  { href: '/platform',             Icon: HomeIcon,           label: 'Start',        exact: true, color: '#1877F2' },
  { href: '/platform/agenda',      Icon: CalendarIcon,       label: 'Agenda',                    color: '#E4409E' },
  { href: '/platform/berichten',   Icon: MessageCircleIcon,  label: 'Berichten',                 color: '#00B2FF' },
  { href: '/platform/cijfers',     Icon: BarChart2Icon,      label: 'Cijfers',                   color: '#02B875' },
  { href: '/platform/documenten',  Icon: FolderIcon,         label: 'Documenten',                color: '#F5C400' },
  { href: '/platform/formulieren', Icon: ClipboardListIcon,  label: 'Formulieren',               color: '#FF7043' },
  { href: '/platform/links',       Icon: LinkIcon,           label: 'Links',                     color: '#8B5CF6' },
  { href: '/platform/meldingen',   Icon: BellIcon,           label: 'Meldingen', badge: true,    color: '#EF4444' },
]

const MODULE_ITEMS = [
  { href: '/examenboard', Icon: GraduationCapIcon, label: 'Examenboard', color: '#1877F2' },
  { href: '/dashboard',   Icon: GlobeIcon,         label: 'Taalplatform', color: '#02B875' },
]

function NavIcon({ Icon, color, active, open }: { Icon: React.ElementType; color: string; active: boolean; open: boolean }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      background: active ? color : '#E4E6EB',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.15s',
      ...(open ? {} : { margin: '0 auto' }),
    }}>
      <Icon size={18} color={active ? '#fff' : '#65676B'} />
    </div>
  )
}

export default function AppSidebar() {
  const path    = usePathname()
  const [open,         setOpen]         = useState(true)
  const [unread,       setUnread]       = useState(0)
  const [isAdmin,      setIsAdmin]      = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [displayName,  setDisplayName]  = useState('')
  const [initials,     setInitials]     = useState('?')
  const [role,         setRole]         = useState('')

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
      const { data: p } = await supabase.from('profiles').select('display_name, is_admin, is_superadmin').eq('id', uid).single()
      setIsAdmin(p?.is_admin ?? false)
      setIsSuperAdmin(p?.is_superadmin ?? false)
      const n = p?.display_name ?? data.session.user.email?.split('@')[0] ?? '?'
      setDisplayName(n)
      setInitials(n[0]?.toUpperCase() ?? '?')
      setRole(p?.is_superadmin ? 'Superadmin' : p?.is_admin ? 'Admin' : 'Leerling')
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

  const FB = '#1877F2'

  return (
    <aside className="app-sidebar" style={{ width: open ? 280 : 68, minWidth: open ? 280 : 68, transition: 'width 0.2s ease' }}>

      {/* Profile header */}
      {open ? (
        <div style={{ padding: '12px 8px 8px', borderBottom: '1px solid #E4E6EB', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: FB, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1C1E21', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#65676B' }}>{role}</p>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px 0 8px', borderBottom: '1px solid #E4E6EB', flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: FB, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>
            {initials}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ padding: '8px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>

        {NAV_ITEMS.map(({ href, Icon, label, exact, badge, color }) => {
          const active = isActive(href, exact)
          const count  = badge ? unread : 0
          return (
            <Link key={href} href={href} title={open ? undefined : label}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                height: 52, padding: open ? '0 8px' : '0 4px',
                justifyContent: open ? 'flex-start' : 'center',
                margin: '2px 0', borderRadius: 8, textDecoration: 'none',
                background: active ? '#E7F3FF' : 'transparent',
                transition: 'background 0.12s',
                position: 'relative',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F0F2F5' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
              <NavIcon Icon={Icon} color={color} active={active} open={open} />
              {open && (
                <span style={{ flex: 1, fontSize: 15, fontWeight: active ? 700 : 400, color: active ? FB : '#1C1E21', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
              )}
              {count > 0 && open && (
                <span style={{ background: '#E41E3F', color: '#fff', borderRadius: 12, fontSize: 11, fontWeight: 700, padding: '2px 7px', minWidth: 20, textAlign: 'center' }}>
                  {count > 9 ? '9+' : count}
                </span>
              )}
              {count > 0 && !open && (
                <span style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, background: '#E41E3F', borderRadius: '50%', border: '2px solid #fff' }} />
              )}
            </Link>
          )
        })}

        {/* Divider + Modules */}
        <div style={{ height: 1, background: '#E4E6EB', margin: '8px 4px' }} />
        {open && <p style={{ margin: '4px 8px 6px', fontSize: 12, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Modules</p>}

        {MODULE_ITEMS.map(({ href, Icon, label, color }) => {
          const active = isActive(href)
          return (
            <Link key={href} href={href} title={open ? undefined : label}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                height: 52, padding: open ? '0 8px' : '0 4px',
                justifyContent: open ? 'flex-start' : 'center',
                margin: '2px 0', borderRadius: 8, textDecoration: 'none',
                background: active ? '#E7F3FF' : 'transparent',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F0F2F5' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}>
              <NavIcon Icon={Icon} color={color} active={active} open={open} />
              {open && <span style={{ fontSize: 15, fontWeight: active ? 700 : 400, color: active ? FB : '#1C1E21' }}>{label}</span>}
            </Link>
          )
        })}

        {/* Beheer */}
        {(isAdmin || isSuperAdmin) && (
          <>
            <div style={{ height: 1, background: '#E4E6EB', margin: '8px 4px' }} />
            {open && <p style={{ margin: '4px 8px 6px', fontSize: 12, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Beheer</p>}
            {isSuperAdmin && (
              <Link href="/platform/admin/gebruikers" title={open ? undefined : 'Gebruikers'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  height: 52, padding: open ? '0 8px' : '0 4px',
                  justifyContent: open ? 'flex-start' : 'center',
                  margin: '2px 0', borderRadius: 8, textDecoration: 'none',
                  background: isActive('/platform/admin/gebruikers') ? '#E7F3FF' : 'transparent',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { if (!isActive('/platform/admin/gebruikers')) e.currentTarget.style.background = '#F0F2F5' }}
                onMouseLeave={e => { if (!isActive('/platform/admin/gebruikers')) e.currentTarget.style.background = 'transparent' }}>
                <NavIcon Icon={UsersIcon} color="#8B5CF6" active={isActive('/platform/admin/gebruikers')} open={open} />
                {open && <span style={{ fontSize: 15, fontWeight: isActive('/platform/admin/gebruikers') ? 700 : 400, color: isActive('/platform/admin/gebruikers') ? FB : '#1C1E21' }}>Gebruikers</span>}
              </Link>
            )}
            <Link href="/platform/admin/feedback" title={open ? undefined : 'Feedback'}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                height: 52, padding: open ? '0 8px' : '0 4px',
                justifyContent: open ? 'flex-start' : 'center',
                margin: '2px 0', borderRadius: 8, textDecoration: 'none',
                background: isActive('/platform/admin/feedback') ? '#E7F3FF' : 'transparent',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { if (!isActive('/platform/admin/feedback')) e.currentTarget.style.background = '#F0F2F5' }}
              onMouseLeave={e => { if (!isActive('/platform/admin/feedback')) e.currentTarget.style.background = 'transparent' }}>
              <NavIcon Icon={MessageSquareIcon} color="#E4409E" active={isActive('/platform/admin/feedback')} open={open} />
              {open && <span style={{ fontSize: 15, fontWeight: isActive('/platform/admin/feedback') ? 700 : 400, color: isActive('/platform/admin/feedback') ? FB : '#1C1E21' }}>Feedback</span>}
            </Link>
          </>
        )}
      </nav>

      {/* Collapse toggle */}
      <div style={{ borderTop: '1px solid #E4E6EB', padding: 8, flexShrink: 0 }}>
        <button onClick={() => setOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: open ? 'flex-start' : 'center',
            gap: 12, width: '100%', padding: open ? '0 8px' : '0 4px',
            height: 44, background: 'none', border: 'none', cursor: 'pointer',
            borderRadius: 8, transition: 'background 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#F0F2F5')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E4E6EB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {open ? <ChevronLeftIcon size={18} color="#65676B" /> : <ChevronRightIcon size={18} color="#65676B" />}
          </div>
          {open && <span style={{ fontSize: 15, fontWeight: 400, color: '#1C1E21' }}>Inklappen</span>}
        </button>
      </div>
    </aside>
  )
}
