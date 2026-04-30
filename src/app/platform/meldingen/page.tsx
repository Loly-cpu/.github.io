'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Notification { id: string; title: string; content: string; type: string; created_at: string }

const FB = '#1877F2'
const TYPE_ICON: Record<string, string>  = { info: '💡', warning: '⚠️', update: '✅', event: '📅' }
const TYPE_COLOR: Record<string, string> = { info: FB, warning: '#F59E0B', update: '#22C55E', event: '#8B5CF6' }

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'zojuist'; if (m < 60) return `${m} minuten geleden`
  if (m < 1440) return `${Math.floor(m/60)} uur geleden`
  if (m < 10080) return `${Math.floor(m/1440)} dag${Math.floor(m/1440) !== 1 ? 'en' : ''} geleden`
  return new Date(iso).toLocaleDateString('nl-BE', { day: 'numeric', month: 'long' })
}

export default function MeldingenPage() {
  const [notifs, setNotifs]     = useState<Notification[]>([])
  const [userId, setUserId]     = useState<string | null>(null)
  const [isAdmin, setIsAdmin]   = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm]         = useState({ title: '', content: '', type: 'info' })
  const [posting, setPosting]   = useState(false)
  const [readIds, setReadIds]   = useState<Set<string>>(new Set())
  const [filter, setFilter]     = useState<'all' | 'unread'>('unread')
  const [toast, setToast]       = useState<string | null>(null)
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
    await Promise.all(unread.map(n => supabase.from('notification_reads').upsert({ notification_id: n.id, user_id: userId })))
    setReadIds(prev => new Set([...prev, ...unread.map(n => n.id)]))
    showToastMsg('Alles als gelezen gemarkeerd')
  }
  async function createNotif() {
    if (!userId || !form.title || !form.content) return
    setPosting(true)
    await supabase.from('notifications').insert({ title: form.title, content: form.content, type: form.type, created_by: userId })
    setForm({ title: '', content: '', type: 'info' })
    setShowCreate(false)
    await loadNotifs()
    setPosting(false)
    showToastMsg('Melding verzonden')
  }
  async function deleteNotif(id: string) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifs(prev => prev.filter(n => n.id !== id))
    setDelConfirm(null)
    showToastMsg('Melding verwijderd')
  }
  function showToastMsg(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  const unreadCount = notifs.filter(n => !readIds.has(n.id)).length
  const displayed   = filter === 'unread' ? notifs.filter(n => !readIds.has(n.id)) : notifs

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', fontFamily: 'var(--fb-font)' }}>

      {/* Header — FB Notifications style */}
      <div className="fb-card" style={{ padding: '16px 20px', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1C1E21' }}>Meldingen</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                style={{ background: '#E4E6EB', border: 'none', borderRadius: 6, padding: '8px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', color: '#1C1E21', transition: 'background .12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#D8DADF')}
                onMouseLeave={e => (e.currentTarget.style.background = '#E4E6EB')}>
                Alles gelezen
              </button>
            )}
            {isAdmin && (
              <button onClick={() => setShowCreate(true)}
                style={{ background: FB, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'background .12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#166FE5')}
                onMouseLeave={e => (e.currentTarget.style.background = FB)}>
                + Melding
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4 }}>
          {([['unread', 'Ongelezen'], ['all', 'Alle meldingen']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              style={{
                padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 14, transition: 'background .12s',
                background: filter === key ? FB : 'transparent',
                color: filter === key ? '#fff' : '#65676B',
              }}>
              {label}{key === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {displayed.length === 0 && (
        <div className="fb-card" style={{ padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#E4E6EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 16px' }}>
            {filter === 'unread' ? '🎉' : '🔔'}
          </div>
          <p style={{ fontWeight: 800, fontSize: 18, color: '#1C1E21', margin: '0 0 8px' }}>
            {filter === 'unread' ? 'Alles gelezen!' : 'Geen meldingen'}
          </p>
          {filter === 'unread' && (
            <button onClick={() => setFilter('all')} style={{ background: 'none', border: 'none', color: FB, cursor: 'pointer', fontSize: 15, fontWeight: 700 }}>
              Alle meldingen bekijken →
            </button>
          )}
        </div>
      )}

      {/* Notifications — FB style rows */}
      <div className="fb-card" style={{ overflow: 'hidden', padding: '4px 0' }}>
        {displayed.map(n => {
          const read  = readIds.has(n.id)
          const color = TYPE_COLOR[n.type] ?? '#65676B'
          return (
            <div key={n.id} onClick={() => markRead(n.id)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 16px',
                background: read ? 'transparent' : '#E7F3FF', cursor: read ? 'default' : 'pointer',
                transition: 'background .12s', borderRadius: 0,
              }}
              onMouseEnter={e => { if (!read) e.currentTarget.style.background = '#D0E8FF'; else e.currentTarget.style.background = '#F0F2F5' }}
              onMouseLeave={e => { e.currentTarget.style.background = read ? 'transparent' : '#E7F3FF' }}>

              {/* Icon circle */}
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0, position: 'relative' }}>
                {TYPE_ICON[n.type] ?? '🔔'}
                {!read && <div style={{ position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: '50%', background: FB, border: '2px solid #fff' }} />}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: '0 0 2px', fontSize: 15, color: '#1C1E21', lineHeight: 1.4 }}>
                  <strong>{n.title}</strong> — {n.content}
                </p>
                <p style={{ margin: 0, fontSize: 13, color: read ? '#65676B' : FB, fontWeight: read ? 400 : 700 }}>
                  {timeAgo(n.created_at)}
                </p>
              </div>

              {isAdmin && (
                <button onClick={e => { e.stopPropagation(); setDelConfirm(n.id) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CED0D4', fontSize: 20, padding: '0 4px', flexShrink: 0, borderRadius: 6, transition: 'color .12s, background .12s' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#E41E3F'; e.currentTarget.style.background = '#FFF0F0' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#CED0D4'; e.currentTarget.style.background = 'transparent' }}>
                  ×
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Delete confirm */}
      {delConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 380, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: '#1C1E21', margin: '0 0 8px' }}>Melding verwijderen?</p>
            <p style={{ fontSize: 15, color: '#65676B', margin: '0 0 20px' }}>Dit kan niet ongedaan worden gemaakt.</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setDelConfirm(null)} style={{ flex: 1, background: '#E4E6EB', border: 'none', borderRadius: 8, padding: '10px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Annuleren</button>
              <button onClick={() => deleteNotif(delConfirm)} style={{ flex: 1, background: '#E41E3F', border: 'none', borderRadius: 8, padding: '10px', fontSize: 15, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Verwijderen</button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 460, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#1C1E21', margin: 0 }}>Nieuwe melding</p>
              <button onClick={() => setShowCreate(false)} style={{ background: '#E4E6EB', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select className="fb-input-box" style={{ borderRadius: 8 }} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="info">💡 Info</option>
                <option value="update">✅ Update</option>
                <option value="warning">⚠️ Waarschuwing</option>
                <option value="event">📅 Evenement</option>
              </select>
              <input className="fb-input-box" style={{ borderRadius: 8 }} placeholder="Titel*" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              <textarea className="fb-input-box" style={{ borderRadius: 8, resize: 'none', height: 96 }} placeholder="Inhoud*" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowCreate(false)} style={{ flex: 1, background: '#E4E6EB', border: 'none', borderRadius: 8, padding: '10px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Annuleren</button>
              <button onClick={createNotif} disabled={posting || !form.title || !form.content}
                style={{ flex: 1, background: FB, color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: (posting || !form.title || !form.content) ? 0.5 : 1 }}>
                {posting ? 'Versturen…' : 'Versturen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1C1E21', color: '#fff', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600, zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,.3)', whiteSpace: 'nowrap' }}>
          ✓ {toast}
        </div>
      )}
    </div>
  )
}
