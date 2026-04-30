'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const TYPES = [
  { key: 'bug',        icon: '🐛', label: 'Bug melden' },
  { key: 'suggestion', icon: '💡', label: 'Suggestie' },
  { key: 'compliment', icon: '⭐', label: 'Wat werkt goed' },
] as const

export default function FeedbackButton() {
  const path = usePathname()
  const [open, setOpen]       = useState(false)
  const [type, setType]       = useState<'bug'|'suggestion'|'compliment'>('suggestion')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone]       = useState(false)

  async function send() {
    if (!message.trim()) return
    setSending(true)
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('feedback').insert({
      user_id: session?.user?.id ?? null,
      type, message: message.trim(), page: path,
    })
    setSending(false)
    setDone(true)
    setTimeout(() => { setOpen(false); setDone(false); setMessage('') }, 1800)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        title="Geef feedback"
        style={{
          position: 'fixed', bottom: 20, right: 72, zIndex: 90,
          width: 42, height: 42, borderRadius: '50%',
          background: '#fff', border: '1px solid #e8e8e8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 18, transition: 'transform 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >💬</button>

      {/* Modal */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, width: 320, boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}>
            {done ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <p style={{ fontWeight: 600, color: '#242424', fontSize: 14 }}>Bedankt voor je feedback!</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#242424', margin: 0 }}>Feedback geven</p>
                  <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#9ca3af', lineHeight: 1 }}>×</button>
                </div>

                {/* Type selector */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {TYPES.map(t => (
                    <button key={t.key} onClick={() => setType(t.key)}
                      style={{
                        flex: 1, padding: '6px 4px', border: `2px solid ${type === t.key ? '#ff520e' : '#e8e8e8'}`,
                        borderRadius: 8, background: type === t.key ? '#fff3ef' : '#fff',
                        cursor: 'pointer', fontSize: 11, fontWeight: 600,
                        color: type === t.key ? '#ff520e' : '#5b5b5b', textAlign: 'center',
                      }}>
                      <div style={{ fontSize: 18, marginBottom: 2 }}>{t.icon}</div>
                      {t.label}
                    </button>
                  ))}
                </div>

                <textarea
                  style={{ width: '100%', border: '1px solid #e8e8e8', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'none', height: 80, fontFamily: 'Roboto, system-ui', boxSizing: 'border-box' }}
                  placeholder={type === 'bug' ? 'Wat ging er mis? Op welke pagina?' : type === 'suggestion' ? 'Wat zou het platform beter maken?' : 'Wat werkt goed?'}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) send() }}
                />
                <p style={{ fontSize: 10, color: '#9ca3af', margin: '4px 0 10px' }}>Pagina: {path} · Ctrl+Enter om te versturen</p>

                <button onClick={send} disabled={sending || !message.trim()}
                  style={{ width: '100%', background: '#ff520e', color: '#fff', border: 'none', borderRadius: 8, padding: '9px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: sending || !message.trim() ? 0.5 : 1 }}>
                  {sending ? 'Versturen…' : 'Versturen'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
