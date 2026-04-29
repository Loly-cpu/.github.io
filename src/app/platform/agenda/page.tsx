'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Event {
  id: string; title: string; start_at: string; end_at: string
  type: string; color: string; notes?: string; all_day: boolean
}

interface AiSession {
  subject: string; start: string; end: string
  topic: string; priority: string; type: string
}

interface AiDay { date: string; sessions: AiSession[] }
interface AiPlan { plan: AiDay[]; tips: string[]; warning?: string }

const TYPE_COLORS: Record<string, string> = {
  personal: '#6366f1', school: '#3b82f6', exam: '#ef4444',
  study: '#22c55e', busy: '#9ca3af',
}
const TYPE_LABELS: Record<string, string> = {
  personal: 'Persoonlijk', school: 'School', exam: 'Examen',
  study: 'Studie', busy: 'Bezet',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })
}
function isoDate(d: Date) { return d.toISOString().split('T')[0] }

function getWeekDays(base: Date): Date[] {
  const monday = new Date(base)
  monday.setDate(base.getDate() - ((base.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d
  })
}

export default function AgendaPage() {
  const searchParams = useSearchParams()
  const [events, setEvents]       = useState<Event[]>([])
  const [userId, setUserId]       = useState<string | null>(null)
  const [gcalConnected, setGcalConnected] = useState(false)
  const [week, setWeek]           = useState(new Date())
  const [showForm, setShowForm]   = useState(false)
  const [showAi, setShowAi]       = useState(false)
  const [showIcal, setShowIcal]   = useState(false)
  const [showGcal, setShowGcal]   = useState(false)
  const [icalUrl, setIcalUrl]     = useState('')
  const [icalName, setIcalName]   = useState('Smartschool')
  const [icalLoading, setIcalLoading] = useState(false)
  const [icalEvents, setIcalEvents]   = useState<{summary:string;start:string;end:string;allDay:boolean}[]>([])
  const [icalErr, setIcalErr]         = useState('')
  const [gcalStatus, setGcalStatus]   = useState<'idle'|'success'|'error'>('idle')
  const [aiPlan, setAiPlan] = useState<AiPlan | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '', start_at: '', end_at: '', type: 'personal', notes: '', all_day: false,
  })
  // AI form
  const [aiExams, setAiExams] = useState(
    'Aardrijkskunde,2026-05-06,11:15\nNederlands 1,2026-05-29,11:15'
  )
  const [aiBusy, setAiBusy] = useState('')
  const [aiPrefs, setAiPrefs] = useState('Max 3 uur per dag, liefst in de voormiddag')

  useEffect(() => {
    const gcal = searchParams.get('gcal')
    if (gcal === 'success') setGcalStatus('success')
    if (gcal === 'error')   setGcalStatus('error')

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const uid = data.session.user.id
      setUserId(uid)
      await loadEvents(uid)
      // Check if Google Calendar is connected
      const { data: tok } = await supabase.from('calendar_tokens').select('user_id').eq('user_id', uid).single()
      setGcalConnected(!!tok)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadEvents(uid: string) {
    const { data } = await supabase
      .from('events').select('*').eq('user_id', uid).order('start_at')
    if (data) setEvents(data)
  }

  async function saveEvent() {
    if (!userId || !form.title || !form.start_at) return
    setSaving(true)
    const end = form.end_at || form.start_at
    await supabase.from('events').insert({
      user_id: userId, title: form.title,
      start_at: form.start_at, end_at: end,
      type: form.type, color: TYPE_COLORS[form.type] ?? '#6366f1',
      notes: form.notes, all_day: form.all_day,
    })
    await loadEvents(userId)
    setForm({ title: '', start_at: '', end_at: '', type: 'personal', notes: '', all_day: false })
    setShowForm(false)
    setSaving(false)
  }

  async function deleteEvent(id: string) {
    await supabase.from('events').delete().eq('id', id)
    setEvents((prev) => prev.filter((e) => e.id !== id))
  }

  async function previewIcal() {
    if (!icalUrl.trim()) return
    setIcalLoading(true); setIcalErr(''); setIcalEvents([])
    try {
      const res = await fetch(`/api/ical?url=${encodeURIComponent(icalUrl.trim())}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setIcalEvents(data.events)
    } catch (e) { setIcalErr(e instanceof Error ? e.message : String(e)) }
    finally { setIcalLoading(false) }
  }

  async function importIcal() {
    if (!userId || !icalEvents.length) return
    // Save feed URL
    await supabase.from('ical_feeds').upsert({ user_id: userId, name: icalName, url: icalUrl.trim(), last_synced: new Date().toISOString() })
    // Import events
    const inserts = icalEvents.map(e => ({
      user_id: userId, title: e.summary, start_at: e.start, end_at: e.end,
      type: 'school', color: TYPE_COLORS.school, all_day: e.allDay,
    }))
    await supabase.from('events').insert(inserts)
    await loadEvents(userId)
    setShowIcal(false); setIcalEvents([]); setIcalUrl('')
  }

  async function importAiPlan() {
    if (!userId || !aiPlan) return
    const inserts = aiPlan.plan.flatMap((day) =>
      day.sessions.map((s) => ({
        user_id: userId,
        title: `${s.subject} — ${s.topic}`,
        start_at: `${day.date}T${s.start}:00`,
        end_at: `${day.date}T${s.end}:00`,
        type: 'study',
        color: TYPE_COLORS.study,
        notes: s.type,
      }))
    )
    await supabase.from('events').insert(inserts)
    await loadEvents(userId)
    setShowAi(false)
    setAiPlan(null)
  }

  async function generatePlan() {
    setAiLoading(true); setAiError('')
    try {
      const exams = aiExams.trim().split('\n').filter(Boolean).map((line) => {
        const [subject, date, start] = line.split(',')
        return { subject: subject.trim(), date: date.trim(), start: start.trim() }
      })
      const busy = aiBusy.trim().split('\n').filter(Boolean).map((line) => {
        const [date, start, end, reason] = line.split(',')
        return { date: date.trim(), start: start.trim(), end: end.trim(), reason: reason?.trim() }
      })
      const res = await fetch('/api/studieplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exams, busy, preferences: aiPrefs }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAiPlan(data)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e))
    } finally {
      setAiLoading(false)
    }
  }

  const days = getWeekDays(week)
  const today = isoDate(new Date())

  function eventsForDay(d: Date) {
    const ds = isoDate(d)
    return events.filter((e) => e.start_at.startsWith(ds))
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">📅 Agenda</h1>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowIcal(true)} className="btn-ghost text-sm flex items-center gap-1.5">
            📥 iCal importeren
          </button>
          <a href="/api/auth/google-calendar"
            className={`btn-ghost text-sm flex items-center gap-1.5 ${gcalConnected ? 'text-green-600' : ''}`}>
            {gcalConnected ? '✅ Google Calendar' : '🗓 Google koppelen'}
          </a>
          <button onClick={() => setShowAi(true)} className="btn-ghost text-sm flex items-center gap-1.5">
            ✨ AI Studieplan
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary text-sm px-4 py-2">
            + Evenement
          </button>
        </div>
      </div>

      {/* Week navigator */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => { const d = new Date(week); d.setDate(d.getDate()-7); setWeek(d) }}
          className="btn-ghost px-3 py-1.5 text-sm">← Vorige</button>
        <span className="font-semibold text-gray-700 text-sm flex-1 text-center">
          {formatDate(days[0].toISOString())} – {formatDate(days[6].toISOString())}
        </span>
        <button onClick={() => { const d = new Date(week); d.setDate(d.getDate()+7); setWeek(d) }}
          className="btn-ghost px-3 py-1.5 text-sm">Volgende →</button>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-7 gap-1 mb-8">
        {days.map((d) => {
          const ds = isoDate(d)
          const dayEvents = eventsForDay(d)
          const isToday = ds === today
          return (
            <div key={ds} className={`rounded-xl border-2 min-h-32 p-2 transition-colors ${
              isToday ? 'border-primary-400 bg-primary-50' : 'border-warm-gray bg-white'
            }`}>
              <div className={`text-xs font-bold mb-1.5 ${isToday ? 'text-primary-700' : 'text-gray-500'}`}>
                <div>{d.toLocaleDateString('nl-BE', { weekday: 'short' })}</div>
                <div className={`text-lg leading-none ${isToday ? 'text-primary-700' : 'text-gray-800'}`}>
                  {d.getDate()}
                </div>
              </div>
              <div className="space-y-0.5">
                {dayEvents.map((e) => (
                  <div key={e.id}
                    className="text-xs px-1.5 py-0.5 rounded font-medium truncate cursor-default group relative"
                    style={{ backgroundColor: (e.color ?? '#6366f1') + '22', color: e.color ?? '#6366f1', border: `1px solid ${e.color ?? '#6366f1'}44` }}
                    title={e.title}>
                    <span className="truncate block">{e.title}</span>
                    <button
                      onClick={() => deleteEvent(e.id)}
                      className="absolute right-0.5 top-0.5 hidden group-hover:block text-red-400 hover:text-red-600 leading-none"
                    >×</button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Upcoming list */}
      <div>
        <h2 className="font-bold text-gray-900 mb-3">Komende evenementen</h2>
        {events.length === 0 && <p className="text-sm text-gray-500">Nog geen evenementen. Voeg er een toe of genereer een AI-studieplan.</p>}
        <div className="space-y-2">
          {events.filter((e) => new Date(e.start_at) >= new Date()).slice(0, 20).map((e) => (
            <div key={e.id} className="flex items-center gap-3 bg-white border border-warm-gray rounded-xl px-4 py-3">
              <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">{e.title}</p>
                <p className="text-xs text-gray-500">{formatDate(e.start_at)} · {formatTime(e.start_at)}–{formatTime(e.end_at)}</p>
              </div>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {TYPE_LABELS[e.type] ?? e.type}
              </span>
              <button onClick={() => deleteEvent(e.id)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Add event modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Nieuw evenement</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="space-y-3">
              <input
                className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
                placeholder="Titel"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <select
                className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Start</label>
                  <input type="datetime-local" className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
                    value={form.start_at}
                    onChange={(e) => setForm({ ...form, start_at: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Eind</label>
                  <input type="datetime-local" className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
                    value={form.end_at}
                    onChange={(e) => setForm({ ...form, end_at: e.target.value })} />
                </div>
              </div>
              <textarea
                className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm resize-none h-20"
                placeholder="Notities (optioneel)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="btn-ghost text-sm px-4 py-2">Annuleren</button>
              <button onClick={saveEvent} disabled={saving || !form.title || !form.start_at}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                {saving ? 'Opslaan...' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Calendar status toast */}
      {gcalStatus !== 'idle' && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${
          gcalStatus === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {gcalStatus === 'success' ? '✅ Google Calendar gekoppeld!' : '❌ Koppeling mislukt — controleer je Client ID/Secret'}
          <button onClick={() => setGcalStatus('idle')} className="ml-3 opacity-60 hover:opacity-100">×</button>
        </div>
      )}

      {/* iCal import modal */}
      {showIcal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4 my-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">📥 iCal importeren</h2>
              <button onClick={() => { setShowIcal(false); setIcalEvents([]); setIcalErr('') }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <p className="text-sm text-gray-500">
              Plak je iCal-URL van <strong>Smartschool</strong>, <strong>Apple Agenda</strong> of een andere agenda.
              In Smartschool: Agenda → ⚙️ → iCal-adres kopiëren.
            </p>
            <div className="space-y-3">
              <input className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
                placeholder="Naam (bijv. Smartschool)" value={icalName}
                onChange={e => setIcalName(e.target.value)} />
              <input className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm font-mono text-xs"
                placeholder="https://smartschool.be/.../ical?..." value={icalUrl}
                onChange={e => { setIcalUrl(e.target.value); setIcalEvents([]); setIcalErr('') }} />
              {icalErr && <p className="text-sm text-red-600">{icalErr}</p>}
              <button onClick={previewIcal} disabled={icalLoading || !icalUrl.trim()}
                className="btn-ghost w-full py-2 text-sm disabled:opacity-50">
                {icalLoading ? 'Laden…' : '🔍 Voorbeeld laden'}
              </button>
            </div>
            {icalEvents.length > 0 && (
              <>
                <div className="max-h-48 overflow-y-auto border border-warm-gray rounded-xl divide-y divide-warm-gray">
                  {icalEvents.slice(0, 20).map((e, i) => (
                    <div key={i} className="px-3 py-2 flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-24 flex-shrink-0">
                        {new Date(e.start).toLocaleDateString('nl-BE', { day:'numeric', month:'short' })}
                      </span>
                      <span className="text-sm text-gray-800 truncate">{e.summary}</span>
                    </div>
                  ))}
                  {icalEvents.length > 20 && <p className="px-3 py-2 text-xs text-gray-400">+ {icalEvents.length - 20} meer</p>}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setIcalEvents([]); setIcalUrl('') }} className="btn-ghost text-sm px-4 py-2 flex-1">Annuleren</button>
                  <button onClick={importIcal} className="btn-primary text-sm px-4 py-2 flex-1">
                    {icalEvents.length} evenementen importeren →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* AI studieplan modal */}
      {showAi && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 space-y-4 my-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">✨ AI Studieplan genereren</h2>
              <button onClick={() => { setShowAi(false); setAiPlan(null) }} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            {!aiPlan ? (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    Examens (één per lijn: Vak,YYYY-MM-DD,HH:MM)
                  </label>
                  <textarea className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm font-mono h-24 resize-none"
                    value={aiExams} onChange={(e) => setAiExams(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    Bezette tijden (één per lijn: YYYY-MM-DD,HH:MM,HH:MM,reden — optioneel)
                  </label>
                  <textarea className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm font-mono h-20 resize-none"
                    placeholder="2026-05-02,09:00,17:00,werk" value={aiBusy} onChange={(e) => setAiBusy(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Voorkeuren</label>
                  <input className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
                    value={aiPrefs} onChange={(e) => setAiPrefs(e.target.value)} />
                </div>
                {aiError && <p className="text-sm text-red-600">{aiError}</p>}
                <button onClick={generatePlan} disabled={aiLoading}
                  className="btn-primary w-full py-2.5 disabled:opacity-50">
                  {aiLoading ? '✨ Plan wordt gegenereerd...' : '✨ Genereer studieplan'}
                </button>
              </>
            ) : (
              <>
                {aiPlan.warning && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
                    ⚠️ {aiPlan.warning}
                  </div>
                )}
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {aiPlan.plan.map((day) => (
                    <div key={day.date} className="border border-warm-gray rounded-xl overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 font-semibold text-sm text-gray-700">
                        {new Date(day.date).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </div>
                      <div className="divide-y divide-warm-gray">
                        {day.sessions.map((s, i) => (
                          <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                            <span className="text-xs text-gray-400 w-20 flex-shrink-0">{s.start}–{s.end}</span>
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-gray-800">{s.subject}</p>
                              <p className="text-xs text-gray-500">{s.topic}</p>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              s.priority === 'hoog' ? 'bg-red-100 text-red-700' :
                              s.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                            }`}>{s.priority}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                {aiPlan.tips?.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 space-y-1">
                    {aiPlan.tips.map((tip, i) => <p key={i} className="text-xs text-blue-800">→ {tip}</p>)}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setAiPlan(null)} className="btn-ghost text-sm px-4 py-2 flex-1">Aanpassen</button>
                  <button onClick={importAiPlan} className="btn-primary text-sm px-4 py-2 flex-1">
                    Importeren in agenda →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
