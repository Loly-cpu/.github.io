'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface LinkItem { label: string; url: string; desc?: string; cat: string }

const DEFAULT_LINKS: LinkItem[] = [
  // Exam
  { cat: 'CEV',       label: 'Kandidatenplatform',              url: 'https://examencommissie.vlaanderen.be/kandidaat/landingspagina', desc: 'Agenda & planning' },
  { cat: 'CEV',       label: 'Oefenexamen digitale vraagtypes', url: 'https://www.vlaanderen.be/examencommissiesecundaironderwijs/voorbereiding' },
  // Canvas
  { cat: 'Canvas',    label: 'INZICHT PLUS — Aardrijkskunde',   url: 'https://canvas.instructure.com/courses/12731557', desc: 'Cursus + oefenreeksen + proefexamens' },
  { cat: 'Canvas',    label: 'INZICHT PLUS — Nederlands 1',     url: 'https://canvas.instructure.com/courses/12361937', desc: 'Cursus + leerpad + proefexamens A-D' },
  { cat: 'Canvas',    label: 'De Studie Factorie — Frans 1',    url: 'https://canvas.instructure.com/courses/12604925', desc: 'Lees- & luisteroefeningen B1/B2' },
  // Study tools
  { cat: 'Studie',    label: 'Geopunt',                         url: 'https://www.geopunt.be', desc: 'Geografisch informatiesysteem (ook op examen!)' },
  { cat: 'Studie',    label: 'Van Dale woordenboek',            url: 'https://vandale.be', desc: 'Toegestaan op examen' },
  // Languages
  { cat: 'Talen',     label: 'Lingua.com',                      url: 'https://lingua.com/nl/', desc: 'Gratis taaloefeningen' },
  { cat: 'Talen',     label: 'British Council Belgium',         url: 'https://www.britishcouncil.be/', desc: 'Engels B1/B2 oefeningen' },
  { cat: 'Talen',     label: 'Examencommissie.be — talen',      url: 'https://examencommissie.be/', desc: 'CEV taalinformatie' },
  // Platform
  { cat: 'Platform',  label: 'Examenboard',                     url: '/examenboard', desc: 'Persoonlijke examendashboard' },
  { cat: 'Platform',  label: 'Taalplatform',                    url: '/dashboard', desc: 'Frans & Engels oefeningen' },
]

const CATS = ['Alle', 'CEV', 'Canvas', 'Studie', 'Talen', 'Platform']

export default function LinksPage() {
  const [filter, setFilter] = useState('Alle')
  const [isAdmin, setIsAdmin] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [customLinks, setCustomLinks] = useState<LinkItem[]>([])
  const [form, setForm] = useState({ label: '', url: '', desc: '', cat: 'Studie' })

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const { data: p } = await supabase.from('profiles').select('is_admin').eq('id', data.session.user.id).single()
      setIsAdmin(p?.is_admin ?? false)
    })
    try {
      const stored = localStorage.getItem('platform-custom-links')
      if (stored) setCustomLinks(JSON.parse(stored))
    } catch { /* ignore */ }
  }, [])

  function addLink() {
    if (!form.label || !form.url) return
    const next = [...customLinks, form]
    setCustomLinks(next)
    try { localStorage.setItem('platform-custom-links', JSON.stringify(next)) } catch { /* ignore */ }
    setForm({ label: '', url: '', desc: '', cat: 'Studie' })
    setShowAdd(false)
  }

  const allLinks = [...DEFAULT_LINKS, ...customLinks]
  const filtered = filter === 'Alle' ? allLinks : allLinks.filter((l) => l.cat === filter)
  const grouped = CATS.slice(1).reduce((acc, cat) => {
    const items = filtered.filter((l) => l.cat === cat)
    if (items.length) acc[cat] = items
    return acc
  }, {} as Record<string, LinkItem[]>)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🔗 Handige links</h1>
          <p className="text-gray-500 text-sm mt-0.5">Alle belangrijke bronnen op één plek.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-ghost text-sm px-4 py-2">+ Link toevoegen</button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {CATS.map((c) => (
          <button key={c} onClick={() => setFilter(c)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === c ? 'bg-primary-500 text-white' : 'bg-white border border-warm-gray text-gray-600 hover:bg-gray-50'
            }`}>
            {c}
          </button>
        ))}
      </div>

      {/* Grouped links */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([cat, links]) => (
          <div key={cat}>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">{cat}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {links.map((l, i) => (
                <a key={i} href={l.url} target={l.url.startsWith('/') ? '_self' : '_blank'} rel="noopener noreferrer"
                  className="bg-white border border-warm-gray rounded-xl px-4 py-3 hover:shadow-md transition-shadow flex items-start gap-3 group">
                  <span className="text-xl flex-shrink-0">
                    {cat === 'Canvas' ? '🖥️' : cat === 'CEV' ? '🏛️' : cat === 'Talen' ? '🌐' : cat === 'Studie' ? '📚' : '🔗'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors text-sm">{l.label}</p>
                    {l.desc && <p className="text-xs text-gray-500 mt-0.5">{l.desc}</p>}
                    <p className="text-xs text-gray-400 truncate mt-1">{l.url}</p>
                  </div>
                  <span className="text-gray-300 group-hover:text-primary-400 flex-shrink-0">↗</span>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Link toevoegen</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="space-y-3">
              <input className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
                placeholder="Label*" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
              <input className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
                placeholder="URL* (https://...)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
              <input className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
                placeholder="Beschrijving" value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} />
              <select className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
                value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>
                {CATS.slice(1).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="btn-ghost text-sm px-4 py-2">Annuleren</button>
              <button onClick={addLink} disabled={!form.label || !form.url}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-50">Toevoegen</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
