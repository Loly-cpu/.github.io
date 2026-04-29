'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Notification {
  id: string; title: string; content: string; type: string
  created_at: string; is_read?: boolean
}

const TYPE_STYLE: Record<string, string> = {
  info:    'border-l-blue-400 bg-blue-50',
  warning: 'border-l-amber-400 bg-amber-50',
  update:  'border-l-green-400 bg-green-50',
  event:   'border-l-purple-400 bg-purple-50',
}
const TYPE_ICON: Record<string, string> = {
  info: '💡', warning: '⚠️', update: '✅', event: '📅',
}

export default function MeldingenPage() {
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', type: 'info' })
  const [posting, setPosting] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null
      setUserId(uid)
      if (uid) {
        const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', uid).single()
        setIsAdmin(p?.is_admin ?? false)
        const { data: reads } = await supabase.from('notification_reads').select('notification_id').eq('user_id', uid)
        if (reads) setReadIds(new Set(reads.map((r: { notification_id: string }) => r.notification_id)))
      }
      await loadNotifs()
    })
  }, [])

  async function loadNotifs() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setNotifs(data)
  }

  async function markRead(id: string) {
    if (!userId || readIds.has(id)) return
    await supabase.from('notification_reads').upsert({ notification_id: id, user_id: userId })
    setReadIds((prev) => new Set([...prev, id]))
  }

  async function createNotif() {
    if (!userId || !form.title || !form.content) return
    setPosting(true)
    await supabase.from('notifications').insert({
      title: form.title, content: form.content, type: form.type, created_by: userId,
    })
    setForm({ title: '', content: '', type: 'info' })
    setShowCreate(false)
    await loadNotifs()
    setPosting(false)
  }

  async function deleteNotif(id: string) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifs((prev) => prev.filter((n) => n.id !== id))
  }

  const unread = notifs.filter((n) => !readIds.has(n.id)).length

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔔 Meldingen</h1>
          {unread > 0 && <p className="text-sm text-red-600 font-semibold">{unread} ongelezen</p>}
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm px-4 py-2">+ Melding</button>
        )}
      </div>

      {notifs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">🔔</p>
          <p className="font-semibold">Geen meldingen</p>
        </div>
      )}

      <div className="space-y-3">
        {notifs.map((n) => {
          const read = readIds.has(n.id)
          return (
            <div
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`border-l-4 rounded-2xl p-5 cursor-pointer transition-all ${TYPE_STYLE[n.type] ?? 'border-l-gray-400 bg-white'} ${!read ? 'shadow-sm ring-1 ring-inset ring-gray-200' : 'opacity-75'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-xl flex-shrink-0">{TYPE_ICON[n.type] ?? '🔔'}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900">{n.title}</p>
                      {!read && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{n.content}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(n.created_at).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={(e) => { e.stopPropagation(); deleteNotif(n.id) }}
                    className="text-gray-300 hover:text-red-400 text-lg leading-none flex-shrink-0">🗑</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Admin: create notification */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Nieuwe melding</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="space-y-3">
              <select className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
                value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="info">💡 Info</option>
                <option value="update">✅ Update</option>
                <option value="warning">⚠️ Waarschuwing</option>
                <option value="event">📅 Evenement</option>
              </select>
              <input className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
                placeholder="Titel*" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <textarea className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm resize-none h-28"
                placeholder="Inhoud van de melding*..." value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="btn-ghost text-sm px-4 py-2">Annuleren</button>
              <button onClick={createNotif} disabled={posting || !form.title || !form.content}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                {posting ? 'Posten...' : 'Versturen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
