'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Notification {
  id: string; title: string; content: string; type: string; created_at: string
}

const TYPE_STYLE: Record<string, { border: string; bg: string }> = {
  info:    { border: '#60a5fa', bg: '#eff6ff' },
  warning: { border: '#f59e0b', bg: '#fffbeb' },
  update:  { border: '#22c55e', bg: '#f0fdf4' },
  event:   { border: '#a855f7', bg: '#faf5ff' },
}
const TYPE_ICON: Record<string, string> = {
  info: '💡', warning: '⚠️', update: '✅', event: '📅',
}

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1)    return 'zojuist'
  if (m < 60)   return `${m}m geleden`
  if (m < 1440) return `${Math.floor(m / 60)}u geleden`
  if (m < 10080) return `${Math.floor(m / 1440)}d geleden`
  return new Date(iso).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short' })
}

export default function MeldingenPage() {
  const [notifs, setNotifs]   = useState<Notification[]>([])
  const [userId, setUserId]   = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]       = useState({ title: '', content: '', type: 'info' })
  const [posting, setPosting] = useState(false)
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [filter, setFilter]   = useState<'all' | 'unread'>('unread')
  const [toast, setToast]     = useState<string | null>(null)
  const [delConfirm, setDelConfirm] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null
      setUserId(uid)
      if (uid) {
        const { data: p } = await supabase.from('profiles').select('is_admin, is_superadmin').eq('id', uid).single()
        setIsAdmin((p?.is_admin || p?.is_superadmin) ?? false)
        const { data: reads } = await supabase.from('notification_reads').select('notification_id').eq('user_id', uid)
        if (reads) setReadIds(new Set(reads.map((r: { notification_id: string }) => r.notification_id)))
      }
      await loadNotifs()
    })
  }, [])

  async function loadNotifs() {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false })
    if (data) setNotifs(data)
  }

  async function markRead(id: string) {
    if (!userId || readIds.has(id)) return
    await supabase.from('notification_reads').upsert({ notification_id: id, user_id: userId })
    setReadIds(prev => new Set([...prev, id]))
  }

  async function markAllRead() {
    if (!userId) return
    const unread = notifs.filter(n => !readIds.has(n.id))
    await Promise.all(unread.map(n =>
      supabase.from('notification_reads').upsert({ notification_id: n.id, user_id: userId })
    ))
    setReadIds(prev => new Set([...prev, ...unread.map(n => n.id)]))
    showToast('Alles gelezen')
  }

  async function createNotif() {
    if (!userId || !form.title || !form.content) return
    setPosting(true)
    await supabase.from('notifications').insert({ title: form.title, content: form.content, type: form.type, created_by: userId })
    setForm({ title: '', content: '', type: 'info' })
    setShowCreate(false)
    await loadNotifs()
    setPosting(false)
    showToast('Melding verzonden')
  }

  async function deleteNotif(id: string) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifs(prev => prev.filter(n => n.id !== id))
    setDelConfirm(null)
    showToast('Melding verwijderd')
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const unreadCount = notifs.filter(n => !readIds.has(n.id)).length
  const displayed   = filter === 'unread' ? notifs.filter(n => !readIds.has(n.id)) : notifs

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#242424', margin: 0 }}>🔔 Meldingen</h1>
          <p style={{ fontSize: 13, color: '#5b5b5b', margin: '3px 0 0' }}>
            {unreadCount > 0 ? `${unreadCount} ongelezen` : 'Alles gelezen'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: '#5b5b5b' }}>
              Alles gelezen
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setShowCreate(true)}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              + Melding
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {([['unread', 'Ongelezen'], ['all', 'Alle']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            style={{
              fontSize: 12, padding: '5px 14px', borderRadius: 20, fontWeight: 500, cursor: 'pointer', border: 'none',
              background: filter === key ? '#2563eb' : '#fff',
              color: filter === key ? '#fff' : '#5b5b5b',
              boxShadow: filter === key ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
            }}>
            {label}{key === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
          </button>
        ))}
      </div>

      {/* Notifications */}
      {displayed.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
          <p style={{ fontWeight: 600, fontSize: 15, margin: '0 0 4px' }}>
            {filter === 'unread' ? 'Alles gelezen!' : 'Geen meldingen'}
          </p>
          {filter === 'unread' && (
            <button onClick={() => setFilter('all')} style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              Alle meldingen bekijken →
            </button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {displayed.map((n) => {
          const read  = readIds.has(n.id)
          const style = TYPE_STYLE[n.type] ?? { border: '#9ca3af', bg: '#fff' }
          return (
            <div key={n.id}
              onClick={() => markRead(n.id)}
              style={{
                borderLeft: `4px solid ${style.border}`,
                background: read ? '#fafafa' : style.bg,
                borderRadius: '0 10px 10px 0',
                padding: '14px 16px',
                cursor: read ? 'default' : 'pointer',
                opacity: read ? 0.75 : 1,
                transition: 'opacity 0.2s',
              }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{TYPE_ICON[n.type] ?? '🔔'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
                      <p style={{ fontWeight: 600, color: '#242424', fontSize: 14, margin: 0 }}>{n.title}</p>
                      {!read && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2563eb', flexShrink: 0, display: 'inline-block' }} />}
                    </div>
                    <p style={{ fontSize: 13, color: '#374151', margin: '0 0 6px', whiteSpace: 'pre-wrap' }}>{n.content}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{timeAgo(n.created_at)}</p>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={(e) => { e.stopPropagation(); setDelConfirm(n.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 16, flexShrink: 0, padding: 0 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
                  >🗑</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Delete confirm modal */}
      {delConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#242424', marginBottom: 8 }}>Melding verwijderen?</p>
            <p style={{ fontSize: 13, color: '#5b5b5b', marginBottom: 20 }}>Dit kan niet ongedaan worden gemaakt.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDelConfirm(null)}
                style={{ background: '#f4f4f4', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, cursor: 'pointer', fontWeight: 500, color: '#5b5b5b' }}>
                Annuleren
              </button>
              <button onClick={() => deleteNotif(delConfirm)}
                style={{ background: '#ef4444', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, cursor: 'pointer', fontWeight: 600, color: '#fff' }}>
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create notification modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 440, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#242424', margin: 0 }}>Nieuwe melding</p>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
                value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="info">💡 Info</option>
                <option value="update">✅ Update</option>
                <option value="warning">⚠️ Waarschuwing</option>
                <option value="event">📅 Evenement</option>
              </select>
              <input style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
                placeholder="Titel*" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} />
              <textarea style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'none', height: 96 }}
                placeholder="Inhoud*" value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setShowCreate(false)}
                style={{ background: '#f4f4f4', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', fontWeight: 500, color: '#5b5b5b' }}>
                Annuleren
              </button>
              <button onClick={createNotif} disabled={posting || !form.title || !form.content}
                style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (posting || !form.title || !form.content) ? 0.5 : 1 }}>
                {posting ? 'Versturen...' : 'Versturen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#242424', color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500, zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
          ✓ {toast}
        </div>
      )}
    </div>
  )
}
