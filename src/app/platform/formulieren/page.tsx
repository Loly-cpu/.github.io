'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Form {
  id: string; name?: string; subject: string; content: string
  status: string; answer?: string; created_at: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open:     { label: 'Open',         color: 'bg-amber-100 text-amber-700' },
  answered: { label: 'Beantwoord',   color: 'bg-green-100 text-green-700' },
  closed:   { label: 'Gesloten',     color: 'bg-gray-100 text-gray-600' },
}

export default function FormulierenPage() {
  const [forms, setForms] = useState<Form[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ name: '', subject: '', content: '' })
  const [sending, setSending] = useState(false)
  const [answerMap, setAnswerMap] = useState<Record<string, string>>({})

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null
      setUserId(uid)
      if (uid) {
        const { data: p } = await supabase.from('profiles').select('is_admin, display_name').eq('id', uid).single()
        setIsAdmin(p?.is_admin ?? false)
        if (p?.display_name) setForm((f) => ({ ...f, name: p.display_name }))
      }
      await loadForms(uid)
    })
  }, [])

  async function loadForms(uid: string | null) {
    const { data } = await supabase
      .from('forms')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setForms(data)
  }

  async function submitForm() {
    if (!form.subject || !form.content) return
    setSending(true)
    await supabase.from('forms').insert({
      user_id: userId, name: form.name, subject: form.subject, content: form.content,
    })
    setSending(false)
    setSubmitted(true)
    setForm({ name: form.name, subject: '', content: '' })
    await loadForms(userId)
  }

  async function answerForm(id: string) {
    const answer = answerMap[id]?.trim()
    if (!answer) return
    await supabase.from('forms').update({ answer, status: 'answered' }).eq('id', id)
    await loadForms(userId)
  }

  async function closeForm(id: string) {
    await supabase.from('forms').update({ status: 'closed' }).eq('id', id)
    await loadForms(userId)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📝 Formulieren</h1>
        <p className="text-gray-500 text-sm mt-0.5">Stel een algemene vraag aan de beheerder.</p>
      </div>

      {/* Submit form */}
      <div className="card mb-8">
        <h2 className="font-bold text-gray-900 mb-4">Nieuwe vraag stellen</h2>
        {submitted && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 mb-4">
            ✅ Je vraag is verstuurd! De beheerder zal zo snel mogelijk antwoorden.
          </div>
        )}
        <div className="space-y-3">
          <input className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
            placeholder="Naam (optioneel)" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
            placeholder="Onderwerp*" value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <textarea className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm resize-none h-28"
            placeholder="Jouw vraag of opmerking*..." value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })} />
          <button onClick={submitForm} disabled={sending || !form.subject || !form.content}
            className="btn-primary w-full py-2.5 disabled:opacity-50">
            {sending ? 'Versturen...' : 'Vraag versturen →'}
          </button>
        </div>
      </div>

      {/* Question list (own or all if admin) */}
      {(userId) && (
        <div>
          <h2 className="font-bold text-gray-900 mb-4">
            {isAdmin ? 'Alle vragen' : 'Mijn vragen'} ({forms.length})
          </h2>
          {forms.length === 0 && <p className="text-sm text-gray-500">Nog geen vragen.</p>}
          <div className="space-y-4">
            {forms.map((f) => (
              <div key={f.id} className="bg-white border border-warm-gray rounded-2xl overflow-hidden">
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{f.subject}</p>
                      {f.name && <p className="text-xs text-gray-400">{f.name} · {new Date(f.created_at).toLocaleDateString('nl-BE')}</p>}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${STATUS_LABELS[f.status]?.color}`}>
                      {STATUS_LABELS[f.status]?.label ?? f.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{f.content}</p>

                  {/* Answer display */}
                  {f.answer && (
                    <div className="mt-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                      <p className="text-xs font-semibold text-green-700 mb-1">Antwoord van beheerder</p>
                      <p className="text-sm text-green-900 whitespace-pre-wrap">{f.answer}</p>
                    </div>
                  )}

                  {/* Admin controls */}
                  {isAdmin && f.status === 'open' && (
                    <div className="mt-3 space-y-2">
                      <textarea
                        className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm resize-none h-20"
                        placeholder="Schrijf een antwoord..."
                        value={answerMap[f.id] ?? ''}
                        onChange={(e) => setAnswerMap({ ...answerMap, [f.id]: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <button onClick={() => answerForm(f.id)}
                          disabled={!answerMap[f.id]?.trim()}
                          className="btn-primary text-sm px-4 py-1.5 disabled:opacity-50">
                          Antwoorden
                        </button>
                        <button onClick={() => closeForm(f.id)}
                          className="btn-ghost text-sm px-4 py-1.5">
                          Sluiten
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
