'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface Question {
  id: string; subject: string; content: string; status: string
  created_at: string; user_id?: string; name?: string
  answers?: Answer[]; reactions?: Reaction[]
}
interface Answer {
  id: string; content: string; created_at: string
  user_id: string; is_accepted: boolean
  profiles?: { display_name: string }
  reactions?: Reaction[]
}
interface Reaction { target_type: string; target_id: string; user_id: string; type: string }

const SUBJECTS = [
  'Aardrijkskunde','Nederlands','Frans','Engels','Wiskunde',
  'Economie','Wetenschappen','Geschiedenis','Platform','Overig',
]

const REACTIONS = [
  { type: 'thumbs_up', icon: '👍', label: 'Nuttig' },
  { type: 'heart',     icon: '❤️', label: 'Leuk' },
  { type: 'interested',icon: '🔔', label: 'Volgen' },
  { type: 'flag',      icon: '🚩', label: 'Melden' },
] as const

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.floor(d/60000)
  if (m < 1) return 'zojuist'
  if (m < 60) return `${m}m`
  const h = Math.floor(m/60)
  if (h < 24) return `${h}u`
  return `${Math.floor(h/24)}d`
}

// ── Reaction bar ──────────────────────────────────────────────────────────────
function ReactionBar({
  targetType, targetId, reactions, userId, onToggle,
}: {
  targetType: 'question'|'answer'; targetId: string
  reactions: Reaction[]; userId: string | null
  onToggle: (targetType: string, targetId: string, type: string, active: boolean) => void
}) {
  const counts = REACTIONS.reduce((acc, r) => {
    acc[r.type] = reactions.filter(rx => rx.target_type === targetType && rx.target_id === targetId && rx.type === r.type).length
    return acc
  }, {} as Record<string, number>)

  const active = (type: string) => !!userId && reactions.some(
    rx => rx.target_type === targetType && rx.target_id === targetId && rx.user_id === userId && rx.type === type
  )

  return (
    <div className="flex items-center gap-1 mt-2 flex-wrap">
      {REACTIONS.map(r => {
        const isActive = active(r.type)
        const count = counts[r.type]
        const isFlag = r.type === 'flag'
        return (
          <button
            key={r.type}
            onClick={() => userId && onToggle(targetType, targetId, r.type, isActive)}
            disabled={!userId}
            title={!userId ? 'Inloggen om te reageren' : r.label}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all border disabled:cursor-default ${
              isFlag
                ? isActive ? 'bg-red-100 border-red-300 text-red-600' : 'border-transparent text-gray-300 hover:text-red-400 hover:border-red-200'
                : isActive
                ? 'bg-primary-100 border-primary-300 text-primary-700'
                : 'border-transparent text-gray-400 hover:bg-gray-100 hover:border-gray-200 hover:text-gray-600'
            }`}
          >
            <span>{r.icon}</span>
            {!isFlag && count > 0 && <span>{count}</span>}
            {r.type === 'interested' && isActive && <span>Volgend</span>}
          </button>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function FormulierenPage() {
  const [questions, setQuestions]   = useState<Question[]>([])
  const [allReactions, setAllReactions] = useState<Reaction[]>([])
  const [userId, setUserId]         = useState<string | null>(null)
  const [isAdmin, setIsAdmin]       = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [filterSubject, setFilterSubject] = useState('Alle')
  const [filterStatus, setFilterStatus]   = useState('open')
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [answerText, setAnswerText] = useState<Record<string, string>>({})
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ subject: 'Overig', content: '', anonymous: false })
  const [sending, setSending]       = useState(false)
  const [posting, setPosting]       = useState(false)
  const [sent, setSent]             = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null
      setUserId(uid)
      if (uid) {
        const { data: p } = await supabase.from('profiles').select('is_admin,display_name').eq('id',uid).single()
        setIsAdmin(p?.is_admin ?? false)
        setDisplayName(p?.display_name ?? '')
      }
      await Promise.all([loadQuestions(), loadReactions()])
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadQuestions() {
    const { data } = await supabase.from('forms').select('*').order('created_at', { ascending: false })
    setQuestions(data ?? [])
  }

  async function loadReactions() {
    const { data } = await supabase.from('post_reactions').select('*')
    setAllReactions(data ?? [])
  }

  async function loadAnswers(qId: string) {
    const { data } = await supabase
      .from('form_answers')
      .select('*, profiles!form_answers_user_id_profiles_fkey(display_name)')
      .eq('question_id', qId)
      .order('is_accepted', { ascending: false })
      .order('created_at', { ascending: true })
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, answers: (data ?? []) as Answer[] } : q))
  }

  const toggleReaction = useCallback(async (targetType: string, targetId: string, type: string, isActive: boolean) => {
    if (!userId) return
    if (isActive) {
      await supabase.from('post_reactions').delete()
        .eq('target_type', targetType).eq('target_id', targetId)
        .eq('user_id', userId).eq('type', type)
      setAllReactions(prev => prev.filter(r =>
        !(r.target_type === targetType && r.target_id === targetId && r.user_id === userId && r.type === type)
      ))
    } else {
      await supabase.from('post_reactions').insert({ target_type: targetType, target_id: targetId, user_id: userId, type })
      setAllReactions(prev => [...prev, { target_type: targetType, target_id: targetId, user_id: userId, type }])
    }
  }, [userId])

  async function toggleExpand(qId: string) {
    if (expanded === qId) { setExpanded(null); return }
    setExpanded(qId)
    await loadAnswers(qId)
  }

  async function submitQuestion() {
    if (!form.content.trim()) return
    setSending(true)
    await supabase.from('forms').insert({
      user_id: userId, name: form.anonymous ? 'Anoniem' : (displayName || undefined),
      subject: form.subject, content: form.content.trim(),
    })
    setForm({ subject: 'Overig', content: '', anonymous: false })
    setShowForm(false); setSent(true)
    setTimeout(() => setSent(false), 4000)
    await loadQuestions(); setSending(false)
  }

  async function submitAnswer(qId: string) {
    if (!userId || !answerText[qId]?.trim()) return
    setPosting(true)
    await supabase.from('form_answers').insert({ question_id: qId, user_id: userId, content: answerText[qId].trim() })
    setAnswerText(prev => ({ ...prev, [qId]: '' }))
    await loadAnswers(qId); setPosting(false)
  }

  async function markAccepted(answerId: string, questionId: string) {
    // Unmark others first
    await supabase.from('form_answers').update({ is_accepted: false }).eq('question_id', questionId)
    await supabase.from('form_answers').update({ is_accepted: true }).eq('id', answerId)
    await supabase.from('forms').update({ status: 'answered' }).eq('id', questionId)
    await loadAnswers(questionId)
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, status: 'answered' } : q))
  }

  async function closeQuestion(qId: string) {
    await supabase.from('forms').update({ status: 'closed' }).eq('id', qId)
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, status: 'closed' } : q))
  }

  async function deleteQuestion(qId: string) {
    await supabase.from('forms').delete().eq('id', qId)
    setQuestions(prev => prev.filter(q => q.id !== qId))
    if (expanded === qId) setExpanded(null)
  }

  const filtered = questions.filter(q =>
    (filterSubject === 'Alle' || q.subject === filterSubject) &&
    (filterStatus === 'alle' || q.status === filterStatus)
  )

  const FB = '#1877F2'
  const STATUS_STYLE: Record<string, {bg:string;color:string}> = {
    answered: { bg: '#D4EDDA', color: '#155724' },
    closed:   { bg: '#E4E6EB', color: '#65676B' },
    open:     { bg: '#FFF3CD', color: '#856404' },
  }

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif' }}>

      {/* Page header */}
      <div className="fb-card">
        <div className="fb-page-cover" style={{ background: 'linear-gradient(135deg, #F5C400, #FF7043)' }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, padding: '0 16px 16px', marginTop: -32 }}>
          <div className="fb-page-icon">❓</div>
          <div style={{ flex: 1, paddingBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1C1E21' }}>Vragen & Antwoorden</h1>
            <p style={{ margin: 0, fontSize: 14, color: '#65676B' }}>Stel een vraag — iedereen kan antwoorden</p>
          </div>
          <button onClick={() => setShowForm(true)} className="fb-btn fb-btn-primary">+ Vraag stellen</button>
        </div>

        {/* Status filters */}
        <div className="fb-filter-tabs" style={{ borderTop: '1px solid #E4E6EB', paddingTop: 12 }}>
          {[['open','❓ Open'],['answered','✅ Beantwoord'],['alle','Alle']].map(([s,l]) => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`fb-filter-btn ${filterStatus === s ? 'active' : ''}`}>{l}</button>
          ))}
        </div>

        {/* Subject filters */}
        <div className="fb-filter-tabs" style={{ paddingTop: 0, paddingBottom: 12 }}>
          {['Alle',...SUBJECTS].map(s => (
            <button key={s} onClick={() => setFilterSubject(s)} className={`fb-filter-btn ${filterSubject === s ? 'active' : ''}`} style={{ fontSize: 13 }}>{s}</button>
          ))}
        </div>
      </div>

      {sent && (
        <div style={{ background: '#D4EDDA', border: '1px solid #C3E6CB', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: '#155724', fontWeight: 600 }}>
          ✅ Vraag geplaatst! Iedereen kan nu antwoorden.
        </div>
      )}

      {filtered.length === 0 && (
        <div className="fb-card" style={{ padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>❓</div>
          <p style={{ fontWeight: 800, fontSize: 18, color: '#1C1E21', margin: '0 0 8px' }}>Geen vragen gevonden</p>
          <button onClick={() => setShowForm(true)} className="fb-btn fb-btn-primary fb-btn-lg">Stel de eerste vraag</button>
        </div>
      )}

      {filtered.map(q => {
        const isOpen = expanded === q.id
        const qReactions = allReactions.filter(r => r.target_type === 'question' && r.target_id === q.id)
        const answerCount = q.answers?.length ?? 0
        const st = STATUS_STYLE[q.status] ?? STATUS_STYLE.open

        return (
          <div key={q.id} className="fb-card" style={{ border: isOpen ? `2px solid ${FB}` : '2px solid transparent', transition: 'border-color .15s' }}>
            {/* Question header — clickable */}
            <button onClick={() => toggleExpand(q.id)}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 16px', textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#E4E6EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>❓</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ background: st.bg, color: st.color, borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>
                    {q.status === 'answered' ? '✅ Beantwoord' : q.status === 'closed' ? '🔒 Gesloten' : '❓ Open'}
                  </span>
                  <span style={{ background: '#E7F3FF', color: FB, borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{q.subject}</span>
                </div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1C1E21', lineHeight: 1.4 }}>
                  {q.content.slice(0,140)}{q.content.length > 140 ? '…' : ''}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#65676B' }}>
                  {q.name || 'Anoniem'} · {timeAgo(q.created_at)}{answerCount > 0 ? ` · ${answerCount} antwoord${answerCount > 1 ? 'en' : ''}` : ''}
                </p>
                <ReactionBar targetType="question" targetId={q.id} reactions={qReactions} userId={userId} onToggle={toggleReaction} />
              </div>
              <span style={{ color: '#65676B', fontSize: 18, transition: 'transform .2s', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0, marginTop: 4 }}>▾</span>
            </button>

            {isOpen && (
              <>
                <div style={{ height: 1, background: '#E4E6EB' }} />
                {/* Full content */}
                <div style={{ padding: '12px 16px', background: '#F0F2F5' }}>
                  <p style={{ margin: 0, fontSize: 15, color: '#1C1E21', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{q.content}</p>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                      {q.status !== 'closed' && <button onClick={() => closeQuestion(q.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#65676B', fontFamily: 'inherit' }}>🔒 Sluiten</button>}
                      <button onClick={() => deleteQuestion(q.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#E41E3F', fontFamily: 'inherit' }}>🗑 Verwijderen</button>
                    </div>
                  )}
                </div>

                {/* Answers */}
                {(q.answers ?? []).map(a => {
                  const aReactions = allReactions.filter(r => r.target_type === 'answer' && r.target_id === a.id)
                  const canMark = userId === q.user_id || isAdmin
                  return (
                    <div key={a.id} style={{ borderTop: '1px solid #E4E6EB', padding: '12px 16px', background: a.is_accepted ? '#F0FFF4' : '#fff', display: 'flex', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: FB, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                        {(a.profiles?.display_name ?? '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#1C1E21' }}>{a.profiles?.display_name ?? 'Anoniem'}</span>
                          <span style={{ fontSize: 13, color: '#65676B' }}>{timeAgo(a.created_at)}</span>
                          {a.is_accepted && <span style={{ background: '#D4EDDA', color: '#155724', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>✅ Beste antwoord</span>}
                        </div>
                        <p style={{ margin: '0 0 6px', fontSize: 15, color: '#1C1E21', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{a.content}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <ReactionBar targetType="answer" targetId={a.id} reactions={aReactions} userId={userId} onToggle={toggleReaction} />
                          {canMark && !a.is_accepted && q.status !== 'closed' && (
                            <button onClick={() => markAccepted(a.id, q.id)}
                              style={{ background: 'none', border: '1px solid #42B72A', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700, color: '#42B72A', cursor: 'pointer', fontFamily: 'inherit' }}>
                              ✅ Beste antwoord
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {(q.answers?.length ?? 0) === 0 && (
                  <div style={{ borderTop: '1px solid #E4E6EB', padding: '16px', textAlign: 'center', color: '#65676B', fontSize: 14 }}>Nog geen antwoorden — wees de eerste!</div>
                )}

                {/* Answer input */}
                {userId && q.status !== 'closed' && (
                  <div style={{ borderTop: '1px solid #E4E6EB', padding: '12px 16px', background: '#F0F2F5' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: FB, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                        {displayName[0]?.toUpperCase() ?? '?'}
                      </div>
                      <div style={{ flex: 1, background: '#fff', borderRadius: 20, padding: '8px 12px' }}>
                        <textarea
                          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', fontSize: 14, color: '#1C1E21', resize: 'none', minHeight: 36, fontFamily: 'inherit' }}
                          placeholder="Schrijf een antwoord…"
                          value={answerText[q.id] ?? ''}
                          onChange={e => setAnswerText(prev => ({ ...prev, [q.id]: e.target.value }))}
                          rows={2}
                        />
                      </div>
                      <button onClick={() => submitAnswer(q.id)} disabled={posting || !answerText[q.id]?.trim()}
                        className="fb-btn fb-btn-primary fb-btn-sm" style={{ flexShrink: 0, opacity: (posting || !answerText[q.id]?.trim()) ? 0.5 : 1 }}>
                        Plaatsen
                      </button>
                    </div>
                  </div>
                )}
                {!userId && (
                  <div style={{ borderTop: '1px solid #E4E6EB', padding: '12px 16px', textAlign: 'center', fontSize: 14, color: '#65676B' }}>
                    <a href="/auth/login" style={{ color: FB, fontWeight: 700, textDecoration: 'none' }}>Aanmelden</a> om te antwoorden.
                  </div>
                )}
              </>
            )}
          </div>
        )
      })}

      {/* New question modal */}
      {showForm && (
        <div className="fb-modal-overlay">
          <div className="fb-modal">
            <div className="fb-modal-header">
              <h2 className="fb-modal-title">Vraag stellen</h2>
              <button className="fb-modal-close" onClick={() => setShowForm(false)}>×</button>
            </div>
            <div className="fb-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 14, color: '#65676B' }}>Stel je vraag duidelijk. Iedereen op het platform kan antwoorden.</p>
              <select className="fb-input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <textarea className="fb-input" style={{ height: 120, resize: 'none' }}
                placeholder="Geef context: welk niveau, welk onderdeel, wat snap je nog niet?"
                value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
              {userId && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 14, color: '#65676B' }}>
                  <input type="checkbox" checked={form.anonymous} onChange={e => setForm({ ...form, anonymous: e.target.checked })} style={{ width: 16, height: 16, accentColor: FB }} />
                  Anoniem plaatsen
                </label>
              )}
            </div>
            <div className="fb-modal-footer">
              <button className="fb-btn fb-btn-secondary" onClick={() => setShowForm(false)}>Annuleren</button>
              <button className="fb-btn fb-btn-primary" onClick={submitQuestion} disabled={sending || !form.content.trim()} style={{ opacity: (sending || !form.content.trim()) ? 0.5 : 1 }}>
                {sending ? 'Plaatsen…' : 'Vraag plaatsen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
