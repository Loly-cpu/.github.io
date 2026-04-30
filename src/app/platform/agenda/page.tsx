'use client'

import { useState, useEffect, Suspense } from 'react'
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
// Gebruik lokale datum (niet UTC) om timezone-bugs te vermijden
function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function getWeekDays(base: Date): Date[] {
  const monday = new Date(base)
  monday.setDate(base.getDate() - ((base.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i); return d
  })
}

function getMonthGrid(base: Date): (Date | null)[] {
  const year = base.getFullYear()
  const m    = base.getMonth()
  const first = new Date(year, m, 1)
  const last  = new Date(year, m + 1, 0)
  const pad   = (first.getDay() + 6) % 7 // Monday = 0
  const cells: (Date | null)[] = []
  for (let i = 0; i < pad; i++) cells.push(null)
  for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, m, d))
  // Fill remainder to complete last row
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function AgendaInner() {
  const searchParams = useSearchParams()
  const [events, setEvents]       = useState<Event[]>([])
  const [userId, setUserId]       = useState<string | null>(null)
  const [gcalConnected, setGcalConnected] = useState(false)
  const [week, setWeek]           = useState(new Date())
  const [showForm, setShowForm]   = useState(false)
  const [showAi, setShowAi]       = useState(false)
  const [showIcal, setShowIcal]   = useState(false)
  const [showGcal, setShowGcal]   = useState(false)
  const [view, setView]           = useState<'week' | 'month'>('week')
  const [month, setMonth]         = useState(new Date())
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

  const days  = getWeekDays(week)
  const today = isoDate(new Date())

  function eventsForDay(d: Date) {
    const ds = isoDate(d)
    return events.filter((e) => isoDate(new Date(e.start_at)) === ds)
  }

  const monthGrid = getMonthGrid(month)
  const WEEKDAYS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo']

  const FB = '#1877F2'
  const TYPE_COLORS_FB: Record<string, string> = {
    personal: '#8B5CF6', school: FB, exam: '#E41E3F', study: '#42B72A', busy: '#9ca3af',
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif' }}>

      {/* FB page header */}
      <div className="fb-card">
        <div className="fb-page-cover" style={{ background: 'linear-gradient(135deg, #E4409E, #1877F2)' }} />
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, padding: '0 16px 16px', marginTop: -32 }}>
          <div className="fb-page-icon">📅</div>
          <div style={{ flex: 1, paddingBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1C1E21' }}>Agenda</h1>
            <p style={{ margin: 0, fontSize: 14, color: '#65676B' }}>{events.length} evenementen gepland</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setShowIcal(true)} className="fb-btn fb-btn-secondary fb-btn-sm">📥 iCal</button>
            <a href="/api/auth/google-calendar" className="fb-btn fb-btn-secondary fb-btn-sm" style={{ textDecoration: 'none', color: gcalConnected ? '#42B72A' : '#1C1E21' }}>{gcalConnected ? '✅ Google' : '🗓 Google'}</a>
            <button onClick={() => setShowAi(true)} className="fb-btn fb-btn-secondary fb-btn-sm">✨ AI Plan</button>
            <button onClick={() => setShowForm(true)} className="fb-btn fb-btn-primary">+ Evenement</button>
          </div>
        </div>

        {/* View + nav tabs */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '0 16px 12px', gap: 8, borderTop: '1px solid #E4E6EB', paddingTop: 12 }}>
          <button onClick={() => setView('week')} className={`fb-filter-btn ${view === 'week' ? 'active' : ''}`}>Week</button>
          <button onClick={() => setView('month')} className={`fb-filter-btn ${view === 'month' ? 'active' : ''}`}>Maand</button>
          <div style={{ flex: 1 }} />
          {view === 'week' && <>
            <button onClick={() => { const d = new Date(week); d.setDate(d.getDate()-7); setWeek(d) }} className="fb-btn fb-btn-secondary fb-btn-sm">← Vorige</button>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1E21', whiteSpace: 'nowrap' }}>{formatDate(days[0].toISOString())} – {formatDate(days[6].toISOString())}</span>
            <button onClick={() => { const d = new Date(week); d.setDate(d.getDate()+7); setWeek(d) }} className="fb-btn fb-btn-secondary fb-btn-sm">Volgende →</button>
          </>}
          {view === 'month' && <>
            <button onClick={() => { const d = new Date(month); d.setMonth(d.getMonth()-1); setMonth(d) }} className="fb-btn fb-btn-secondary fb-btn-sm">← Vorige</button>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1C1E21', whiteSpace: 'nowrap' }}>{month.toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => { const d = new Date(month); d.setMonth(d.getMonth()+1); setMonth(d) }} className="fb-btn fb-btn-secondary fb-btn-sm">Volgende →</button>
          </>}
        </div>
      </div>

      {/* ── WEEK VIEW ── */}
      {view === 'week' && (
        <div className="fb-card" style={{ overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))', minWidth: 560 }}>
            {days.map((d) => {
              const ds = isoDate(d)
              const dayEvents = eventsForDay(d)
              const isToday = ds === today
              return (
                <div key={ds} style={{ borderRight: '1px solid #E4E6EB', minHeight: 140, padding: 8, background: isToday ? '#E7F3FF' : '#fff' }}>
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? FB : '#65676B', textTransform: 'uppercase' }}>{d.toLocaleDateString('nl-BE', { weekday: 'short' })}</div>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: isToday ? FB : 'transparent', color: isToday ? '#fff' : '#1C1E21', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: isToday ? 700 : 400, fontSize: 15 }}>{d.getDate()}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {dayEvents.map(e => (
                      <div key={e.id} style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', background: (TYPE_COLORS_FB[e.type] ?? FB) + '22', color: TYPE_COLORS_FB[e.type] ?? FB, borderLeft: `3px solid ${TYPE_COLORS_FB[e.type] ?? FB}` }} title={e.title}>{e.title}</div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── MONTH VIEW ── */}
      {view === 'month' && (
        <div className="fb-card" style={{ overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '1px solid #E4E6EB' }}>
            {WEEKDAYS.map(wd => <div key={wd} style={{ padding: '8px 0', textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#65676B' }}>{wd}</div>)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
            {monthGrid.map((d, i) => {
              if (!d) return <div key={i} style={{ minHeight: 80, borderRight: '1px solid #E4E6EB', borderBottom: '1px solid #E4E6EB', background: '#F0F2F5' }} />
              const ds = isoDate(d)
              const dayEvents = eventsForDay(d)
              const isToday = ds === today
              const isCurrentMonth = d.getMonth() === month.getMonth()
              return (
                <div key={ds} style={{ minHeight: 80, padding: 6, borderRight: '1px solid #E4E6EB', borderBottom: '1px solid #E4E6EB', background: isToday ? '#E7F3FF' : '#fff' }}>
                  <div style={{ marginBottom: 3 }}>
                    {isToday
                      ? <span style={{ background: FB, color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>{d.getDate()}</span>
                      : <span style={{ fontSize: 13, color: isCurrentMonth ? '#1C1E21' : '#BEC3C9', fontWeight: isToday ? 700 : 400 }}>{d.getDate()}</span>
                    }
                  </div>
                  {dayEvents.slice(0,3).map(e => (
                    <div key={e.id} style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', background: (TYPE_COLORS_FB[e.type] ?? FB) + '22', color: TYPE_COLORS_FB[e.type] ?? FB, marginBottom: 2 }} title={e.title}>{e.title}</div>
                  ))}
                  {dayEvents.length > 3 && <div style={{ fontSize: 10, color: '#65676B' }}>+{dayEvents.length - 3}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Upcoming events list ── */}
      <div className="fb-card">
        <div className="fb-card-header"><span style={{ fontSize: 17, fontWeight: 800 }}>Aankomend</span></div>
        <div style={{ padding: '8px 0' }}>
          {events.filter(e => { const t = new Date(); t.setHours(0,0,0,0); return new Date(e.start_at) >= t }).slice(0,20).length === 0 && (
            <p style={{ padding: '16px', textAlign: 'center', color: '#65676B', fontSize: 14, margin: 0 }}>Geen aankomende evenementen.</p>
          )}
          {events.filter(e => { const t = new Date(); t.setHours(0,0,0,0); return new Date(e.start_at) >= t }).slice(0,20).map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderBottom: '1px solid #E4E6EB', transition: 'background .1s' }}
              onMouseEnter={el => (el.currentTarget.style.background = '#F2F2F2')}
              onMouseLeave={el => (el.currentTarget.style.background = 'transparent')}>
              <div style={{ width: 48, height: 48, borderRadius: 8, background: (TYPE_COLORS_FB[e.type] ?? FB) + '20', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: TYPE_COLORS_FB[e.type] ?? FB }}>{new Date(e.start_at).toLocaleDateString('nl-BE',{month:'short'}).toUpperCase()}</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: TYPE_COLORS_FB[e.type] ?? FB, lineHeight: 1 }}>{new Date(e.start_at).getDate()}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#1C1E21', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</p>
                <p style={{ margin: 0, fontSize: 13, color: '#65676B' }}>{TYPE_LABELS[e.type] ?? e.type} · {formatDate(e.start_at)} · {formatTime(e.start_at)}</p>
              </div>
              <button onClick={() => deleteEvent(e.id)}
                style={{ width: 32, height: 32, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#BEC3C9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                onMouseEnter={e2 => { e2.currentTarget.style.background = '#FEE2E2'; e2.currentTarget.style.color = '#E41E3F' }}
                onMouseLeave={e2 => { e2.currentTarget.style.background = 'none'; e2.currentTarget.style.color = '#BEC3C9' }}>×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Modals ─────────────────────────────────────────────── */}
      {gcalStatus !== 'idle' && (
        <div style={{ position: 'fixed', top: 68, right: 16, zIndex: 100, padding: '12px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600, boxShadow: '0 4px 16px rgba(0,0,0,.2)', background: gcalStatus === 'success' ? '#D4EDDA' : '#F8D7DA', color: gcalStatus === 'success' ? '#155724' : '#721C24', display: 'flex', alignItems: 'center', gap: 10 }}>
          {gcalStatus === 'success' ? '✅ Google Calendar gekoppeld!' : '❌ Koppeling mislukt'}
          <button onClick={() => setGcalStatus('idle')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'inherit' }}>×</button>
        </div>
      )}

      {showForm && (
        <div className="fb-modal-overlay">
          <div className="fb-modal">
            <div className="fb-modal-header"><h2 className="fb-modal-title">Nieuw evenement</h2><button className="fb-modal-close" onClick={() => setShowForm(false)}>×</button></div>
            <div className="fb-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="fb-input" placeholder="Titel*" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              <select className="fb-input" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                {Object.entries(TYPE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: '#65676B', display: 'block', marginBottom: 4 }}>Start</label><input type="datetime-local" className="fb-input" value={form.start_at} onChange={e => setForm({...form, start_at: e.target.value})} /></div>
                <div><label style={{ fontSize: 12, fontWeight: 700, color: '#65676B', display: 'block', marginBottom: 4 }}>Eind</label><input type="datetime-local" className="fb-input" value={form.end_at} onChange={e => setForm({...form, end_at: e.target.value})} /></div>
              </div>
              <textarea className="fb-input" placeholder="Notities (optioneel)" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} style={{ height: 80, resize: 'none' }} />
            </div>
            <div className="fb-modal-footer">
              <button className="fb-btn fb-btn-secondary" onClick={() => setShowForm(false)}>Annuleren</button>
              <button className="fb-btn fb-btn-primary" onClick={saveEvent} disabled={saving || !form.title || !form.start_at} style={{ opacity: (saving || !form.title || !form.start_at) ? 0.5 : 1 }}>{saving ? 'Opslaan…' : 'Opslaan'}</button>
            </div>
          </div>
        </div>
      )}

      {showIcal && (
        <div className="fb-modal-overlay">
          <div className="fb-modal" style={{ maxWidth: 520 }}>
            <div className="fb-modal-header"><h2 className="fb-modal-title">📥 iCal importeren</h2><button className="fb-modal-close" onClick={() => { setShowIcal(false); setIcalEvents([]); setIcalErr('') }}>×</button></div>
            <div className="fb-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ margin: 0, fontSize: 14, color: '#65676B' }}>Plak je iCal-URL van <strong>Smartschool</strong>, Apple Agenda of Google. In Smartschool: Agenda → ⚙️ → iCal-adres kopiëren.</p>
              <input className="fb-input" placeholder="Naam (bijv. Smartschool)" value={icalName} onChange={e => setIcalName(e.target.value)} />
              <input className="fb-input" placeholder="https://…/ical?…" value={icalUrl} onChange={e => { setIcalUrl(e.target.value); setIcalEvents([]); setIcalErr('') }} style={{ fontFamily: 'monospace', fontSize: 13 }} />
              {icalErr && <p style={{ margin: 0, fontSize: 13, color: '#E41E3F' }}>{icalErr}</p>}
              <button className="fb-btn fb-btn-secondary" onClick={previewIcal} disabled={icalLoading || !icalUrl.trim()} style={{ opacity: (icalLoading || !icalUrl.trim()) ? 0.5 : 1 }}>{icalLoading ? 'Laden…' : '🔍 Voorbeeld laden'}</button>
              {icalEvents.length > 0 && (
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #E4E6EB', borderRadius: 8 }}>
                  {icalEvents.slice(0,20).map((e,i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 12px', borderBottom: '1px solid #E4E6EB' }}>
                      <span style={{ fontSize: 13, color: '#65676B', flexShrink: 0, width: 80 }}>{new Date(e.start).toLocaleDateString('nl-BE',{day:'numeric',month:'short'})}</span>
                      <span style={{ fontSize: 13, color: '#1C1E21', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.summary}</span>
                    </div>
                  ))}
                  {icalEvents.length > 20 && <p style={{ padding: '8px 12px', fontSize: 13, color: '#65676B', margin: 0 }}>+ {icalEvents.length - 20} meer</p>}
                </div>
              )}
            </div>
            <div className="fb-modal-footer">
              <button className="fb-btn fb-btn-secondary" onClick={() => { setIcalEvents([]); setIcalUrl(''); setShowIcal(false) }}>Annuleren</button>
              {icalEvents.length > 0 && <button className="fb-btn fb-btn-primary" onClick={importIcal}>{icalEvents.length} importeren →</button>}
            </div>
          </div>
        </div>
      )}

      {showAi && (
        <div className="fb-modal-overlay" style={{ alignItems: 'flex-start', paddingTop: 20, overflowY: 'auto' }}>
          <div className="fb-modal" style={{ maxWidth: 640, marginBottom: 20 }}>
            <div className="fb-modal-header"><h2 className="fb-modal-title">✨ AI Studieplan</h2><button className="fb-modal-close" onClick={() => { setShowAi(false); setAiPlan(null) }}>×</button></div>

            {!aiPlan ? (
              <>
                <div className="fb-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#65676B', display: 'block', marginBottom: 4 }}>Examens (één per lijn: Vak,YYYY-MM-DD,HH:MM)</label>
                    <textarea className="fb-input" style={{ height: 96, resize: 'none', fontFamily: 'monospace', fontSize: 13 }} value={aiExams} onChange={e => setAiExams(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#65676B', display: 'block', marginBottom: 4 }}>Bezette tijden (optioneel: YYYY-MM-DD,HH:MM,HH:MM,reden)</label>
                    <textarea className="fb-input" style={{ height: 72, resize: 'none', fontFamily: 'monospace', fontSize: 13 }} placeholder="2026-05-02,09:00,17:00,werk" value={aiBusy} onChange={e => setAiBusy(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#65676B', display: 'block', marginBottom: 4 }}>Voorkeuren</label>
                    <input className="fb-input" value={aiPrefs} onChange={e => setAiPrefs(e.target.value)} />
                  </div>
                  {aiError && <p style={{ margin: 0, fontSize: 13, color: '#E41E3F' }}>{aiError}</p>}
                </div>
                <div className="fb-modal-footer">
                  <button className="fb-btn fb-btn-secondary" onClick={() => setShowAi(false)}>Annuleren</button>
                  <button className="fb-btn fb-btn-primary" onClick={generatePlan} disabled={aiLoading} style={{ opacity: aiLoading ? 0.7 : 1 }}>{aiLoading ? '✨ Genereren…' : '✨ Genereer plan'}</button>
                </div>
              </>
            ) : (
              <>
                <div className="fb-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {aiPlan.warning && <div style={{ background: '#FFF3CD', border: '1px solid #FFD54F', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: '#795548' }}>⚠️ {aiPlan.warning}</div>}
                  <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {aiPlan.plan.map(day => (
                      <div key={day.date} style={{ border: '1px solid #E4E6EB', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ background: '#F0F2F5', padding: '8px 14px', fontWeight: 700, fontSize: 14, color: '#1C1E21' }}>
                          {new Date(day.date).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </div>
                        {day.sessions.map((s, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', borderTop: '1px solid #E4E6EB' }}>
                            <span style={{ fontSize: 12, color: '#65676B', flexShrink: 0, width: 80 }}>{s.start}–{s.end}</span>
                            <div style={{ flex: 1 }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1C1E21' }}>{s.subject}</p>
                              <p style={{ margin: 0, fontSize: 12, color: '#65676B' }}>{s.topic}</p>
                            </div>
                            <span style={{ background: s.priority === 'hoog' ? '#FEE2E2' : s.priority === 'medium' ? '#FFF3CD' : '#E4E6EB', color: s.priority === 'hoog' ? '#E41E3F' : s.priority === 'medium' ? '#856404' : '#65676B', borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{s.priority}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  {aiPlan.tips?.length > 0 && (
                    <div style={{ background: '#E7F3FF', border: '1px solid #C0D9FF', borderRadius: 8, padding: '10px 14px' }}>
                      {aiPlan.tips.map((tip, i) => <p key={i} style={{ margin: i === 0 ? 0 : '4px 0 0', fontSize: 13, color: '#1C1E21' }}>→ {tip}</p>)}
                    </div>
                  )}
                </div>
                <div className="fb-modal-footer">
                  <button className="fb-btn fb-btn-secondary" onClick={() => setAiPlan(null)}>Aanpassen</button>
                  <button className="fb-btn fb-btn-primary" onClick={importAiPlan}>Importeren in agenda →</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AgendaPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}><div className="fb-spinner" /></div>}>
      <AgendaInner />
    </Suspense>
  )
}
