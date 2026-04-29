'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Formulieren = open Q&A: iedereen kan een vraag stellen, iedereen kan antwoorden.
// Admin kan vragen sluiten of verwijderen.

interface Question {
  id: string; subject: string; content: string; status: string
  created_at: string; user_id?: string
  name?: string
  answer_count?: number
  answers?: Answer[]
}

interface Answer {
  id: string; content: string; created_at: string
  user_id: string; helpful_count: number
  profiles?: { display_name: string }
}

const SUBJECTS = [
  'Aardrijkskunde', 'Nederlands', 'Frans', 'Engels', 'Wiskunde',
  'Economie', 'Wetenschappen', 'Geschiedenis', 'Platform', 'Overig',
]

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'zojuist'
  if (m < 60) return `${m}m geleden`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}u geleden`
  return `${Math.floor(h / 24)}d geleden`
}

export default function FormulierenPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [filterSubject, setFilterSubject] = useState('Alle')
  const [filterStatus, setFilterStatus] = useState('open')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState<Record<string, string>>({})
  const [posting, setPosting] = useState(false)

  // New question form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ subject: 'Overig', content: '', anonymous: false })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null
      setUserId(uid)
      if (uid) {
        const { data: p } = await supabase.from('profiles').select('is_admin, display_name').eq('id', uid).single()
        setIsAdmin(p?.is_admin ?? false)
        setDisplayName(p?.display_name ?? '')
      }
      await loadQuestions()
    })
  }, [])

  async function loadQuestions() {
    const query = supabase
      .from('forms')
      .select('*')
      .order('created_at', { ascending: false })
    if (filterStatus !== 'alle') query.eq('status', filterStatus === 'open' ? 'open' : filterStatus)
    const { data } = await query
    setQuestions(data ?? [])
  }

  async function loadAnswers(qId: string) {
    const { data } = await supabase
      .from('form_answers')
      .select('*, profiles(display_name)')
      .eq('question_id', qId)
      .order('created_at', { ascending: true })
    setQuestions(prev => prev.map(q => q.id === qId ? { ...q, answers: data ?? [] } : q))
  }

  async function toggleExpand(qId: string) {
    if (expanded === qId) { setExpanded(null); return }
    setExpanded(qId)
    await loadAnswers(qId)
  }

  async function submitQuestion() {
    if (!form.content.trim() || !form.subject) return
    setSending(true)
    await supabase.from('forms').insert({
      user_id: userId,
      name: form.anonymous ? 'Anoniem' : (displayName || undefined),
      subject: form.subject,
      content: form.content.trim(),
    })
    setForm({ subject: 'Overig', content: '', anonymous: false })
    setShowForm(false)
    setSent(true)
    setTimeout(() => setSent(false), 4000)
    await loadQuestions()
    setSending(false)
  }

  async function submitAnswer(qId: string) {
    if (!userId || !answerText[qId]?.trim()) return
    setPosting(true)
    await supabase.from('form_answers').insert({
      question_id: qId, user_id: userId, content: answerText[qId].trim(),
    })
    setAnswerText(prev => ({ ...prev, [qId]: '' }))
    await loadAnswers(qId)
    setPosting(false)
  }

  async function markHelpful(answerId: string, currentCount: number) {
    await supabase.from('form_answers').update({ helpful_count: currentCount + 1 }).eq('id', answerId)
    setQuestions(prev => prev.map(q => ({
      ...q,
      answers: q.answers?.map(a => a.id === answerId ? { ...a, helpful_count: a.helpful_count + 1 } : a),
    })))
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
        <button onClick={() => setShowForm(true)} className="btn-primary text-sm px-4 py-2">
          + Vraag stellen
        </button>
      </div>
      <p className="text-gray-500 text-sm mb-6">
        Stel een vraag over een vak of richting — iedereen kan antwoorden.
      </p>

      {sent && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 mb-4">
          ✅ Je vraag is geplaatst! Iedereen kan nu antwoorden.
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        <div className="flex gap-1">
          {['open', 'answered', 'alle'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                filterStatus === s ? 'bg-gray-800 text-white' : 'bg-white border border-warm-gray text-gray-600 hover:bg-gray-50'
              }`}>
              {s === 'open' ? 'Open' : s === 'answered' ? 'Beantwoord' : 'Alle'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          {['Alle', ...SUBJECTS].map(s => (
            <button key={s} onClick={() => setFilterSubject(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                filterSubject === s ? 'bg-primary-500 text-white' : 'bg-white border border-warm-gray text-gray-600 hover:bg-gray-50'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Questions */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-3xl mb-2">❓</p>
          <p className="font-semibold">Geen vragen gevonden</p>
          <button onClick={() => setShowForm(true)} className="mt-3 btn-primary text-sm px-4 py-2">
            Stel de eerste vraag →
          </button>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(q => {
          const isOpen = expanded === q.id
          return (
            <div key={q.id} className={`bg-white border rounded-2xl overflow-hidden transition-shadow ${
              isOpen ? 'border-primary-300 shadow-md' : 'border-warm-gray hover:shadow-sm'
            }`}>
              {/* Question header */}
              <button onClick={() => toggleExpand(q.id)} className="w-full text-left px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        q.status === 'answered' ? 'bg-green-100 text-green-700' :
                        q.status === 'closed' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {q.status === 'answered' ? '✅ Beantwoord' : q.status === 'closed' ? '🔒 Gesloten' : '❓ Open'}
                      </span>
                      <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">{q.subject}</span>
                    </div>
                    <p className="font-semibold text-gray-900 text-sm">{q.content.slice(0, 120)}{q.content.length > 120 ? '...' : ''}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {q.name || 'Anoniem'} · {timeAgo(q.created_at)}
                      {(q.answer_count ?? 0) > 0 && ` · ${q.answer_count} antwoorden`}
                    </p>
                  </div>
                  <span className={`text-gray-400 text-xs transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </button>

              {/* Expanded: full question + answers */}
              {isOpen && (
                <div className="border-t border-warm-gray">
                  {/* Full question */}
                  <div className="px-5 py-4 bg-gray-50">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{q.content}</p>
                    {isAdmin && (
                      <div className="flex gap-3 mt-3">
                        {q.status === 'open' && (
                          <button onClick={() => closeQuestion(q.id)} className="text-xs text-gray-500 hover:text-gray-700">🔒 Sluiten</button>
                        )}
                        <button onClick={() => deleteQuestion(q.id)} className="text-xs text-red-400 hover:text-red-600">🗑 Verwijderen</button>
                      </div>
                    )}
                  </div>

                  {/* Answers */}
                  {q.answers && q.answers.length > 0 && (
                    <div className="divide-y divide-warm-gray">
                      {q.answers.map((a, i) => (
                        <div key={a.id} className={`px-5 py-4 ${i === 0 && q.status === 'answered' ? 'bg-green-50' : ''}`}>
                          <div className="flex items-start gap-3">
                            <div className="w-7 h-7 rounded-full bg-primary-200 flex items-center justify-center text-xs font-bold text-primary-700 flex-shrink-0 mt-0.5">
                              {(a.profiles?.display_name ?? '?')[0].toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-semibold text-gray-800">{a.profiles?.display_name ?? 'Anoniem'}</span>
                                <span className="text-xs text-gray-400">{timeAgo(a.created_at)}</span>
                                {i === 0 && q.status === 'answered' && <span className="text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded font-bold">Beste antwoord</span>}
                              </div>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{a.content}</p>
                              <button onClick={() => markHelpful(a.id, a.helpful_count)}
                                className="text-xs text-gray-400 hover:text-primary-600 mt-1.5">
                                👍 Nuttig {a.helpful_count > 0 ? `(${a.helpful_count})` : ''}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Answer input */}
                  {userId && q.status !== 'closed' && (
                    <div className="px-5 py-4 border-t border-warm-gray bg-gray-50">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Jouw antwoord</p>
                      <div className="flex gap-2">
                        <textarea
                          className="flex-1 border border-warm-gray rounded-xl px-3 py-2 text-sm resize-none h-20 bg-white"
                          placeholder="Schrijf een antwoord..."
                          value={answerText[q.id] ?? ''}
                          onChange={e => setAnswerText(prev => ({ ...prev, [q.id]: e.target.value }))}
                        />
                        <button onClick={() => submitAnswer(q.id)}
                          disabled={posting || !answerText[q.id]?.trim()}
                          className="btn-primary text-sm px-4 self-end disabled:opacity-50">
                          Plaatsen
                        </button>
                      </div>
                    </div>
                  )}

                  {!userId && (
                    <div className="px-5 py-3 border-t border-warm-gray text-center text-sm text-gray-500">
                      <a href="/auth/login" className="text-primary-600 underline font-medium">Inloggen</a> om te antwoorden
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
            <p className="text-sm text-gray-500">Stel een vraag over een vak of je studierichting — iedereen in het platform kan antwoorden.</p>
            <div className="space-y-3">
              <select className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
                value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <textarea
                className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm resize-none h-32"
                placeholder="Schrijf je vraag zo duidelijk mogelijk. Geef context: welk niveau, welk onderdeel, wat snap je al niet?"
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
              />
              {userId && (
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={form.anonymous}
                    onChange={e => setForm({ ...form, anonymous: e.target.checked })}
                    className="w-4 h-4 rounded" />
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
