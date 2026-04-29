'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ─── Canvas types ──────────────────────────────────────────────────────────────

interface CanvasModule {
  id: number
  name: string
  state: 'locked' | 'unlocked' | 'started' | 'completed'
  items_count: number
}

interface CanvasCourse {
  id: number
  name: string
  course_code: string
  url: string
  modules: CanvasModule[]
  completedModules: number
  totalModules: number
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Gewicht { naam: string; pct: number; kleur: string }
interface Examen {
  id: string; vak: string; datum: string; start: string; eind: string
  locatie: string; gewichten: Gewicht[]; tips: string[]; kleur: string; emoji: string
}
interface Taak {
  id: string; vak: string; tijd: string; taak: string
  canvas?: string  // Canvas-link label (display only)
  priority?: 'hoog' | 'medium' | 'laag'
}
interface StudieDag {
  datum: string; dag: string; beschikbaar: string; taken: Taak[]
  isExamendag?: boolean
}

// ─── Exam data ────────────────────────────────────────────────────────────────

const EXAMENS: Examen[] = [
  {
    id: 'ned1', vak: 'Nederlands 1', datum: '2026-05-06', start: '08:30', eind: '10:30',
    locatie: 'Examencentrum Conscience, Koning Albert II-laan 15, 1210 Brussel',
    emoji: '📝', kleur: 'blue',
    gewichten: [
      { naam: 'Lezen', pct: 30, kleur: 'bg-blue-500' },
      { naam: 'Luisteren', pct: 30, kleur: 'bg-blue-400' },
      { naam: 'Literatuur', pct: 20, kleur: 'bg-indigo-400' },
      { naam: 'Taalbeschouwing', pct: 20, kleur: 'bg-violet-300' },
    ],
    tips: [
      'Lezen + Luisteren = 60% — dit is waar je de meeste punten haalt',
      'Je hebt 6/8 op literatuur algemeen — dat is al een goede basis, nu stijlfiguren afwerken',
      'Communicatiemodel vanbuiten: zender → boodschap → ontvanger → kanaal → context → doel → effect → ruis',
      'Leesstrategie: onderwerp → hoofdgedachte → hoofdpunten → tekstverbanden → bronkritiek',
    ],
  },
  {
    id: 'aard', vak: 'Aardrijkskunde', datum: '2026-05-06', start: '11:15', eind: '13:15',
    locatie: 'Examencentrum Conscience, Koning Albert II-laan 15, 1210 Brussel',
    emoji: '🌍', kleur: 'green',
    gewichten: [
      { naam: 'Heelal', pct: 20, kleur: 'bg-green-600' },
      { naam: 'Atmosfeer', pct: 20, kleur: 'bg-green-500' },
      { naam: 'Geosfeer', pct: 20, kleur: 'bg-green-400' },
      { naam: 'Klimaatverandering', pct: 15, kleur: 'bg-emerald-400' },
      { naam: 'Ruimtelijke ordening', pct: 12.5, kleur: 'bg-teal-400' },
      { naam: 'Landschapsanalyse', pct: 10, kleur: 'bg-teal-300' },
      { naam: 'Situeren', pct: 2.5, kleur: 'bg-teal-200' },
    ],
    tips: [
      'Je krijgt de Plantyn wereldatlas 2022 op het examen — gebruik hem ook bij studie',
      'Heelal reeks A al gedaan — ga door met B, C, D vandaag',
      'Heelal + Atmosfeer + Geosfeer = 60% — dit zijn de drie grote blokken',
      'Proefexamens genereren elke keer een nieuw examen — maak er minimum 3',
    ],
  },
  {
    id: 'bedeco', vak: 'Bedrijfseconomie', datum: '2026-08-21', start: '11:45', eind: '13:45',
    locatie: 'Examencentrum Conscience, Brussel', emoji: '💼', kleur: 'orange', gewichten: [], tips: [],
  },
  {
    id: 'natuur', vak: 'Natuurwetenschappen', datum: '2026-09-18', start: '11:45', eind: '14:15',
    locatie: 'Examencentrum Conscience, Brussel', emoji: '🔬', kleur: 'purple', gewichten: [], tips: [],
  },
  {
    id: 'wisk', vak: 'Wiskunde gevorderd 1', datum: '2026-09-28', start: '11:45', eind: '14:15',
    locatie: 'Examencentrum Conscience, Brussel', emoji: '📐', kleur: 'red', gewichten: [], tips: [],
  },
]

// ─── Canvas-centric study plan ────────────────────────────────────────────────
// Gebaseerd op INZICHT PLUS leerpad. Reeks A voor aardrijkskunde al gedaan.

const STUDIEPLAN: StudieDag[] = [
  {
    datum: '2026-04-29', dag: 'Woensdag 29 april', beschikbaar: '~6 uur',
    taken: [
      { id: 'w29-1', vak: 'Aardrijkskunde', tijd: '3u', priority: 'hoog',
        canvas: 'INZICHT → het heelal → cursus + reeksen B, C, D',
        taak: 'Open INZICHT PLUS aardrijkskunde → cursus "het heelal" opnieuw doorlopen als snelle herhaling, daarna reeksen B, C, D maken (reeks A al gedaan). Focus: afstandsmaten, aardrotatie (tijdzones, corioliseffect), aardrevolutie (culminatiehoogte berekenen), maan, eclipsen.' },
      { id: 'w29-2', vak: 'Nederlands', tijd: '3u', priority: 'hoog',
        canvas: 'INZICHT → leerpad literatuur → cursus stijl & stijlfiguren + test',
        taak: 'Open INZICHT PLUS Nederlands → leerpad literatuur → "cursus stijl en stijlfiguren" lezen, daarna "test stijl en stijlfiguren" maken. Daarna: extra oefeningen → "Stijl en stijlfiguren" (17p). Aandacht voor: metafoor, personificatie, hyperbool, anafoor, antithese, paradox, retorische vraag, enjambement.' },
    ],
  },
  {
    datum: '2026-04-30', dag: 'Donderdag 30 april', beschikbaar: '~5 uur',
    taken: [
      { id: 'do30-1', vak: 'Aardrijkskunde', tijd: '3u', priority: 'hoog',
        canvas: 'INZICHT → de atmosfeer → cursus + reeksen A, B, C',
        taak: 'INZICHT PLUS aardrijkskunde → "cursus atmosfeer & het weer" doorlopen, daarna reeksen A, B, C. Focus: lagen atmosfeer, temperatuurfactoren, luchtdruk (cycloon/anticycloon, ITCZ, passaat), neerslagtypen (convectie/stijging/frontaal/moesson), klimaatzones & biomen, weerkaart lezen.' },
      { id: 'do30-2', vak: 'Nederlands', tijd: '2u', priority: 'hoog',
        canvas: 'INZICHT → leerpad taalbeschouwing → taalvariatie + leerpad taalgebruik → alineaverbanden',
        taak: 'INZICHT PLUS Nederlands → leerpad taalbeschouwing: "cursus taalvariatie" + "test taalvariatie". Daarna leerpad taalgebruik: "cursus alineaverbanden" + "test alinea- en zinsverbanden". Vergeet niet: communicatiemodel uit het hoofd kennen (zender/boodschap/ontvanger/kanaal/context/doel/effect/ruis).' },
    ],
  },
  {
    datum: '2026-05-01', dag: 'Vrijdag 1 mei', beschikbaar: '~8 uur',
    taken: [
      { id: 'vr1-1', vak: 'Aardrijkskunde', tijd: '4u', priority: 'hoog',
        canvas: 'INZICHT → de geosfeer → cursus + reeksen A, B, C, D',
        taak: 'INZICHT PLUS aardrijkskunde → "cursus geosfeer" volledig doorlopen, daarna reeksen A, B, C, D. Focus: opbouw aarde (discontinuïteiten Moho + Gutenberg), platentektoniek (divergentie/convergentie/transforme), aardbevingen & vulkanen, gesteenten bijlage (graniet/basalt/kalksteen/marmer/leisteen kennen!), verwering & erosie (water/ijs/wind), geologische tijdschaal.' },
      { id: 'vr1-2', vak: 'Nederlands', tijd: '2u', priority: 'hoog',
        canvas: 'INZICHT → leerpad taalsysteem → fonologie + extra oefeningen → Poëzie (dichtvormen + rijm & strofe)',
        taak: 'INZICHT PLUS Nederlands → leerpad taalsysteem: "cursus fonologie" + "test fonologie". Daarna extra oefeningen: "Poëzie: dichtvormen" (9p) + "Poëzie: rijm en strofe" (15p). Dit zijn technische literaire begrippen die vaak terugkomen.' },
      { id: 'vr1-3', vak: 'Nederlands', tijd: '2u', priority: 'medium',
        canvas: 'INZICHT → extra leesoefeningen → Digi-taal + Nooit meer niksdoen',
        taak: 'INZICHT PLUS Nederlands → extra digitale leesoefeningen: "Digi-taal" (13p) + "Nooit meer niksdoen" (11p). Dit zijn echte leesoefeningen die lijken op het examen. Oefen de strategie: (1) onderwerp, (2) hoofdgedachte, (3) hoofdpunten, (4) tekstverbanden, (5) bronkritiek.' },
    ],
  },
  {
    datum: '2026-05-02', dag: 'Zaterdag 2 mei', beschikbaar: '~3 uur (na werk)',
    taken: [
      { id: 'za2-1', vak: 'Aardrijkskunde', tijd: '1.5u', priority: 'hoog',
        canvas: 'INZICHT → klimaatverandering → cursus + reeks A',
        taak: 'INZICHT PLUS aardrijkskunde → "cursus klimaatverandering" doorlopen + "klimaatverandering reeks A". Focus: Milanković-variabelen, broeikasgassen, versterkt broeikaseffect, IPCC-scenario\'s, adaptatie vs mitigatie, positieve/negatieve terugkoppelingen.' },
      { id: 'za2-2', vak: 'Aardrijkskunde', tijd: '1.5u', priority: 'hoog',
        canvas: 'INZICHT → ruimtelijke ordening → cursus',
        taak: 'INZICHT PLUS aardrijkskunde → "cursus ruimtelijke ordening" doorlopen. Focus: verstedelijkingsprocessen (urbanisatie/suburbanisatie/rurbanisatie...), gewestplan vs RSV vs BRV, problemen (lintbebouwing/verharding/urban sprawl), duurzaam ruimtegebruik & bouwshift.' },
    ],
  },
  {
    datum: '2026-05-03', dag: 'Zondag 3 mei', beschikbaar: '~3 uur',
    taken: [
      { id: 'zo3-1', vak: 'Aardrijkskunde', tijd: '2u', priority: 'hoog',
        canvas: 'INZICHT → ruimtelijke ordening → reeksen A, B + atmosfeer reeks D, E',
        taak: 'INZICHT PLUS aardrijkskunde → ruimtelijke ordening reeksen A + B. Daarna als je tijd hebt: atmosfeer reeksen D + E. Dit zijn de onderdelen die je vorige dagen niet volledig hebt afgewerkt.' },
      { id: 'zo3-2', vak: 'Nederlands', tijd: '1u', priority: 'medium',
        canvas: 'INZICHT → extra oefeningen → Proza (11p) + Verhaalkenmerken: vertelperspectief (4p)',
        taak: 'INZICHT PLUS Nederlands → extra oefeningen: "Proza" (11p) + "Verhaalkenmerken: vertelperspectief" (4p). Dit zijn oefeningen op literaire begrippen die in het examen terugkomen.' },
    ],
  },
  {
    datum: '2026-05-04', dag: 'Maandag 4 mei', beschikbaar: '~8 uur',
    taken: [
      { id: 'ma4-1', vak: 'Aardrijkskunde', tijd: '3u', priority: 'hoog',
        canvas: 'INZICHT → geosfeer reeksen E, F, G + proefexamen (1e keer)',
        taak: 'INZICHT PLUS aardrijkskunde → geosfeer reeksen E, F, G. Daarna het eerste proefexamen starten (elke keer een nieuw examen). Kijk wat je fout hebt en ga terug naar de cursus voor die specifieke onderdelen.' },
      { id: 'ma4-2', vak: 'Aardrijkskunde', tijd: '1u', priority: 'medium',
        canvas: 'INZICHT → landschapsanalyse → cursus + reeks A',
        taak: 'INZICHT PLUS aardrijkskunde → "cursus landschapsanalyse & geografisch onderzoek" doorlopen + reeks A. Focus: satellietbeelden lezen, SDG\'s toepassen, Geopunt gebruiken, onderzoeksvraag beantwoorden.' },
      { id: 'ma4-3', vak: 'Nederlands', tijd: '2u', priority: 'hoog',
        canvas: 'INZICHT → proefexamen A + proefexamen B',
        taak: 'INZICHT PLUS Nederlands → proefexamen A (42p) volledig maken. Daarna bekijken waar je punten verloor. Dan proefexamen B (25p). Zo zie je exact welke onderdelen je nog moet bijwerken.' },
      { id: 'ma4-4', vak: 'Beide', tijd: '2u', priority: 'medium',
        canvas: 'INZICHT → zwakste punten bijwerken op basis van proefexamenresultaten',
        taak: 'Ga terug naar de INZICHT-cursus voor de onderdelen waar je punten verloor in de proefexamens. Maak extra oefenreeksen voor die specifieke topics. Dit is de meest efficiënte manier om bij te sturen.' },
    ],
  },
  {
    datum: '2026-05-05', dag: 'Dinsdag 5 mei — dag voor examen', beschikbaar: '~3 uur (avond)',
    taken: [
      { id: 'di5-1', vak: 'Aardrijkskunde', tijd: '1u', priority: 'medium',
        canvas: 'INZICHT → proefexamen (2e keer) — max 1 uur',
        taak: 'INZICHT PLUS aardrijkskunde → nog één proefexamen, max 1 uur. Daarna STOPPEN. Geen nieuwe stof meer studeren — je weet wat je weet.' },
      { id: 'di5-2', vak: 'Nederlands', tijd: '45min', priority: 'laag',
        canvas: 'INZICHT → proefexamen C of D — vluchtig',
        taak: 'INZICHT PLUS Nederlands → proefexamen C of D vluchtig bekijken, max 45 minuten. Focus alleen op wat je twijfelachtig vindt. Daarna stoppen.' },
      { id: 'di5-3', vak: 'Voorbereiding', tijd: '15min', priority: 'hoog',
        taak: 'Klaarleggen voor morgen: identiteitskaart, pen, kladpapier. Adres: Examencentrum Conscience, Koning Albert II-laan 15, 1210 Brussel. Vroeg slapen — Nederlands start om 08:30, je moet op tijd vertrekken!' },
    ],
  },
  {
    datum: '2026-05-06', dag: 'Woensdag 6 mei — EXAMENDAG', beschikbaar: '—', isExamendag: true,
    taken: [
      { id: 'wo6-1', vak: 'Nederlands', tijd: '08:30–10:30', taak: 'EXAMEN Nederlands 1 — 120 min. Lezen + luisteren + literatuur + taalbeschouwing. Gebruik de tijd goed: lees elke vraag zorgvuldig. Online woordenboek beschikbaar.' },
      { id: 'wo6-2', vak: 'Pauze', tijd: '10:30–11:15', taak: 'Pauze 45 minuten. Eet iets, drink water. Max 5 min notities voor aardrijkskunde bekijken. Daarna stoppen — je hebt genoeg gestudeerd.' },
      { id: 'wo6-3', vak: 'Aardrijkskunde', tijd: '11:15–13:15', taak: 'EXAMEN Aardrijkskunde — 120 min. Je krijgt de Plantyn atlas! Gebruik hem actief bij elke vraag. Rekenmachine beschikbaar voor berekeningen (tijdverschil, culminatiehoogte).' },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getVakKleur(vak: string): string {
  if (vak === 'Aardrijkskunde') return 'bg-green-100 text-green-800 border-green-200'
  if (vak === 'Nederlands') return 'bg-blue-100 text-blue-800 border-blue-200'
  if (vak === 'Voorbereiding') return 'bg-amber-100 text-amber-800 border-amber-200'
  if (vak === 'Pauze') return 'bg-gray-100 text-gray-700 border-gray-200'
  return 'bg-purple-100 text-purple-800 border-purple-200'
}

function getExamenBorder(kleur: string): string {
  const map: Record<string, string> = {
    blue: 'border-l-blue-500', green: 'border-l-green-500',
    orange: 'border-l-orange-400', purple: 'border-l-purple-400', red: 'border-l-red-400',
  }
  return map[kleur] ?? 'border-l-gray-400'
}

function getDaysUntil(datum: string): number {
  const target = new Date(datum); const now = new Date()
  now.setHours(0,0,0,0); target.setHours(0,0,0,0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

function isToday(datum: string): boolean {
  return getDaysUntil(datum) === 0
}

function isPast(datum: string): boolean {
  return getDaysUntil(datum) < 0
}

// ─── Countdown ────────────────────────────────────────────────────────────────

function Countdown() {
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 })
  useEffect(() => {
    const tick = () => {
      const diff = new Date('2026-05-06T08:30:00').getTime() - Date.now()
      if (diff <= 0) return
      setT({ d: Math.floor(diff/86400000), h: Math.floor(diff%86400000/3600000), m: Math.floor(diff%3600000/60000), s: Math.floor(diff%60000/1000) })
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])
  return (
    <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-green-600 rounded-2xl p-6 text-white text-center shadow-lg">
      <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-1">Afteller examen</p>
      <p className="text-lg font-bold mb-4">Nederlands 1 & Aardrijkskunde — wo 6 mei</p>
      <div className="flex justify-center gap-3">
        {[{ v: t.d, l: 'dagen' }, { v: t.h, l: 'uren' }, { v: t.m, l: 'min' }, { v: t.s, l: 'sec' }].map(({ v, l }) => (
          <div key={l} className="bg-white/20 rounded-xl px-3 py-2.5 min-w-[60px]">
            <div className="text-2xl font-bold tabular-nums">{String(v).padStart(2,'0')}</div>
            <div className="text-xs opacity-70">{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ExamenKaart ──────────────────────────────────────────────────────────────

function ExamenKaart({ ex }: { ex: Examen }) {
  const [open, setOpen] = useState(ex.datum === '2026-05-06')
  const dagen = getDaysUntil(ex.datum)
  const past = dagen < 0
  return (
    <div className={`card border-l-4 ${getExamenBorder(ex.kleur)} overflow-hidden p-0`}>
      <button onClick={() => setOpen(!open)} className="w-full text-left px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{ex.emoji}</span>
          <div>
            <div className="font-bold text-gray-900">{ex.vak}</div>
            <div className="text-sm text-gray-500">{ex.datum.split('-').reverse().join('/')} · {ex.start}–{ex.eind}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!past && <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${dagen === 0 ? 'bg-red-100 text-red-700' : dagen <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
            {dagen === 0 ? 'VANDAAG' : `${dagen}d`}
          </span>}
          {past && <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-bold">Afgelegd</span>}
          <span className={`text-gray-400 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-warm-gray pt-4">
          <p className="text-sm text-gray-600">📍 {ex.locatie}</p>
          {ex.gewichten.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Verdeling punten</p>
              <div className="flex rounded-lg overflow-hidden h-5 mb-2">
                {ex.gewichten.map((g) => (
                  <div key={g.naam} className={`${g.kleur} flex items-center justify-center text-white text-xs font-bold`} style={{ width: `${g.pct}%` }} title={`${g.naam}: ${g.pct}%`}>
                    {g.pct >= 15 ? `${g.pct}%` : ''}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {ex.gewichten.map((g) => (
                  <span key={g.naam} className="flex items-center gap-1 text-xs text-gray-600">
                    <span className={`w-2 h-2 rounded-sm ${g.kleur}`} />{g.naam} {g.pct}%
                  </span>
                ))}
              </div>
            </div>
          )}
          {ex.tips.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
              {ex.tips.map((tip, i) => (
                <p key={i} className="text-sm text-amber-900 flex items-start gap-2">
                  <span className="text-amber-500 flex-shrink-0">→</span>{tip}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── StudiePlanDag ────────────────────────────────────────────────────────────

function StudiePlanDag({ dag, voltooid, onToggle }: {
  dag: StudieDag; voltooid: Set<string>; onToggle: (id: string) => void
}) {
  const today = isToday(dag.datum)
  const past = isPast(dag.datum)
  const [open, setOpen] = useState(today || dag.isExamendag)
  const taken = dag.taken.filter((t) => t.vak !== 'Voorbereiding')
  const klaar = taken.filter((t) => voltooid.has(t.id)).length
  const pct = taken.length > 0 ? Math.round((klaar / taken.length) * 100) : 0
  const allKlaar = klaar === taken.length && taken.length > 0

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${
      dag.isExamendag ? 'border-red-300 bg-red-50' :
      today ? 'border-primary-400 bg-primary-50' :
      past && allKlaar ? 'border-green-300 bg-green-50' :
      past ? 'border-gray-200 bg-gray-50 opacity-80' :
      'border-warm-gray bg-white'
    }`}>
      <button onClick={() => setOpen(!open)} className="w-full text-left px-5 py-3.5 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 text-sm">{dag.dag}</span>
            {today && <span className="text-xs bg-primary-500 text-white px-2 py-0.5 rounded-full font-bold">VANDAAG</span>}
            {dag.isExamendag && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">EXAMEN</span>}
            {past && allKlaar && !dag.isExamendag && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-bold">✓ KLAAR</span>}
          </div>
          <span className="text-xs text-gray-500">{dag.beschikbaar}</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {!dag.isExamendag && taken.length > 0 && (
            <span className={`text-xs font-bold ${allKlaar ? 'text-green-600' : 'text-gray-500'}`}>{klaar}/{taken.length}</span>
          )}
          <span className={`text-gray-400 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {!dag.isExamendag && taken.length > 0 && (
        <div className="h-1 bg-gray-200">
          <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${pct}%` }} />
        </div>
      )}

      {open && (
        <div className="px-5 py-4 space-y-3 border-t border-warm-gray">
          {dag.taken.map((taak) => {
            const done = voltooid.has(taak.id)
            return (
              <div key={taak.id} className={`rounded-xl border p-3 transition-all ${done ? 'bg-green-50 border-green-200' : 'bg-white border-warm-gray'}`}>
                <div className="flex items-start gap-3">
                  {!dag.isExamendag ? (
                    <button
                      onClick={() => onToggle(taak.id)}
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'}`}
                    >
                      {done && <span className="text-xs font-bold">✓</span>}
                    </button>
                  ) : (
                    <span className="text-xl flex-shrink-0 mt-0.5">
                      {taak.vak === 'Nederlands' ? '📝' : taak.vak === 'Aardrijkskunde' ? '🌍' : '⏸️'}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${getVakKleur(taak.vak)}`}>{taak.vak}</span>
                      <span className="text-xs text-gray-400 font-medium">{taak.tijd}</span>
                      {taak.priority === 'hoog' && !done && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-semibold">prioriteit</span>}
                    </div>
                    {taak.canvas && (
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-2.5 py-1.5 mb-2 flex items-center gap-2">
                        <span className="text-indigo-400 text-sm flex-shrink-0">📋</span>
                        <span className="text-xs text-indigo-700 font-medium">{taak.canvas}</span>
                      </div>
                    )}
                    <p className={`text-sm leading-relaxed ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>{taak.taak}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExamenBoard() {
  const [voltooid, setVoltooid] = useState<Set<string>>(new Set())
  const [userId, setUserId] = useState<string | null>(null)
  const [synced, setSynced] = useState(false)
  const [activeTab, setActiveTab] = useState<'plan' | 'examens' | 'vakinfo' | 'links'>('plan')
  const [canvas, setCanvas] = useState<CanvasCourse[] | null>(null)
  const [canvasError, setCanvasError] = useState<string | null>(null)
  const [canvasLoading, setCanvasLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load from Supabase if logged in, else localStorage
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const uid = data.session.user.id
        setUserId(uid)
        const { data: rows } = await supabase
          .from('study_tasks')
          .select('task_id')
          .eq('user_id', uid)
          .eq('completed', true)
        if (rows) {
          const ids = new Set(rows.map((r: { task_id: string }) => r.task_id))
          setVoltooid(ids)
          setSynced(true)
        }
      } else {
        try {
          const saved = localStorage.getItem('examen-voltooid')
          if (saved) setVoltooid(new Set(JSON.parse(saved)))
        } catch { /* ignore */ }
      }
    })
  }, [])

  // Fetch Canvas progress (server-side token, never exposed to client)
  useEffect(() => {
    fetch('/api/canvas')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setCanvasError(data.error); return }
        setCanvas(data.courses)
      })
      .catch((e) => setCanvasError(String(e)))
      .finally(() => setCanvasLoading(false))
  }, [])

  const saveToSupabase = useCallback(async (uid: string, id: string, done: boolean) => {
    if (done) {
      await supabase.from('study_tasks').upsert({ user_id: uid, task_id: id, completed: true, completed_at: new Date().toISOString() })
    } else {
      await supabase.from('study_tasks').upsert({ user_id: uid, task_id: id, completed: false, completed_at: null })
    }
  }, [])

  const toggleTaak = useCallback((id: string) => {
    setVoltooid((prev) => {
      const next = new Set(prev)
      const done = !next.has(id)
      done ? next.add(id) : next.delete(id)
      if (userId) {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => saveToSupabase(userId, id, done), 300)
      } else {
        try { localStorage.setItem('examen-voltooid', JSON.stringify([...next])) } catch { /* ignore */ }
      }
      return next
    })
  }, [userId, saveToSupabase])

  const alleTaken = STUDIEPLAN.flatMap((d) => d.taken.filter((t) => !d.isExamendag && t.vak !== 'Voorbereiding' && t.vak !== 'Pauze'))
  const totaalKlaar = alleTaken.filter((t) => voltooid.has(t.id)).length
  const totaalPct = alleTaken.length > 0 ? Math.round((totaalKlaar / alleTaken.length) * 100) : 0

  const tabs = [
    { id: 'plan', label: 'Studieplan', emoji: '📅' },
    { id: 'examens', label: 'Examens', emoji: '🗓️' },
    { id: 'vakinfo', label: 'Vakinfo', emoji: '📖' },
    { id: 'links', label: 'Links', emoji: '🔗' },
  ] as const

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-white border-b border-warm-gray sticky top-0 z-20 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight text-base">Examencommissie Board</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500">Jona Leenders · 3de graad doorstroom 2026</p>
                {userId && <span className="text-xs text-green-600 font-semibold">● Gesynchroniseerd</span>}
                {!userId && <span className="text-xs text-amber-600">● Lokaal opgeslagen</span>}
              </div>
            </div>
          </div>
          <Link href="/dashboard" className="text-sm text-primary-600 hover:underline font-medium hidden sm:block">
            Taalplatform →
          </Link>
        </div>
        <div className="max-w-4xl mx-auto px-4 flex gap-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                activeTab === tab.id ? 'border-primary-500 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <span>{tab.emoji}</span> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        <Countdown />

        {/* Progress */}
        <div className="card py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-800 text-sm">Studieplan voortgang</span>
            <span className="text-sm font-bold text-primary-600">{totaalKlaar}/{alleTaken.length} taken · {totaalPct}%</span>
          </div>
          <div className="h-2.5 bg-warm-gray rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-700" style={{ width: `${totaalPct}%` }} />
          </div>
          {!userId && (
            <p className="text-xs text-amber-600 mt-2">
              Voortgang wordt lokaal opgeslagen. <Link href="/auth/login" className="underline">Inloggen</Link> om te synchroniseren via Supabase.
            </p>
          )}
        </div>

        {/* Plan */}
        {activeTab === 'plan' && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <p className="text-sm text-blue-800 font-semibold mb-1">Strategie voor deze week</p>
              <p className="text-sm text-blue-700">Volg het <strong>INZICHT PLUS Canvas-leerpad</strong> als hoofdgids. Elke taak verwijst naar een specifieke module. Je hoeft geen extra bronnen te zoeken — alles staat al klaar in Canvas.</p>
            </div>
            {STUDIEPLAN.map((dag) => (
              <StudiePlanDag key={dag.datum} dag={dag} voltooid={voltooid} onToggle={toggleTaak} />
            ))}
          </div>
        )}

        {/* Examens */}
        {activeTab === 'examens' && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Aankomende examens</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 space-y-1">
              <p><strong>Locatie:</strong> Examencentrum Conscience, Koning Albert II-laan 15, 1210 Brussel</p>
              <p><strong>Meebrengen:</strong> identiteitskaart · pen · GEEN gsm, cursusmateriaal of samenvattingen in de examenruimte</p>
              <p><strong>Je krijgt van hen:</strong> kladpapier · hoofdtelefoon · (aardrijkskunde: Plantyn atlas 2022)</p>
            </div>
            {EXAMENS.map((ex) => <ExamenKaart key={ex.id} ex={ex} />)}
          </div>
        )}

        {/* Vakinfo */}
        {activeTab === 'vakinfo' && (
          <div className="space-y-6">
            {/* Nederlands */}
            <div>
              <h2 className="font-bold text-gray-900 text-lg mb-1">📝 Nederlands 1 — 6 mei, 08:30–10:30</h2>
              <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">
                Je hebt al 6/8 op literatuur algemeen. Stijlfiguren + leesoefeningen zijn de prioriteit.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { titel: 'Lezen (30%)', border: 'border-l-blue-500', items: ['Onderwerp bepalen (1-2 woorden)', 'Hoofdgedachte (1 zin)', 'Hoofdpunten opsommen', 'Info selecteren uit tekst', 'Tekstverbanden: oorzaak/gevolg, tegenstelling, vergelijking, opsomming', 'Bronbetrouwbaarheid: zender, doel, kanaal, nepnieuws', 'Canvas: Digi-taal + Nooit meer niksdoen'] },
                  { titel: 'Luisteren (30%)', border: 'border-l-blue-400', items: ['Zelfde vaardigheden als lezen', 'Notities nemen terwijl je luistert', 'Signaalwoorden herkennen: ten eerste, bovendien, echter, dus, want, hoewel', 'Oefen op: vrt.be/vrtnws nieuws, VRT Max documentaires'] },
                  { titel: 'Literatuur (20%)', border: 'border-l-indigo-500', items: ['Stromingen kennen (Canvas: cursus literatuur algemeen)', 'Stijlfiguren: metafoor, personificatie, hyperbool, anafoor, antithese, paradox, retorische vraag (Canvas: Stijl en stijlfiguren 17p)', 'Verhaalkenmerken: personage, vertelperspectief (ik/personaal/auctorieel/onbetrouwbaar), opbouw, ruimte, tijd', 'Poëzie: rijmschema, strofe, enjambement, volta (Canvas: Poëzie 9p + 15p)', 'Dramatiek: theatertekens'] },
                  { titel: 'Taalbeschouwing (20%)', border: 'border-l-violet-500', items: ['Communicatiemodel: zender → boodschap → ontvanger → kanaal → context → doel → effect → ruis', 'Feiten vs meningen, drogredenen', 'Taalregisters: standaardtaal, dialect, tussentaal, jargon, jongerentaal (Canvas: taalvariatie)', 'Alineaverbanden: oorzakelijk, chronologisch, tegenstellend, concluderend... (Canvas: alinea- en zinsverbanden)', 'Fonologie, woordsoorten, zinsdelen'] },
                ].map((b) => (
                  <div key={b.titel} className={`card border-l-4 ${b.border} p-4`}>
                    <h3 className="font-bold text-gray-800 text-sm mb-2">{b.titel}</h3>
                    <ul className="space-y-1">{b.items.map((item, i) => <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5"><span className="text-gray-400 flex-shrink-0">·</span>{item}</li>)}</ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Aardrijkskunde */}
            <div>
              <h2 className="font-bold text-gray-900 text-lg mb-1">🌍 Aardrijkskunde — 6 mei, 11:15–13:15</h2>
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                Je hebt heelal reeks A al gedaan. Plantyn atlas beschikbaar op examen — gebruik hem bij het studeren!
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { titel: 'Heelal (20%) — Canvas reeksen A-K', border: 'border-l-green-600', items: ['Big Bang, uitdijend heelal, big crunch/rip/chill', 'Afstandsmaten: lichtseconde / lichtminuut / lichtjaar / AE — berekeningen oefenen!', 'Zonnestelsel: lagen van de zon (kern/stralingszone/fotosfeer/chromosfeer/corona), planeten', 'Aardrotatie: dag/nacht, tijdverschil berekenen, corioliseffect, dagboog', 'Aardrevolutie: seizoenen, zonnewende, culminatiehoogte berekenen (specifieke data: 22/12, 21/3, 21/6, 23/9)', 'Maan: schijngestalten, getijden, eclipsen'] },
                  { titel: 'Atmosfeer (20%) — Canvas reeksen A-F', border: 'border-l-green-500', items: ['Lagen: troposfeer → stratosfeer → mesosfeer → thermosfeer → exosfeer (temperatuur/dichtheid/druk)', 'Temperatuurfactoren: breedteligging, hoogte, zeestromen, ligging t.o.v. zee, stralingsbalans (albedo)', 'Luchtdruk: cycloon/anticycloon, ITCZ, passaat, corioliseffect, land-zeewinden, straalstroom', 'Neerslag: hydrologische cyclus, convectie-/stijgings-/frontale regens/moesson', 'Klimaatzones & biomen classificeren', 'Weerkaart: fronten (koud/warm/occlusie), isobaren, windrichting/kracht'] },
                  { titel: 'Geosfeer (20%) — Canvas reeksen A-I', border: 'border-l-green-400', items: ['Opbouw: binnenkern/buitenkern/mantel/lithosfeer/korst + discontinuïteiten Moho & Gutenberg', 'Platentektoniek: oorzaken (slab pull, ridge push), divergentie/convergentie/transforme', 'Aardbevingen (schaal Richter, MMS, hypocentrum/epicentrum), vulkanen (strato-/schildvulkaan)', 'Gesteenten bijlage KENNEN: graniet, basalt, kalksteen, zandsteen, marmer, leisteen, gneiss...', 'Gesteentecyclus, verwering (fysisch/chemisch/biologisch), Karst', 'Erosie: water (V-dal/meanders/delta), glaciaal (U-dal/fjord/morene/zwerfkei), wind (duin/löss)', 'Datering: relatief, gidsfossielen, geologische tijdschaal, massaextincties'] },
                  { titel: 'Klimaatverandering (15%) — Canvas reeks A', border: 'border-l-emerald-500', items: ['Geologisch: Milanković (excentriciteit/obliquiteit/precessie), vulkanen, Pangea, temperatuurcurve', 'Huidig: broeikasgassen (CO₂/CH₄/N₂O), versterkt broeikaseffect, oorzaken', 'Gevolgen: zeespiegelstijging, extremer weer, ontdooien permafrost, biodiversiteitsverlies', 'Positieve (versterken) vs negatieve (afzwakken) terugkoppelingen — voorbeelden kennen', 'IPCC-scenario\'s, adaptatie (aanpassen) vs mitigatie (voorkomen)'] },
                  { titel: 'Ruimtelijke ordening (12,5%) — Canvas reeksen A-D', border: 'border-l-teal-500', items: ['Verstedelijking: urbanisatie/suburbanisatie/rurbanisatie/re-urbanisatie/desurbanisatie', 'Gewestplan → RSV → BRV (evolutie en verschillen)', 'Problemen: lintbebouwing, verharding, urban sprawl, hitte-eiland, sociale segregatie', 'Duurzaam ruimtegebruik: intensivering/hergebruik/verweving/tijdelijk gebruik', 'Bouwshift: stop met uitbreiden, hergebruik bestaande ruimte', 'SDG\'s toepassen op een gebied'] },
                  { titel: 'Landschapsanalyse (10%) — Canvas reeksen A-B', border: 'border-l-teal-400', items: ['Satellietbeelden: ware kleurenbeelden vs valse kleurenbeelden lezen', 'Geopunt gebruiken (op het examen beschikbaar!)', 'Fysisch + sociaaleconomisch landschap analyseren', 'Interacties tussen sferen: geosfeer/atmosfeer/hydrosfeer/biosfeer', 'Onderzoeksvraag beantwoorden, SDG\'s beoordelen'] },
                ].map((b) => (
                  <div key={b.titel} className={`card border-l-4 ${b.border} p-4`}>
                    <h3 className="font-bold text-gray-800 text-sm mb-2">{b.titel}</h3>
                    <ul className="space-y-1">{b.items.map((item, i) => <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5"><span className="text-gray-400 flex-shrink-0">·</span>{item}</li>)}</ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Links */}
        {activeTab === 'links' && (
          <div className="space-y-5">
            {/* Canvas live progress */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <span>🖥️</span> Canvas — jouw cursusvoortgang
                </h3>
                {!canvasLoading && !canvasError && (
                  <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    Live van Canvas
                  </span>
                )}
              </div>

              {canvasLoading && (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
                  <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                  Canvas laden...
                </div>
              )}

              {canvasError && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  <p className="font-semibold mb-1">Canvas kon niet geladen worden</p>
                  <p className="text-xs font-mono break-all">{canvasError}</p>
                  <p className="text-xs text-red-500 mt-1">Controleer of CANVAS_API_TOKEN correct is in .env.local</p>
                </div>
              )}

              {canvas && canvas.length === 0 && (
                <p className="text-sm text-gray-500">Geen actieve cursussen gevonden in Canvas.</p>
              )}

              {canvas && canvas.length > 0 && (
                <div className="space-y-4">
                  {canvas.map((course) => {
                    const pct = course.totalModules > 0
                      ? Math.round((course.completedModules / course.totalModules) * 100)
                      : 0
                    const stateColor = (state: CanvasModule['state']) => {
                      if (state === 'completed') return 'text-green-600'
                      if (state === 'started') return 'text-blue-500'
                      if (state === 'unlocked') return 'text-gray-500'
                      return 'text-gray-300'
                    }
                    const stateIcon = (state: CanvasModule['state']) => {
                      if (state === 'completed') return '✓'
                      if (state === 'started') return '►'
                      if (state === 'unlocked') return '○'
                      return '🔒'
                    }

                    return (
                      <div key={course.id} className="border border-warm-gray rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 text-sm leading-tight">{course.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {course.completedModules}/{course.totalModules} modules voltooid · {pct}%
                            </p>
                          </div>
                          <a
                            href={course.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-600 hover:underline font-medium flex-shrink-0 mt-0.5"
                          >
                            Open →
                          </a>
                        </div>
                        <div className="h-1.5 bg-gray-200">
                          <div
                            className="h-full bg-green-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {course.modules.length > 0 && (
                          <div className="px-4 py-2.5 grid grid-cols-1 gap-0.5 max-h-48 overflow-y-auto">
                            {course.modules.map((mod) => (
                              <div key={mod.id} className="flex items-center gap-2 py-0.5">
                                <span className={`text-xs font-bold w-3 text-center flex-shrink-0 ${stateColor(mod.state)}`}>
                                  {stateIcon(mod.state)}
                                </span>
                                <span className={`text-xs ${mod.state === 'completed' ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                  {mod.name}
                                </span>
                                {mod.items_count > 0 && (
                                  <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{mod.items_count}p</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* CEV */}
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2"><span>🏛️</span> Examencommissie Vlaanderen</h3>
              <div className="space-y-2">
                {[
                  { label: 'Kandidatenplatform (agenda & planning)', url: 'https://examencommissie.vlaanderen.be/kandidaat/landingspagina' },
                  { label: 'Oefenexamen digitale vraagtypes', url: 'https://www.vlaanderen.be/examencommissiesecundaironderwijs/voorbereiding' },
                  { label: 'Geopunt (aardrijkskunde — ook op examen!)', url: 'https://www.geopunt.be' },
                  { label: 'Van Dale woordenboek (toegestaan op examen)', url: 'https://vandale.be' },
                ].map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary-600 hover:underline">
                    <span>→</span>{l.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Frans later */}
            <div className="card bg-purple-50 border-purple-200">
              <h3 className="font-bold text-purple-800 mb-2 flex items-center gap-2"><span>🇫🇷🇬🇧</span> Taalplatform (Frans & Engels)</h3>
              <p className="text-sm text-purple-700 mb-3">Frans 1 (augustus) en Engels 1 staan later gepland. Gebruik het taalplatform om alvast te oefenen.</p>
              <Link href="/dashboard" className="btn-primary text-sm px-4 py-2 inline-block">Open taalplatform →</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
