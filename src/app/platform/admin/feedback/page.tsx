'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface FeedbackRow {
  id: string; type: string; message: string; page: string; status: string; created_at: string
  profiles?: { display_name: string }
}

const TYPE_ICON: Record<string, string> = { bug: '🐛', suggestion: '💡', compliment: '⭐' }
const TYPE_LABEL: Record<string, string> = { bug: 'Bug', suggestion: 'Suggestie', compliment: 'Compliment' }
const STATUS_COLORS: Record<string, string> = { open: '#ff520e', read: '#3b82f6', done: '#22c55e' }

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 60)    return `${m}m`
  if (m < 1440)  return `${Math.floor(m/60)}u`
  return `${Math.floor(m/1440)}d`
}

export default function FeedbackAdminPage() {
  const router = useRouter()
  const [rows, setRows]         = useState<FeedbackRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<'all'|'open'|'bug'|'suggestion'|'compliment'>('open')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/auth/login'); return }
      const { data: p } = await supabase.from('profiles').select('is_admin, is_superadmin').eq('id', data.session.user.id).single()
      if (!p?.is_admin && !p?.is_superadmin) { router.replace('/platform'); return }
      const { data: fb } = await supabase.from('feedback').select('*, profiles(display_name)').order('created_at', { ascending: false })
      if (fb) setRows(fb as FeedbackRow[])
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function updateStatus(id: string, status: string) {
    await supabase.from('feedback').update({ status }).eq('id', id)
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  const filtered = filter === 'all' ? rows
    : filter === 'open' ? rows.filter(r => r.status === 'open')
    : rows.filter(r => r.type === filter)

  const counts = { open: rows.filter(r => r.status === 'open').length, bug: rows.filter(r => r.type === 'bug').length }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#ff520e', borderTopColor: 'transparent' }} /></div>

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>💬 Feedback</h1>
        <p style={{ fontSize: 13, color: '#5b5b5b', margin: '3px 0 0' }}>
          {counts.open} ongelezen · {counts.bug} bugs
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {([['open','Ongelezen'],['all','Alle'],['bug','🐛 Bugs'],['suggestion','💡 Suggesties'],['compliment','⭐ Complimenten']] as const).map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ fontSize: 12, padding: '5px 14px', borderRadius: 20, fontWeight: 500, cursor: 'pointer', border: 'none', background: filter === k ? '#ff520e' : '#fff', color: filter === k ? '#fff' : '#5b5b5b', boxShadow: filter === k ? 'none' : '0 1px 3px rgba(0,0,0,0.08)' }}>
            {l}
          </button>
        ))}
      </div>

      <div className="smsc-card" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Geen feedback gevonden</div>
        ) : filtered.map((r, i) => (
          <div key={r.id} style={{ padding: '14px 18px', borderBottom: i < filtered.length - 1 ? '1px solid #f4f4f4' : 'none', display: 'flex', gap: 12, alignItems: 'flex-start', background: r.status === 'open' ? '#fff' : '#fafafa' }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{TYPE_ICON[r.type]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#5b5b5b' }}>{TYPE_LABEL[r.type]}</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>·</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{r.page}</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>·</span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{timeAgo(r.created_at)} geleden</span>
                <span style={{ fontSize: 10, background: `${STATUS_COLORS[r.status]}22`, color: STATUS_COLORS[r.status], borderRadius: 6, padding: '1px 6px', fontWeight: 700, textTransform: 'capitalize' }}>{r.status}</span>
              </div>
              <p style={{ fontSize: 13, color: '#242424', margin: '0 0 6px', whiteSpace: 'pre-wrap' }}>{r.message}</p>
              {r.profiles?.display_name && <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Van: {r.profiles.display_name}</p>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
              {['open','read','done'].map(s => (
                <button key={s} onClick={() => updateStatus(r.id, s)}
                  style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: r.status === s ? 700 : 400, background: r.status === s ? `${STATUS_COLORS[s]}22` : '#f4f4f4', color: r.status === s ? STATUS_COLORS[s] : '#5b5b5b' }}>
                  {s === 'open' ? 'Open' : s === 'read' ? 'Gelezen' : 'Klaar'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
