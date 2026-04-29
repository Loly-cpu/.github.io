'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Stats { events: number; groups: number; docs: number; unread: number }

const TILES = [
  { href: '/platform/agenda',      icon: '📅', label: 'Agenda',       color: '#0070f6' },
  { href: '/platform/groepen',     icon: '💬', label: 'Berichten',    color: '#0070f6' },
  { href: '/platform/documenten',  icon: '📁', label: 'Documenten',   color: '#0070f6' },
  { href: '/platform/formulieren', icon: '📝', label: 'Formulieren',  color: '#0070f6' },
  { href: '/platform/meldingen',   icon: '🔔', label: 'Meldingen',    color: '#ef4444' },
  { href: '/platform/links',       icon: '🔗', label: 'Links',        color: '#0070f6' },
]

export default function PlatformHome() {
  const [stats, setStats] = useState<Stats>({ events: 0, groups: 0, docs: 0, unread: 0 })
  const [name, setName] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const uid = data.session.user.id
      const { data: p } = await supabase.from('profiles').select('display_name').eq('id', uid).single()
      setName(p?.display_name ?? data.session.user.email?.split('@')[0] ?? '')

      const [ev, gm, dc, notif] = await Promise.allSettled([
        supabase.from('events').select('id', { count: 'exact' }).eq('user_id', uid),
        supabase.from('group_members').select('group_id', { count: 'exact' }).eq('user_id', uid),
        supabase.from('documents').select('id', { count: 'exact' }),
        supabase.from('notifications').select('id', { count: 'exact' }),
      ])
      setStats({
        events: ev.status === 'fulfilled' ? (ev.value.count ?? 0) : 0,
        groups: gm.status === 'fulfilled' ? (gm.value.count ?? 0) : 0,
        docs:   dc.status === 'fulfilled' ? (dc.value.count ?? 0) : 0,
        unread: notif.status === 'fulfilled' ? (notif.value.count ?? 0) : 0,
      })
    })
  }, [])

  const statMap: Record<string, string> = {
    '/platform/agenda':      `${stats.events} evenementen`,
    '/platform/groepen':     `${stats.groups} groepen`,
    '/platform/documenten':  `${stats.docs} bestanden`,
    '/platform/formulieren': 'Stel een vraag',
    '/platform/meldingen':   stats.unread > 0 ? `${stats.unread} berichten` : 'Geen ongelezen',
    '/platform/links':       'Handige bronnen',
  }

  return (
    <div>
      {/* Welcome header — Smartschool style */}
      <div className="smsc-card" style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Roboto, system-ui, sans-serif', fontSize: 20, fontWeight: 500, color: '#242424', margin: 0 }}>
          Welkom{name ? `, ${name}` : ''}!
        </h1>
        <p style={{ fontFamily: 'Roboto, system-ui, sans-serif', fontSize: 14, color: '#5b5b5b', margin: '4px 0 0' }}>
          Kies een onderdeel om te beginnen.
        </p>
      </div>

      {/* Module tiles — exactly like Smartschool's module grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {TILES.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            style={{ textDecoration: 'none' }}
          >
            <div
              className="smsc-card"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', textAlign: 'center',
                padding: '24px 16px', margin: 0, cursor: 'pointer',
                transition: 'box-shadow 0.15s, transform 0.1s',
                minHeight: 120,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.14)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)'
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 8 }}>{t.icon}</div>
              <div style={{ fontFamily: 'Roboto, system-ui', fontWeight: 500, fontSize: 14, color: '#242424' }}>
                {t.label}
              </div>
              <div style={{ fontFamily: 'Roboto, system-ui', fontSize: 12, color: '#5b5b5b', marginTop: 3 }}>
                {statMap[t.href]}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick links to other platforms */}
      <div className="smsc-card" style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <p style={{ fontFamily: 'Roboto, system-ui', fontSize: 13, color: '#5b5b5b', width: '100%', margin: '0 0 8px' }}>
          Andere platforms
        </p>
        <Link href="/examenboard"
          style={{ fontFamily: 'Roboto, system-ui', fontSize: 14, color: '#0070f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
          🎓 Examenboard
        </Link>
        <Link href="/dashboard"
          style={{ fontFamily: 'Roboto, system-ui', fontSize: 14, color: '#0070f6', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
          🌐 Taalplatform
        </Link>
      </div>
    </div>
  )
}
