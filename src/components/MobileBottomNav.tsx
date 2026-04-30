'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const FB = '#1877F2'

export default function MobileBottomNav() {
  const path   = usePathname()
  const router = useRouter()
  const [unread, setUnread] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const [name, setName] = useState('')
  const [initials, setInitials] = useState('?')
  const [avatarBg, setAvatarBg] = useState(FB)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const uid = data.session.user.id
      const { data: p } = await supabase.from('profiles').select('display_name,is_admin,is_superadmin').eq('id', uid).single()
      const n = p?.display_name ?? data.session.user.email?.split('@')[0] ?? '?'
      setName(n); setInitials(n[0]?.toUpperCase() ?? '?')
      setAvatarBg(p?.is_superadmin ? '#9333ea' : p?.is_admin ? '#16a34a' : FB)
      const [{ count: tot }, { count: rd }] = await Promise.all([
        supabase.from('notifications').select('*', { count: 'exact', head: true }),
        supabase.from('notification_reads').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      ])
      setUnread(Math.max(0, (tot ?? 0) - (rd ?? 0)))
    })
  }, [])

  function active(href: string, exact?: boolean) {
    return exact ? path === href : path === href || path.startsWith(href + '/')
  }

  async function logout() {
    await supabase.auth.signOut(); router.replace('/auth/login'); setMenuOpen(false)
  }

  const TAB_STYLE = (isActive: boolean): React.CSSProperties => ({
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: 3, height: '100%', textDecoration: 'none',
    background: 'none', border: 'none', cursor: 'pointer', padding: '8px 0',
    borderTop: isActive ? `3px solid ${FB}` : '3px solid transparent',
    transition: 'border-color .1s',
  })

  return (
    <>
      {/* Bottom nav bar */}
      <nav style={{
        display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0,
        height: 56, background: '#fff', zIndex: 100,
        boxShadow: '0 -1px 0 #E4E6EB',
        flexDirection: 'row', alignItems: 'stretch',
        fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
      }} className="mobile-bottom-nav">

        <Link href="/platform" style={TAB_STYLE(active('/platform', true)) as React.CSSProperties}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={active('/platform', true) ? FB : '#65676B'}><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </Link>

        <Link href="/platform/berichten" style={TAB_STYLE(active('/platform/berichten')) as React.CSSProperties}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={active('/platform/berichten') ? FB : '#65676B'}><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
        </Link>

        <Link href="/platform/agenda" style={TAB_STYLE(active('/platform/agenda')) as React.CSSProperties}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={active('/platform/agenda') ? FB : '#65676B'}><path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm0 10c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/></svg>
        </Link>

        <Link href="/platform/meldingen" style={{ ...TAB_STYLE(active('/platform/meldingen')), position: 'relative' } as React.CSSProperties}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={active('/platform/meldingen') ? FB : '#65676B'}><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>
          {unread > 0 && <span style={{ position: 'absolute', top: 6, right: '50%', transform: 'translateX(8px)', background: '#E41E3F', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 700, padding: '0 4px', minWidth: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>{unread > 9 ? '9+' : unread}</span>}
        </Link>

        <button onClick={() => setMenuOpen(true)} style={TAB_STYLE(false) as React.CSSProperties}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: avatarBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>{initials}</div>
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
          onClick={() => setMenuOpen(false)}>
          <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', padding: '16px 0', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}>
            {/* Profile row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px 16px', borderBottom: '8px solid #F0F2F5' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: avatarBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20 }}>{initials}</div>
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1C1E21' }}>{name}</p>
                <p style={{ margin: 0, fontSize: 13, color: '#65676B' }}>Profiel bekijken</p>
              </div>
            </div>

            {/* All nav items */}
            {[
              { href: '/platform',             icon: '🏠', label: 'Start' },
              { href: '/platform/agenda',      icon: '📅', label: 'Agenda' },
              { href: '/platform/berichten',   icon: '💬', label: 'Berichten' },
              { href: '/platform/cijfers',     icon: '📊', label: 'Cijfers' },
              { href: '/platform/documenten',  icon: '📁', label: 'Documenten' },
              { href: '/platform/formulieren', icon: '❓', label: 'Vragen & Antwoorden' },
              { href: '/platform/links',       icon: '🔗', label: 'Links' },
              { href: '/platform/meldingen',   icon: '🔔', label: 'Meldingen' },
              { href: '/examenboard',          icon: '🎓', label: 'Examenboard' },
              { href: '/dashboard',            icon: '🌐', label: 'Taalplatform' },
            ].map(item => (
              <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', textDecoration: 'none', background: active(item.href) ? '#E7F3FF' : 'transparent', transition: 'background .1s' }}>
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                <span style={{ fontSize: 16, fontWeight: active(item.href) ? 700 : 400, color: active(item.href) ? FB : '#1C1E21' }}>{item.label}</span>
              </Link>
            ))}

            <div style={{ height: 1, background: '#E4E6EB', margin: '8px 0' }} />
            <button onClick={logout}
              style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#1C1E21' }}>
              <span style={{ fontSize: 22 }}>🚪</span> Afmelden
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 767px) {
          .mobile-bottom-nav { display: flex !important; }
          .app-content { padding-bottom: 72px !important; }
        }
      `}</style>
    </>
  )
}
