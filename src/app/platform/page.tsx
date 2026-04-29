'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Stats { events: number; groups: number; docs: number; unread: number }

export default function PlatformHome() {
  const [stats, setStats] = useState<Stats>({ events: 0, groups: 0, docs: 0, unread: 0 })
  const [name, setName] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const uid = data.session.user.id
      setName(data.session.user.email?.split('@')[0] ?? '')

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

  const tiles = [
    { href: '/platform/agenda',      icon: '📅', label: 'Agenda',      sub: `${stats.events} evenementen`, color: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100' },
    { href: '/platform/groepen',     icon: '💬', label: 'Berichten',   sub: `${stats.groups} groepen`, color: 'bg-blue-50 border-blue-200 hover:bg-blue-100' },
    { href: '/platform/documenten',  icon: '📁', label: 'Documenten',  sub: `${stats.docs} bestanden`, color: 'bg-green-50 border-green-200 hover:bg-green-100' },
    { href: '/platform/formulieren', icon: '📝', label: 'Formulieren', sub: 'Stel een vraag', color: 'bg-amber-50 border-amber-200 hover:bg-amber-100' },
    { href: '/platform/meldingen',   icon: '🔔', label: 'Meldingen',   sub: `${stats.unread} berichten`, color: 'bg-red-50 border-red-200 hover:bg-red-100' },
    { href: '/platform/links',       icon: '🔗', label: 'Links',       sub: 'Handige bronnen', color: 'bg-purple-50 border-purple-200 hover:bg-purple-100' },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welkom{name ? `, ${name}` : ''}!
        </h1>
        <p className="text-gray-500 mt-1">Kies een onderdeel om aan de slag te gaan.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href}
            className={`border-2 rounded-2xl p-6 transition-colors flex flex-col gap-2 ${t.color}`}>
            <span className="text-3xl">{t.icon}</span>
            <div>
              <p className="font-bold text-gray-900">{t.label}</p>
              <p className="text-sm text-gray-500">{t.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick links to other platforms */}
      <div className="mt-10 flex gap-3 flex-wrap">
        <Link href="/examenboard" className="btn-ghost text-sm">🎓 Examenboard</Link>
        <Link href="/dashboard"   className="btn-ghost text-sm">🌐 Taalplatform</Link>
      </div>
    </div>
  )
}
