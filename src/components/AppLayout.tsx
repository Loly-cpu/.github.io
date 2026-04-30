import { ReactNode } from 'react'
import AppTopbar from './AppTopbar'
import AppSidebar from './AppSidebar'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <AppTopbar />
      <AppSidebar />
      <main className="app-content">
        {children}
      </main>
      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  )
}

function MobileBottomNav() {
  return (
    <nav className="app-bottom-nav md:hidden">
      {[
        { href: '/platform',            icon: '🏠', label: 'Home' },
        { href: '/platform/agenda',     icon: '📅', label: 'Agenda' },
        { href: '/platform/berichten',  icon: '💬', label: 'Chat' },
        { href: '/platform/documenten', icon: '📁', label: 'Docs' },
        { href: '/platform/meldingen',  icon: '🔔', label: 'Melding' },
      ].map(item => (
        <a key={item.href} href={item.href}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', padding: '4px 0', color: '#5b5b5b', fontSize: 10, fontWeight: 500, gap: 2 }}>
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span>{item.label}</span>
        </a>
      ))}
    </nav>
  )
}
