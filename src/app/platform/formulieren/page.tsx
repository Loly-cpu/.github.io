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

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">❓ Vragen & Antwoorden</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm px-4 py-2">+ Vraag stellen</button>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Stel een vraag over je vak of richting — iedereen kan antwoorden. Gebruik 🔔 om meldingen te krijgen.
      </p>

      {sent && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 mb-4">
          ✅ Vraag geplaatst! Iedereen kan nu antwoorden.
        </div>
      )}

      {/* Filters */}
      <div className="space-y-2 mb-5">
        <div className="flex gap-1 flex-wrap">
          {['open','answered','alle'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${filterStatus === s ? 'bg-gray-800 text-white' : 'bg-white border border-warm-gray text-gray-600 hover:bg-gray-50'}`}>
              {s === 'open' ? 'Open' : s === 'answered' ? '✅ Beantwoord' : 'Alle'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {['Alle',...SUBJECTS].map(s => (
            <button key={s} onClick={() => setFilterSubject(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${filterSubject === s ? 'bg-primary-500 text-white' : 'bg-white border border-warm-gray text-gray-600 hover:bg-gray-50'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Question list */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-3xl mb-2">❓</p>
          <p className="font-semibold">Geen vragen gevonden</p>
          <button onClick={() => setShowForm(true)} className="mt-3 btn-primary text-sm px-4 py-2">Stel de eerste vraag →</button>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(q => {
          const isOpen = expanded === q.id
          const qReactions = allReactions.filter(r => r.target_type === 'question' && r.target_id === q.id)
          const answerCount = q.answers?.length ?? 0

          return (
            <div key={q.id} className={`bg-white border rounded-2xl overflow-hidden transition-shadow ${isOpen ? 'border-primary-300 shadow-md' : 'border-warm-gray hover:shadow-sm'}`}>
              {/* Header */}
              <button onClick={() => toggleExpand(q.id)} className="w-full text-left px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        q.status === 'answered' ? 'bg-green-100 text-green-700' :
                        q.status === 'closed'   ? 'bg-gray-100 text-gray-500' :
                                                  'bg-amber-100 text-amber-700'
                      }`}>
                        {q.status === 'answered' ? '✅ Beantwoord' : q.status === 'closed' ? '🔒 Gesloten' : '❓ Open'}
                      </span>
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">{q.subject}</span>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm leading-snug">
                      {q.content.slice(0,140)}{q.content.length > 140 ? '…' : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {q.name || 'Anoniem'} · {timeAgo(q.created_at)}
                      {answerCount > 0 && ` · ${answerCount} antwoord${answerCount > 1 ? 'en' : ''}`}
                    </p>
                    {/* Reaction bar on question (collapsed view) */}
                    <ReactionBar targetType="question" targetId={q.id}
                      reactions={qReactions} userId={userId} onToggle={toggleReaction} />
                  </div>
                  <span className={`text-gray-400 text-xs transition-transform flex-shrink-0 mt-1 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </button>

              {/* Expanded */}
              {isOpen && (
                <div className="border-t border-warm-gray">
                  {/* Full question */}
                  <div className="px-5 py-4 bg-gray-50">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{q.content}</p>
                    {isAdmin && (
                      <div className="flex gap-3 mt-3">
                        {q.status !== 'closed' && (
                          <button onClick={() => closeQuestion(q.id)} className="text-xs text-gray-500 hover:text-gray-700">🔒 Sluiten</button>
                        )}
                        <button onClick={() => deleteQuestion(q.id)} className="text-xs text-red-400 hover:text-red-600">🗑 Verwijderen</button>
                      </div>
                    )}
                  </div>

                  {/* Answers */}
                  {q.answers && q.answers.length > 0 && (
                    <div className="divide-y divide-warm-gray">
                      {q.answers.map(a => {
                        const aReactions = allReactions.filter(r => r.target_type === 'answer' && r.target_id === a.id)
                        const canMarkAnswer = userId === q.user_id || isAdmin
                        return (
                          <div key={a.id} className={`px-5 py-4 ${a.is_accepted ? 'bg-green-50' : ''}`}>
                            <div className="flex items-start gap-3">
                              <div className="w-7 h-7 rounded-full bg-primary-200 flex items-center justify-center text-xs font-bold text-primary-700 flex-shrink-0 mt-0.5">
                                {(a.profiles?.display_name ?? '?')[0].toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="text-xs font-semibold text-gray-800">{a.profiles?.display_name ?? 'Anoniem'}</span>
                                  <span className="text-xs text-gray-400">{timeAgo(a.created_at)}</span>
                                  {a.is_accepted && (
                                    <span className="text-xs bg-green-200 text-green-800 px-2 py-0.5 rounded-full font-bold">✅ Beste antwoord</span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{a.content}</p>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                  <ReactionBar targetType="answer" targetId={a.id}
                                    reactions={aReactions} userId={userId} onToggle={toggleReaction} />
                                  {canMarkAnswer && !a.is_accepted && q.status !== 'closed' && (
                                    <button onClick={() => markAccepted(a.id, q.id)}
                                      className="text-xs text-green-600 hover:text-green-800 font-medium border border-green-200 px-2 py-0.5 rounded-full hover:bg-green-50 transition-colors">
                                      ✅ Markeer als antwoord
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {q.answers?.length === 0 && (
                    <div className="px-5 py-4 text-sm text-gray-400 text-center">
                      Nog geen antwoorden — wees de eerste!
                    </div>
                  )}

                  {/* Answer input */}
                  {userId && q.status !== 'closed' && (
                    <div className="px-5 py-4 border-t border-warm-gray bg-gray-50">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Jouw antwoord</p>
                      <div className="flex gap-2 items-end">
                        <textarea
                          className="flex-1 border border-warm-gray rounded-xl px-3 py-2 text-sm resize-none h-20 bg-white"
                          placeholder="Schrijf een antwoord... Weet je het niet zeker? Reageer gerust, anderen kunnen aanvullen."
                          value={answerText[q.id] ?? ''}
                          onChange={e => setAnswerText(prev => ({ ...prev, [q.id]: e.target.value }))}
                        />
                        <button onClick={() => submitAnswer(q.id)}
                          disabled={posting || !answerText[q.id]?.trim()}
                          className="btn-primary text-sm px-4 py-2 self-end disabled:opacity-50 flex-shrink-0">
                          Plaatsen
                        </button>
                      </div>
                    </div>
                  )}
                  {!userId && (
                    <div className="px-5 py-3 border-t border-warm-gray text-center text-sm text-gray-500">
                      <a href="/auth/login" className="text-primary-600 underline font-medium">Inloggen</a> om te antwoorden of reageren.
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* New question modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">❓ Vraag stellen</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <p className="text-sm text-gray-500">Iedereen op het platform kan antwoorden. Gebruik 🔔 Volgen op vragen van anderen om meldingen te krijgen.</p>
            <div className="space-y-3">
              <select className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
                value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <textarea className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm resize-none h-36"
                placeholder="Schrijf je vraag duidelijk. Geef context: welk niveau, welk onderdeel, wat snap je nog niet?"
                value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
              {userId && (
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={form.anonymous}
                    onChange={e => setForm({ ...form, anonymous: e.target.checked })} className="w-4 h-4 rounded" />
                  Anoniem plaatsen
                </label>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="btn-ghost text-sm px-4 py-2">Annuleren</button>
              <button onClick={submitQuestion} disabled={sending || !form.content.trim()}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                {sending ? 'Plaatsen...' : 'Vraag plaatsen →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
