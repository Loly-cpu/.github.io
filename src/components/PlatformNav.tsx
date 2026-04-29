'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const NAV = [
  { href: '/platform',             icon: '🏠', label: 'Home' },
  { href: '/platform/agenda',      icon: '📅', label: 'Agenda' },
  { href: '/platform/groepen',     icon: '💬', label: 'Berichten' },
  { href: '/platform/documenten',  icon: '📁', label: 'Documenten' },
  { href: '/platform/formulieren', icon: '📝', label: 'Formulieren' },
  { href: '/platform/meldingen',   icon: '🔔', label: 'Meldingen' },
  { href: '/platform/links',       icon: '🔗', label: 'Links' },
]

interface Props { unreadCount?: number }

export default function PlatformNav({ unreadCount = 0 }: Props) {
  const path = usePathname()
  const [expanded, setExpanded] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const email = data.session.user.email ?? ''
        setDisplayName(email.split('@')[0])
      }
    })
  }, [])

  const isActive = (href: string) =>
    href === '/platform' ? path === '/platform' : path.startsWith(href)

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`hidden md:flex flex-col h-screen bg-white border-r border-warm-gray sticky top-0 transition-all duration-200 z-30 ${expanded ? 'w-56' : 'w-16'} flex-shrink-0`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-3 py-4 border-b border-warm-gray h-16">
          <span className="text-2xl flex-shrink-0">🎓</span>
          {expanded && <span className="font-bold text-gray-900 text-sm whitespace-nowrap">Leerplatform</span>}
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-3 space-y-0.5 overflow-hidden">
          {NAV.map((item) => {
            const active = isActive(item.href)
            const isMeld = item.href === '/platform/meldingen'
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl transition-colors relative ${
                  active
                    ? 'bg-primary-100 text-primary-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="text-lg flex-shrink-0 relative">
                  {item.icon}
                  {isMeld && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
                {expanded && <span className="text-sm whitespace-nowrap">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User + other platforms */}
        <div className="border-t border-warm-gray py-3 space-y-0.5">
          <Link href="/examenboard"
            className={`flex items-center gap-3 px-3 py-2 mx-2 rounded-xl text-gray-500 hover:bg-gray-100 text-sm transition-colors`}>
            <span className="flex-shrink-0">🎓</span>
            {expanded && <span className="text-xs whitespace-nowrap">Examenboard</span>}
          </Link>
          <Link href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 mx-2 rounded-xl text-gray-500 hover:bg-gray-100 text-sm transition-colors">
            <span className="flex-shrink-0">🌐</span>
            {expanded && <span className="text-xs whitespace-nowrap">Taalplatform</span>}
          </Link>
          {expanded && displayName && (
            <div className="px-5 py-2 text-xs text-gray-400">{displayName}</div>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-warm-gray h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎓</span>
          <span className="font-bold text-gray-900 text-sm">Leerplatform</span>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{unreadCount}</span>
          )}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100">
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setMobileOpen(false)}>
          <div className="absolute left-0 top-14 bottom-0 w-64 bg-white" onClick={(e) => e.stopPropagation()}>
            <nav className="py-3 space-y-0.5">
              {NAV.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link key={item.href} href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-colors ${
                      active ? 'bg-primary-100 text-primary-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'
                    }`}>
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm">{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Mobile spacer */}
      <div className="md:hidden h-14 flex-shrink-0" />
    </>
  )
}
