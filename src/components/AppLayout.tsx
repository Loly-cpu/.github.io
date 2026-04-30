'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import AppTopbar from './AppTopbar'
import AppSidebar from './AppSidebar'

const BOTTOM_ITEMS = [
  { href: '/platform',            icon: '🏠', label: 'Home',    exact: true },
  { href: '/platform/agenda',     icon: '📅', label: 'Agenda' },
  { href: '/platform/berichten',  icon: '💬', label: 'Chat' },
  { href: '/platform/documenten', icon: '📁', label: 'Docs' },
  { href: '/platform/meldingen',  icon: '🔔', label: 'Melding' },
]

function MobileBottomNav() {
  const path = usePathname()
  return (
    <nav className="app-bottom-nav md:hidden">
      {BOTTOM_ITEMS.map(item => {
        const active = item.exact ? path === item.href : path.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', padding: '4px 0', gap: 2, color: active ? '#ff520e' : '#5b5b5b', fontSize: 10, fontWeight: active ? 600 : 400, borderTop: `2px solid ${active ? '#ff520e' : 'transparent'}` }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <AppTopbar />
      <AppSidebar />
      <main className="app-content">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  )
}
