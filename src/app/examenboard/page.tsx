'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CanvasItemReq { type: string; completed: boolean; min_score: number | null }
interface CanvasItem    { id: number; title: string; type: string; url: string; req: CanvasItemReq | null }
interface CanvasModule  { id: number; name: string; url: string; items: CanvasItem[] }
interface CanvasCourse  {
  id: number; name: string; url: string
  pct: number | null; doneCount: number; totalCount: number; hasTracking: boolean
  modules: CanvasModule[]
}
interface Gewicht { naam: string; pct: number; kleur: string }
interface Examen  {
  id: string; vak: string; datum: string; start: string; eind: string
  locatie: string; gewichten: Gewicht[]; tips: string[]; kleur: string; emoji: string
}
interface Taak {
  id: string; vak: string; tijd: string; taak: string
  canvas?: string; canvasUrl?: string; priority?: 'hoog' | 'medium' | 'laag'
}
interface StudieDag {
  datum: string; dag: string; beschikbaar: string; taken: Taak[]; isExamendag?: boolean
}

// ─── Exam data ────────────────────────────────────────────────────────────────

const CEV_LOCATIE = 'Examencentrum Conscience, Koning Albert II-laan 15, 1210 Brussel'
const CANVAS_AARD = 'https://canvas.instructure.com/courses/12731557'
const CANVAS_NED  = 'https://canvas.instructure.com/courses/12361937'
const FB = '#1877F2'

const KLEUR_MAP: Record<string, string> = {
  green: '#22c55e', blue: '#3b82f6', orange: '#f97316', purple: '#8b5cf6',
  red: '#ef4444', indigo: '#6366f1', amber: '#f59e0b', teal: '#14b8a6',
}

const EXAMENS: Examen[] = [
  { id: 'aard',   vak: 'Aardrijkskunde',          datum: '2026-05-06', start: '11:15', eind: '13:15', locatie: CEV_LOCATIE, emoji: '🌍', kleur: 'green',
    gewichten: [{ naam: 'Heelal', pct: 20, kleur: 'bg-green-600' },{ naam: 'Atmosfeer', pct: 20, kleur: 'bg-green-500' },{ naam: 'Geosfeer', pct: 20, kleur: 'bg-green-400' },{ naam: 'Klimaatverandering', pct: 15, kleur: 'bg-emerald-400' },{ naam: 'Ruimtelijke ord.', pct: 12.5, kleur: 'bg-teal-400' },{ naam: 'Landschapsanalyse', pct: 10, kleur: 'bg-teal-300' },{ naam: 'Situeren', pct: 2.5, kleur: 'bg-teal-200' }],
    tips: ['Je krijgt de Plantyn wereldatlas 2022 — gebruik hem ook bij het studeren','Heelal reeks A al gedaan — vandaag B, C, D afwerken','Heelal + Atmosfeer + Geosfeer = 60% — dit zijn de drie grote blokken','Proefexamens genereren elke keer een nieuw examen — maak er minimum 3'] },
  { id: 'ned1',   vak: 'Nederlands 1',             datum: '2026-05-29', start: '11:15', eind: '13:15', locatie: CEV_LOCATIE, emoji: '📝', kleur: 'blue',
    gewichten: [{ naam: 'Lezen', pct: 30, kleur: 'bg-blue-500' },{ naam: 'Luisteren', pct: 30, kleur: 'bg-blue-400' },{ naam: 'Literatuur', pct: 20, kleur: 'bg-indigo-400' },{ naam: 'Taalbeschouwing', pct: 20, kleur: 'bg-violet-300' }],
    tips: ['23 dagen na aardrijkskunde — eerste focus is aard, dan volledig Nederlands','Lezen + Luisteren = 60% — meeste punten haal je hier','6/8 op literatuur algemeen — stijlfiguren en poëziebegrippen zijn de rest','Proefexamens A, B, C, D beschikbaar op Canvas INZICHT PLUS'] },
  { id: 'bedeco', vak: 'Bedrijfseconomie',         datum: '2026-08-21', start: '11:45', eind: '13:45', locatie: CEV_LOCATIE, emoji: '💼', kleur: 'orange', gewichten: [], tips: [] },
  { id: 'eng1',   vak: 'Engels 1',                 datum: '2026-09-02', start: '11:15', eind: '13:15', locatie: CEV_LOCATIE, emoji: '🇬🇧', kleur: 'indigo',
    gewichten: [{ naam: 'Lezen', pct: 50, kleur: 'bg-indigo-500' },{ naam: 'Luisteren', pct: 50, kleur: 'bg-indigo-300' }],
    tips: ['Alleen lezen (50%) + luisteren (50%) — geen schrijven of spreken op examen 1','Niveau B1+ vereist — gebruik De Studie Factorie cursus op Canvas','Taalplatform op dit platform heeft A1/A2 oefeningen ter voorbereiding'] },
  { id: 'natuur', vak: 'Natuurwetenschappen',      datum: '2026-09-18', start: '11:45', eind: '14:15', locatie: CEV_LOCATIE, emoji: '🔬', kleur: 'purple', gewichten: [], tips: [] },
  { id: 'sameco', vak: 'Samenleving en economie',  datum: '2026-09-24', start: '11:15', eind: '13:15', locatie: CEV_LOCATIE, emoji: '🏛️', kleur: 'amber', gewichten: [], tips: [] },
  { id: 'wisk',   vak: 'Wiskunde gevorderd 1',     datum: '2026-09-28', start: '11:45', eind: '14:15', locatie: CEV_LOCATIE, emoji: '📐', kleur: 'red', gewichten: [], tips: [] },
  { id: 'algeco', vak: 'Algemene economie',        datum: '2026-10-12', start: '11:15', eind: '13:15', locatie: CEV_LOCATIE, emoji: '📊', kleur: 'teal', gewichten: [], tips: [] },
]

const STUDIEPLAN: StudieDag[] = [
  { datum:'2026-04-29',dag:'Woensdag 29 april',beschikbaar:'—',taken:[{id:'w29-skip',vak:'Aardrijkskunde',tijd:'—',priority:'laag',taak:'⚠️ Niet gedaan — heelal B/C/D en atmosfeer verschoven naar donderdag 30 april.'}] },
  { datum:'2026-04-30',dag:'Donderdag 30 april',beschikbaar:'~6 uur (start 10u)',taken:[
    {id:'do30-1',vak:'Aardrijkskunde',tijd:'3u (10u–13u)',priority:'hoog',canvas:'INZICHT → het heelal reeksen B, C, D + atmosfeer cursus',canvasUrl:CANVAS_AARD,taak:'📌 PRIORITEIT 1 — Heelal reeksen B, C, D: afstandsmaten, tijdzones, corioliseffect, culminatiehoogte berekenen, maan & eclipsen. Daarna snel de "cursus atmosfeer" doorlopen.'},
    {id:'do30-2',vak:'Aardrijkskunde',tijd:'2.5u (14u–16u30)',priority:'hoog',canvas:'INZICHT → atmosfeer reeksen A, B, C + start geosfeer cursus',canvasUrl:CANVAS_AARD,taak:'📌 PRIORITEIT 2 — Atmosfeer reeksen A + B + C: luchtdruk, weerkaarten, neerslagtypen, klimaatzones. Daarna: "cursus geosfeer" openen.'},
  ]},
  { datum:'2026-05-01',dag:'Vrijdag 1 mei (Dag van de Arbeid)',beschikbaar:'~8 uur',taken:[
    {id:'vr1-1',vak:'Aardrijkskunde',tijd:'3u (9u–12u)',priority:'hoog',canvas:'INZICHT → geosfeer cursus volledig + reeksen A, B, C',canvasUrl:CANVAS_AARD,taak:'Geosfeer volledig: opbouw aarde, Moho & Gutenberg, platentektoniek, aardbevingen, vulkanen. Maak reeksen A, B, C.'},
    {id:'vr1-2',vak:'Aardrijkskunde',tijd:'2.5u (13u–15u30)',priority:'hoog',canvas:'INZICHT → geosfeer D, E, F + klimaatverandering cursus + reeks A',canvasUrl:CANVAS_AARD,taak:"Geosfeer D, E, F: gesteentecyclus, verwering, erosie. Daarna klimaatverandering: Milanković, broeikasgassen, IPCC-scenario's. Maak reeks A."},
    {id:'vr1-3',vak:'Aardrijkskunde',tijd:'2u (16u–18u)',priority:'medium',canvas:'INZICHT → ruimtelijke ordening cursus + reeks A + landschapsanalyse cursus',canvasUrl:CANVAS_AARD,taak:"Ruimtelijke ordening: gewestplan → RSV → BRV, bouwshift, SDG's. Landschapsanalyse cursus (satellietbeelden, Geopunt)."},
  ]},
  { datum:'2026-05-02',dag:'Zaterdag 2 mei',beschikbaar:'~3 uur (na werk)',taken:[
    {id:'za2-1',vak:'Aardrijkskunde',tijd:'1.5u',priority:'hoog',canvas:'INZICHT → ruimtelijke ordening reeks B + landschapsanalyse reeks A + atmosfeer D',canvasUrl:CANVAS_AARD,taak:'Ruimtelijke ordening reeks B, landschapsanalyse reeks A, atmosfeer reeks D.'},
    {id:'za2-2',vak:'Aardrijkskunde',tijd:'1.5u',priority:'hoog',canvas:'INZICHT → proefexamen 1 + zwakste punten markeren',canvasUrl:CANVAS_AARD,taak:'Eerste volledig proefexamen. Na afloop: schrijf de 3 topics waar je punten verloor op.'},
  ]},
  { datum:'2026-05-03',dag:'Zondag 3 mei',beschikbaar:'~3 uur',taken:[
    {id:'zo3-1',vak:'Aardrijkskunde',tijd:'2u',priority:'hoog',canvas:'INZICHT → zwakste blokken herhalen + proefexamen 2',canvasUrl:CANVAS_AARD,taak:'Begin met de 3 zwakste topics bijwerken. Daarna direct proefexamen 2.'},
    {id:'zo3-2',vak:'Aardrijkskunde',tijd:'1u',priority:'medium',taak:'Maak persoonlijke spiekbrief: formules heelal, Moho/Gutenberg, gesteentenlijst bijlage, IPCC-scenario\'s.'},
  ]},
  { datum:'2026-05-04',dag:'Maandag 4 mei',beschikbaar:'~8 uur',taken:[
    {id:'ma4-1',vak:'Aardrijkskunde',tijd:'3u',priority:'hoog',canvas:'INZICHT → herhaling zwakste blokken op basis van proefexamens',canvasUrl:CANVAS_AARD,taak:'Ga terug naar de blokken waar je punten verloor. Maak de bijhorende extra oefenreeksen.'},
    {id:'ma4-2',vak:'Aardrijkskunde',tijd:'2u',priority:'hoog',canvas:'INZICHT → proefexamen 3 (laatste)',canvasUrl:CANVAS_AARD,taak:'Derde proefexamen. Meet je score. STOPPEN met nieuwe stof daarna.'},
    {id:'ma4-3',vak:'Aardrijkskunde',tijd:'1u',priority:'medium',taak:'Spiekbrief: formules, specifieke data, gesteentenlijst bijlage.'},
  ]},
  { datum:'2026-05-05',dag:'Dinsdag 5 mei — dag voor aardrijkskunde',beschikbaar:'~3 uur (avond)',taken:[
    {id:'di5-1',vak:'Aardrijkskunde',tijd:'1u',priority:'medium',canvas:'INZICHT → vluchtig bekijken',canvasUrl:CANVAS_AARD,taak:'Max 1 uur: blik over spiekbrief. NIET meer studeren — rust is nu productiver.'},
    {id:'di5-2',vak:'Voorbereiding',tijd:'15min',priority:'hoog',taak:'Klaarleggen: identiteitskaart, pen, kladpapier. Adres: CEV Conscience, Brussel. Start 11:15 — op tijd vertrekken! Rekenmachine meenemen.'},
  ]},
  { datum:'2026-05-06',dag:'Woensdag 6 mei — EXAMEN AARDRIJKSKUNDE',beschikbaar:'—',isExamendag:true,taken:[
    {id:'wo6-1',vak:'Aardrijkskunde',tijd:'11:15–13:15',taak:'EXAMEN Aardrijkskunde — 120 min. Je krijgt de Plantyn atlas! Gebruik hem actief. Rekenmachine beschikbaar.'},
  ]},
  { datum:'2026-05-07',dag:'Donderdag 7 mei — SCHOOL EXAMEN',beschikbaar:'~4 uur (na examen)',isExamendag:true,taken:[
    {id:'so07-ex',vak:'School',tijd:'08:20–09:10',taak:'⚠️ SCHOOL EXAMEN: Schrijfopdracht opiniestuk "AI" (Nederlandsles BA Stassart).'},
    {id:'so07-1',vak:'School',tijd:'Na examen — 2u',priority:'hoog',canvas:'Smartschool → Aardrijkskunde → Planner → Geopunt opdracht',canvasUrl:'https://bastassart.smartschool.be/planner/main/user/43_16564_0/2026-05-08/planned-assignments/43/299b308b-1793-448f-be6d-4145772234d8',taak:'Na school-examen: begin aan Geopunt-opdracht (deadline 8 mei 12:50). "Dromen van een weekendje weg".'},
  ]},
  { datum:'2026-05-08',dag:'Vrijdag 8 mei',beschikbaar:'~6 uur',taken:[
    {id:'n08-1',vak:'Nederlands',tijd:'3u',priority:'hoog',canvas:'INZICHT → leerpad taalbeschouwing + taalsysteem',canvasUrl:CANVAS_NED,taak:'Taalbeschouwing: taalvariatie + alineaverbanden. Taalsysteem: fonologie. Poëzie: dichtvormen + rijm en strofe.'},
    {id:'n08-2',vak:'Nederlands',tijd:'3u',priority:'hoog',canvas:'INZICHT → extra leesoefeningen → Digi-taal + Nooit meer niksdoen',canvasUrl:CANVAS_NED,taak:'Extra leesoefeningen: "Digi-taal" (13p) + "Nooit meer niksdoen" (11p). Oefen leesstrategie.'},
  ]},
  { datum:'2026-05-14',dag:'Donderdag 14 mei',beschikbaar:'~4 uur',taken:[
    {id:'n14-1',vak:'Nederlands',tijd:'2u',priority:'hoog',canvas:'INZICHT → extra oefeningen literaire termen',canvasUrl:CANVAS_NED,taak:'Proza (11p) + Verhaalkenmerken (4p) + Literatuur algemeen herhaling.'},
    {id:'n14-2',vak:'Nederlands',tijd:'2u',priority:'medium',canvas:'INZICHT → taalbeschouwelijke termen oefeningen',canvasUrl:CANVAS_NED,taak:'Herhaal communicatiemodel, taalregisters en drogredenen.'},
  ]},
  { datum:'2026-05-21',dag:'Donderdag 21 mei',beschikbaar:'~4 uur',taken:[
    {id:'n21-1',vak:'Nederlands',tijd:'2u',priority:'hoog',canvas:'INZICHT → proefexamen A (42p)',canvasUrl:CANVAS_NED,taak:'Proefexamen A volledig maken.'},
    {id:'n21-2',vak:'Nederlands',tijd:'2u',priority:'hoog',canvas:'INZICHT → proefexamen B (25p)',canvasUrl:CANVAS_NED,taak:'Proefexamen B. Vergelijk score met A.'},
  ]},
  { datum:'2026-05-26',dag:'Dinsdag 26 mei',beschikbaar:'~4 uur',taken:[
    {id:'n26-1',vak:'Nederlands',tijd:'2u',priority:'hoog',canvas:'INZICHT → proefexamen C + D',canvasUrl:CANVAS_NED,taak:'Proefexamen C en/of D.'},
    {id:'n26-2',vak:'Nederlands',tijd:'2u',priority:'hoog',canvas:'INZICHT → zwakste punten bijwerken',canvasUrl:CANVAS_NED,taak:'Gerichte herhaling op basis van alle proefexamens.'},
  ]},
  { datum:'2026-05-28',dag:'Donderdag 28 mei — dag voor Nederlands',beschikbaar:'~2 uur (avond)',taken:[
    {id:'n28-1',vak:'Nederlands',tijd:'45min',priority:'medium',taak:'Vluchtig de spiekbrief bekijken. NIET meer studeren.'},
    {id:'n28-2',vak:'Voorbereiding',tijd:'10min',priority:'hoog',taak:'Klaarleggen: identiteitskaart, pen. CEV Conscience Brussel. Start 11:15. Vroeg slapen.'},
  ]},
  { datum:'2026-05-29',dag:'Vrijdag 29 mei — EXAMEN NEDERLANDS 1',beschikbaar:'—',isExamendag:true,taken:[
    {id:'ned29-1',vak:'Nederlands',tijd:'11:15–13:15',taak:'EXAMEN Nederlands 1 — 120 min. Lezen + Luisteren + Literatuur + Taalbeschouwing.'},
  ]},
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysUntil(datum: string): number {
  const target = new Date(datum); const now = new Date()
  now.setHours(0,0,0,0); target.setHours(0,0,0,0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}
function isToday(datum: string) { return getDaysUntil(datum) === 0 }
function isPast(datum: string)  { return getDaysUntil(datum) < 0 }

function getNextExamen(): Examen | null {
  const now = new Date(); now.setHours(0,0,0,0)
  return EXAMENS.filter(e => new Date(e.datum) >= now)
    .sort((a,b) => new Date(a.datum).getTime() - new Date(b.datum).getTime())[0] ?? null
}

const VAK_KLEUR: Record<string, { bg: string; color: string }> = {
  Aardrijkskunde: { bg: '#D4EDDA', color: '#155724' },
  Nederlands:     { bg: '#D1ECF1', color: '#0C5460' },
  School:         { bg: '#FFF3CD', color: '#856404' },
  Voorbereiding:  { bg: '#FFF3CD', color: '#856404' },
}

// ─── Countdown ────────────────────────────────────────────────────────────────

function Countdown() {
  const next = getNextExamen()
  const [t, setT] = useState({ d: 0, h: 0, m: 0, s: 0 })

  useEffect(() => {
    if (!next) return
    const target = new Date(`${next.datum}T${next.start}:00`)
    const tick = () => {
      const diff = target.getTime() - Date.now()
      if (diff <= 0) return
      setT({ d: Math.floor(diff/86400000), h: Math.floor(diff%86400000/3600000), m: Math.floor(diff%3600000/60000), s: Math.floor(diff%60000/1000) })
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [next])

  const color = next ? (KLEUR_MAP[next.kleur] ?? FB) : '#22c55e'

  return (
    <div className="fb-card" style={{ overflow: 'hidden' }}>
      {/* Cover gradient */}
      <div style={{ height: 8, background: color }} />
      <div style={{ padding: 20 }}>
        {!next ? (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <p style={{ fontWeight: 800, fontSize: 20, color: '#1C1E21', margin: 0 }}>Alle examens afgelegd!</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 10, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>{next.emoji}</div>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Volgend examen</p>
                <p style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1C1E21' }}>{next.vak}</p>
                <p style={{ margin: 0, fontSize: 13, color: '#65676B' }}>{next.datum.split('-').reverse().join('/')} · {next.start}–{next.eind}</p>
              </div>
            </div>

            {/* Countdown blokken */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
              {[{ v: t.d, l: 'dagen' }, { v: t.h, l: 'uren' }, { v: t.m, l: 'min' }, { v: t.s, l: 'sec' }].map(({ v, l }) => (
                <div key={l} style={{ background: color + '12', borderRadius: 8, padding: '12px 8px', textAlign: 'center', border: `1px solid ${color}30` }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{String(v).padStart(2,'0')}</div>
                  <div style={{ fontSize: 11, color: '#65676B', fontWeight: 600 }}>{l}</div>
                </div>
              ))}
            </div>

            {/* Upcoming */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {EXAMENS.filter(e => !isPast(e.datum) && e.datum !== next.datum).slice(0,3).map(e => (
                <span key={e.id} style={{ fontSize: 12, background: '#E4E6EB', color: '#1C1E21', borderRadius: 20, padding: '4px 12px', fontWeight: 600 }}>
                  {e.emoji} {e.vak.split(' ')[0]} — {getDaysUntil(e.datum)}d
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── ExamenKaart ──────────────────────────────────────────────────────────────

function ExamenKaart({ ex }: { ex: Examen }) {
  const [open, setOpen] = useState(getDaysUntil(ex.datum) <= 14 && getDaysUntil(ex.datum) >= 0)
  const dagen = getDaysUntil(ex.datum)
  const past  = dagen < 0
  const color = KLEUR_MAP[ex.kleur] ?? FB

  return (
    <div className="fb-card" style={{ border: `2px solid ${open ? color : 'transparent'}`, transition: 'border-color .15s' }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
        <div style={{ width: 48, height: 48, borderRadius: 10, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{ex.emoji}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#1C1E21' }}>{ex.vak}</p>
          <p style={{ margin: 0, fontSize: 13, color: '#65676B' }}>{ex.datum.split('-').reverse().join('/')} · {ex.start}–{ex.eind}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!past && <span style={{ background: dagen <= 7 ? (dagen === 0 ? '#E41E3F' : '#FFF3CD') : '#E4E6EB', color: dagen <= 7 ? (dagen === 0 ? '#fff' : '#856404') : '#65676B', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{dagen === 0 ? 'VANDAAG' : `${dagen}d`}</span>}
          {past && <span style={{ background: '#D4EDDA', color: '#155724', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>✓ Afgelegd</span>}
          <span style={{ color: '#65676B', fontSize: 14, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
        </div>
      </button>

      {open && (
        <>
          <div style={{ height: 1, background: '#E4E6EB' }} />
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 14, color: '#65676B' }}>📍 {ex.locatie}</p>

            {ex.gewichten.length > 0 && (
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Verdeling punten</p>
                <div style={{ display: 'flex', height: 20, borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
                  {ex.gewichten.map(g => (
                    <div key={g.naam} className={g.kleur} style={{ width: `${g.pct}%`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }} title={`${g.naam}: ${g.pct}%`}>
                      {g.pct >= 15 ? `${g.pct}%` : ''}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                  {ex.gewichten.map(g => (
                    <span key={g.naam} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#65676B' }}>
                      <span className={g.kleur} style={{ width: 8, height: 8, borderRadius: 2, display: 'inline-block' }} />{g.naam} {g.pct}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            {ex.tips.length > 0 && (
              <div style={{ background: '#FFF3CD', border: '1px solid #FFD54F', borderRadius: 8, padding: '12px 14px' }}>
                {ex.tips.map((tip, i) => (
                  <p key={i} style={{ margin: i === 0 ? 0 : '6px 0 0', fontSize: 13, color: '#795548', display: 'flex', gap: 8 }}>
                    <span style={{ flexShrink: 0 }}>→</span>{tip}
                  </p>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ─── StudiePlanDag ────────────────────────────────────────────────────────────

function StudiePlanDag({ dag, voltooid, onToggle }: {
  dag: StudieDag; voltooid: Set<string>; onToggle: (id: string) => void
}) {
  const today = isToday(dag.datum)
  const past  = isPast(dag.datum)
  const [open, setOpen] = useState(today || dag.isExamendag || (!past && getDaysUntil(dag.datum) <= 3))
  const taken = dag.taken.filter(t => t.vak !== 'Voorbereiding')
  const klaar = taken.filter(t => voltooid.has(t.id)).length
  const pct   = taken.length > 0 ? Math.round((klaar / taken.length) * 100) : 0

  const borderColor = dag.isExamendag ? '#E41E3F' : today ? FB : past && klaar === taken.length && taken.length > 0 ? '#22c55e' : '#E4E6EB'

  return (
    <div className="fb-card" style={{ border: `2px solid ${borderColor}`, transition: 'border-color .15s' }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
        <div style={{ width: 48, height: 48, borderRadius: 10, background: dag.isExamendag ? '#FEE2E2' : today ? '#E7F3FF' : '#F0F2F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'column' }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: dag.isExamendag ? '#E41E3F' : today ? FB : '#65676B' }}>
            {new Date(dag.datum).toLocaleDateString('nl-BE',{month:'short'}).toUpperCase()}
          </span>
          <span style={{ fontSize: 20, fontWeight: 800, color: dag.isExamendag ? '#E41E3F' : today ? FB : '#1C1E21', lineHeight: 1 }}>
            {new Date(dag.datum).getDate()}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1C1E21' }}>{dag.dag}</span>
            {today && <span style={{ background: FB, color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>VANDAAG</span>}
            {dag.isExamendag && <span style={{ background: '#E41E3F', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 800 }}>EXAMEN</span>}
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#65676B' }}>{dag.beschikbaar}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {!dag.isExamendag && taken.length > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: klaar === taken.length ? '#22c55e' : '#65676B' }}>{klaar}/{taken.length}</span>
          )}
          <span style={{ color: '#65676B', fontSize: 14, transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
        </div>
      </button>

      {!dag.isExamendag && taken.length > 0 && (
        <div style={{ height: 4, background: '#E4E6EB' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: '#22c55e', transition: 'width .5s ease' }} />
        </div>
      )}

      {open && (
        <div style={{ borderTop: '1px solid #E4E6EB', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dag.taken.map(taak => {
            const done = voltooid.has(taak.id)
            const vk   = VAK_KLEUR[taak.vak] ?? { bg: '#F3E8FF', color: '#7E22CE' }
            return (
              <div key={taak.id} style={{ background: done ? '#F0FFF4' : '#fff', border: `1px solid ${done ? '#A8D5B5' : '#E4E6EB'}`, borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start', transition: 'background .2s' }}>
                {!dag.isExamendag ? (
                  <button onClick={() => onToggle(taak.id)}
                    style={{ width: 24, height: 24, borderRadius: 6, border: `2px solid ${done ? '#22c55e' : '#CED0D4'}`, background: done ? '#22c55e' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, cursor: 'pointer', transition: 'all .15s', fontSize: 12, color: '#fff', fontWeight: 800 }}>
                    {done ? '✓' : ''}
                  </button>
                ) : (
                  <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{taak.vak === 'Nederlands' ? '📝' : taak.vak === 'Aardrijkskunde' ? '🌍' : '⏸️'}</span>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                    <span style={{ background: vk.bg, color: vk.color, borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{taak.vak}</span>
                    <span style={{ fontSize: 12, color: '#65676B', fontWeight: 500 }}>{taak.tijd}</span>
                    {taak.priority === 'hoog' && !done && <span style={{ background: '#FEE2E2', color: '#E41E3F', borderRadius: 4, padding: '2px 6px', fontSize: 11, fontWeight: 700 }}>prioriteit</span>}
                  </div>
                  {taak.canvas && (
                    <div style={{ background: '#E7F3FF', border: '1px solid #C0D9FF', borderRadius: 6, padding: '6px 10px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, flexShrink: 0 }}>📋</span>
                      {taak.canvasUrl
                        ? <a href={taak.canvasUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: FB, fontWeight: 600, textDecoration: 'none' }}>{taak.canvas} ↗</a>
                        : <span style={{ fontSize: 13, color: FB, fontWeight: 600 }}>{taak.canvas}</span>}
                    </div>
                  )}
                  <p style={{ margin: 0, fontSize: 14, color: done ? '#9ca3af' : '#1C1E21', textDecoration: done ? 'line-through' : 'none', lineHeight: 1.5 }}>{taak.taak}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── CanvasProgress ───────────────────────────────────────────────────────────

function CanvasProgress({ canvas, loading, error }: {
  canvas: CanvasCourse[] | null; loading: boolean; error: string | null
}) {
  const [expanded, setExpanded] = useState<number | null>(null)

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 20, color: '#65676B' }}><div className="fb-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} /> Canvas laden…</div>
  if (error)  return <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#E41E3F' }}><strong>Canvas niet bereikbaar:</strong> {error}</div>
  if (!canvas || canvas.length === 0) return <p style={{ color: '#65676B', fontSize: 14, margin: 0 }}>Geen cursussen gevonden.</p>

  const typeIcon = (t: string) => t === 'Quiz' ? '📝' : t === 'ExternalTool' ? '🔗' : t === 'Page' ? '📄' : t === 'Assignment' ? '✏️' : '•'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {canvas.map(course => (
        <div key={course.id} style={{ border: '1px solid #E4E6EB', borderRadius: 8, overflow: 'hidden' }}>
          <button onClick={() => setExpanded(expanded === course.id ? null : course.id)}
            style={{ width: '100%', background: '#F0F2F5', border: 'none', cursor: 'pointer', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#1C1E21', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.name}</p>
              <p style={{ margin: 0, fontSize: 12, color: '#65676B' }}>
                {course.hasTracking ? `${course.doneCount}/${course.totalCount} items · ${course.pct}%` : `${course.modules.length} modules`}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {course.hasTracking && course.pct !== null && (
                <span style={{ background: course.pct === 100 ? '#D4EDDA' : course.pct > 50 ? '#E7F3FF' : '#E4E6EB', color: course.pct === 100 ? '#155724' : course.pct > 50 ? FB : '#65676B', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{course.pct}%</span>
              )}
              <a href={course.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 13, color: FB, fontWeight: 600, textDecoration: 'none' }}>Open ↗</a>
              <span style={{ color: '#65676B', fontSize: 12, transition: 'transform .2s', transform: expanded === course.id ? 'rotate(180deg)' : 'none' }}>▾</span>
            </div>
          </button>
          {course.hasTracking && <div style={{ height: 3, background: '#E4E6EB' }}><div style={{ height: '100%', width: `${course.pct ?? 0}%`, background: '#22c55e', transition: 'width .5s' }} /></div>}
          {expanded === course.id && (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {course.modules.map(mod => (
                <div key={mod.id} style={{ padding: '10px 14px', borderTop: '1px solid #E4E6EB' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1C1E21' }}>{mod.name}</p>
                    <a href={mod.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: FB }}>→</a>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {mod.items.map(item => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, width: 16, textAlign: 'center', flexShrink: 0 }}>
                          {item.req ? (item.req.completed ? '✅' : '⬜') : <span style={{ color: '#BEC3C9' }}>{typeIcon(item.type)}</span>}
                        </span>
                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 12, color: item.req?.completed ? '#BEC3C9' : '#1C1E21', textDecoration: item.req?.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </a>
                        {item.req && !item.req.completed && item.req.min_score && <span style={{ fontSize: 11, color: '#F59E0B', flexShrink: 0 }}>min {item.req.min_score}pt</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <p style={{ margin: 0, fontSize: 12, color: '#65676B' }}>INZICHT PLUS gebruikt externe oefentools — Canvas registreert individuele scores niet via de API.</p>
    </div>
  )
}

// ─── Vakinfo blokken ──────────────────────────────────────────────────────────

const VAKINFO_AARD = [
  { titel:'Heelal (20%)', kleur:'#22c55e', items:['Big Bang, uitdijend heelal','Afstandsmaten: lichtseconde/minuut/jaar/AE — berekeningen!','Aardrotatie: dag/nacht, tijdverschil, corioliseffect','Aardrevolutie: seizoenen, culminatiehoogte (22/12, 21/3, 21/6, 23/9)','Maan: schijngestalten, getijden, eclipsen'] },
  { titel:'Atmosfeer (20%)', kleur:'#16a34a', items:['Lagen: tropo/strato/meso/thermo/exosfeer','Temperatuurfactoren: breedteligging, hoogte, zeestromen','Luchtdruk: cycloon/anticycloon, ITCZ, passaat, straalstroom','Neerslag: convectie/stijging/frontale/moesson','Weerkaart: fronten, isobaren, windrichting'] },
  { titel:'Geosfeer (20%)', kleur:'#15803d', items:['Opbouw: kern/mantel/lithosfeer/korst + Moho & Gutenberg','Platentektoniek: divergentie/convergentie/transforme','Aardbevingen (Richter, MMS), vulkanen (strato/schildvulkaan)','Gesteenten bijlage KENNEN: graniet, basalt, kalksteen…','Erosie: water (V-dal), glaciaal (U-dal/fjord), wind (duin/löss)'] },
  { titel:'Klimaatverandering (15%)', kleur:'#10b981', items:["Milanković (excentriciteit/obliquiteit/precessie)",'CO₂/CH₄/N₂O, versterkt broeikaseffect','Zeespiegelstijging, extremer weer, permafrost',"Positieve vs negatieve terugkoppelingen","IPCC-scenario's, adaptatie vs mitigatie"] },
  { titel:'Ruimtelijke ordening (12,5%)', kleur:'#14b8a6', items:['Urbanisatie/suburbanisatie/rurbanisatie','Gewestplan → RSV → BRV','Lintbebouwing, verharding, urban sprawl, hitte-eiland',"Bouwshift: stop uitbreiden, hergebruik bestaand","SDG's toepassen"] },
  { titel:'Landschapsanalyse (10%)', kleur:'#0d9488', items:['Satellietbeelden: ware vs valse kleuren','Geopunt gebruiken (beschikbaar op examen!)','Fysisch + sociaaleconomisch landschap analyseren','Interacties tussen sferen','Onderzoeksvraag beantwoorden'] },
]
const VAKINFO_NED = [
  { titel:'Lezen (30%)', kleur:'#3b82f6', items:['Onderwerp (1-2 woorden)','Hoofdgedachte (1 zin)','Hoofdpunten opsommen','Tekstverbanden: oorzaak/gevolg, tegenstelling, vergelijking','Bronbetrouwbaarheid: zender, doel, kanaal, nepnieuws'] },
  { titel:'Luisteren (30%)', kleur:'#2563eb', items:['Zelfde vaardigheden als lezen','Notities nemen terwijl je luistert','Signaalwoorden: ten eerste, bovendien, echter, dus','Oefen: vrt.be nieuws, VRT Max documentaires'] },
  { titel:'Literatuur (20%)', kleur:'#6366f1', items:['Stijlfiguren: metafoor, personificatie, hyperbool, anafoor, antithese, paradox','Verhaalkenmerken: personage, vertelperspectief, opbouw','Poëzie: rijmschema, strofe, enjambement, volta','Literaire stromingen (Canvas: literatuur algemeen)'] },
  { titel:'Taalbeschouwing (20%)', kleur:'#7c3aed', items:['Communicatiemodel: zender→boodschap→ontvanger→kanaal→doel→effect','Feiten vs meningen, drogredenen','Taalregisters: standaardtaal, dialect, tussentaal, jargon','Alineaverbanden: oorzakelijk, chronologisch, tegenstellend','Fonologie, woordsoorten, zinsdelen'] },
]

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExamenBoard() {
  const router  = useRouter()
  const [authed, setAuthed]         = useState<boolean | null>(null)
  const [voltooid, setVoltooid]     = useState<Set<string>>(new Set())
  const [userId, setUserId]         = useState<string | null>(null)
  const [activeTab, setActiveTab]   = useState<'plan'|'examens'|'vakinfo'|'links'>('plan')
  const [canvas, setCanvas]         = useState<CanvasCourse[] | null>(null)
  const [canvasError, setCanvasError]   = useState<string | null>(null)
  const [canvasLoading, setCanvasLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session?.user) { router.replace('/auth/login'); return }
      const uid = data.session.user.id
      const { data: profile } = await supabase.from('profiles').select('is_superadmin').eq('id', uid).single()
      if (!profile?.is_superadmin) { router.replace('/platform'); return }
      setUserId(uid); setAuthed(true)
      const { data: rows } = await supabase.from('study_tasks').select('task_id').eq('user_id', uid).eq('completed', true)
      if (rows) setVoltooid(new Set(rows.map((r: { task_id: string }) => r.task_id)))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    fetch('/api/canvas')
      .then(r => r.json())
      .then(d => { if (d.error) setCanvasError(d.error); else setCanvas(d.courses) })
      .catch(e => setCanvasError(String(e)))
      .finally(() => setCanvasLoading(false))
  }, [])

  const saveToSupabase = useCallback(async (uid: string, id: string, done: boolean) => {
    await supabase.from('study_tasks').upsert({ user_id: uid, task_id: id, completed: done, completed_at: done ? new Date().toISOString() : null })
  }, [])

  const toggleTaak = useCallback((id: string) => {
    setVoltooid(prev => {
      const next = new Set(prev)
      const done = !next.has(id)
      done ? next.add(id) : next.delete(id)
      if (userId) {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => saveToSupabase(userId, id, done), 300)
      }
      return next
    })
  }, [userId, saveToSupabase])

  const alleTaken   = STUDIEPLAN.flatMap(d => d.taken.filter(t => !d.isExamendag && t.vak !== 'Voorbereiding'))
  const totaalKlaar = alleTaken.filter(t => voltooid.has(t.id)).length
  const totaalPct   = alleTaken.length > 0 ? Math.round((totaalKlaar / alleTaken.length) * 100) : 0

  const TABS = [
    { id: 'plan' as const,    label: 'Studieplan',  emoji: '📅' },
    { id: 'examens' as const, label: 'Examens',     emoji: '🗓️' },
    { id: 'vakinfo' as const, label: 'Vakinfo',     emoji: '📖' },
    { id: 'links' as const,   label: 'Canvas',      emoji: '🖥️' },
  ]

  if (authed === null) return (
    <div className="page-fullbleed" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F0F2F5' }}>
      <div className="fb-spinner" />
    </div>
  )

  return (
    <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif' }}>
      {/* Sticky header — exact FB page header */}
      <div style={{ position: 'sticky', top: 56, zIndex: 20, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,.1)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, marginTop: 8, marginBottom: 8 }}>🎓</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: '#1C1E21' }}>Examencommissie Board</p>
            <p style={{ margin: 0, fontSize: 12, color: '#65676B' }}>Jona Leenders · 3de graad doorstroom 2026 · {userId ? '● Gesynchroniseerd' : '● Lokaal'}</p>
          </div>
        </div>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px', display: 'flex', overflowX: 'auto', borderTop: '1px solid #E4E6EB' }}>
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', borderBottom: activeTab === tab.id ? `3px solid ${FB}` : '3px solid transparent', color: activeTab === tab.id ? FB : '#65676B', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', fontFamily: 'inherit', transition: 'color .1s' }}>
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>
        <Countdown />

        {/* Progress bar */}
        <div className="fb-card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#1C1E21' }}>Studieplan voortgang</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: FB }}>{totaalKlaar}/{alleTaken.length} · {totaalPct}%</span>
          </div>
          <div style={{ height: 8, background: '#E4E6EB', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${totaalPct}%`, background: `linear-gradient(90deg, #22c55e, ${FB})`, borderRadius: 8, transition: 'width .7s ease' }} />
          </div>
          {!userId && <p style={{ margin: '8px 0 0', fontSize: 13, color: '#F59E0B' }}>
            <Link href="/auth/login" style={{ color: FB, fontWeight: 700 }}>Aanmelden</Link> om voortgang te synchroniseren.
          </p>}
        </div>

        {/* ── PLAN ── */}
        {activeTab === 'plan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#E7F3FF', border: '1px solid #C0D9FF', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#1C1E21' }}>
              <strong>Blok 1:</strong> Aardrijkskunde — 6 mei (11:15) &nbsp;·&nbsp; <strong>Blok 2:</strong> Nederlands 1 — 29 mei (11:15) · <span style={{ color: '#65676B' }}>23 extra dagen na aardrijkskunde</span>
            </div>
            {STUDIEPLAN.map(dag => <StudiePlanDag key={dag.datum + dag.dag} dag={dag} voltooid={voltooid} onToggle={toggleTaak} />)}
          </div>
        )}

        {/* ── EXAMENS ── */}
        {activeTab === 'examens' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ background: '#FFF3CD', border: '1px solid #FFD54F', borderRadius: 8, padding: '12px 16px', fontSize: 14, color: '#795548' }}>
              <p style={{ margin: '0 0 4px', fontWeight: 700 }}>Locatie: Examencentrum Conscience, Koning Albert II-laan 15, 1210 Brussel</p>
              <p style={{ margin: '0 0 2px' }}><strong>Meebrengen:</strong> identiteitskaart · pen · GEEN gsm of samenvattingen</p>
              <p style={{ margin: 0 }}><strong>Je krijgt:</strong> kladpapier · hoofdtelefoon · (aard: Plantyn atlas 2022)</p>
            </div>
            {EXAMENS.map(ex => <ExamenKaart key={ex.id} ex={ex} />)}
          </div>
        )}

        {/* ── VAKINFO ── */}
        {activeTab === 'vakinfo' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Aardrijkskunde */}
            <div className="fb-card" style={{ overflow: 'hidden' }}>
              <div style={{ background: '#22c55e', padding: '14px 16px' }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 17, color: '#fff' }}>🌍 Aardrijkskunde — 6 mei, 11:15–13:15</p>
              </div>
              <div style={{ padding: '12px 16px', background: '#F0FFF4', borderBottom: '1px solid #E4E6EB', fontSize: 14, color: '#155724' }}>
                Heelal reeks A al gedaan. Plantyn atlas beschikbaar op examen. Rekenmachine mag mee.
              </div>
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 10 }}>
                {VAKINFO_AARD.map(b => (
                  <div key={b.titel} style={{ border: `2px solid ${b.kleur}`, borderRadius: 8, padding: 14 }}>
                    <p style={{ margin: '0 0 8px', fontWeight: 800, fontSize: 14, color: b.kleur }}>{b.titel}</p>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {b.items.map((item,i) => <li key={i} style={{ fontSize: 13, color: '#1C1E21', display: 'flex', gap: 6 }}><span style={{ color: '#BEC3C9', flexShrink: 0 }}>·</span>{item}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Nederlands */}
            <div className="fb-card" style={{ overflow: 'hidden' }}>
              <div style={{ background: '#3b82f6', padding: '14px 16px' }}>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 17, color: '#fff' }}>📝 Nederlands 1 — 29 mei, 11:15–13:15</p>
              </div>
              <div style={{ padding: '12px 16px', background: '#EFF6FF', borderBottom: '1px solid #E4E6EB', fontSize: 14, color: '#1e40af' }}>
                6/8 op literatuur algemeen — goed fundament. Stijlfiguren + leesoefeningen zijn de prioriteit.
              </div>
              <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 10 }}>
                {VAKINFO_NED.map(b => (
                  <div key={b.titel} style={{ border: `2px solid ${b.kleur}`, borderRadius: 8, padding: 14 }}>
                    <p style={{ margin: '0 0 8px', fontWeight: 800, fontSize: 14, color: b.kleur }}>{b.titel}</p>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {b.items.map((item,i) => <li key={i} style={{ fontSize: 13, color: '#1C1E21', display: 'flex', gap: 6 }}><span style={{ color: '#BEC3C9', flexShrink: 0 }}>·</span>{item}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CANVAS / LINKS ── */}
        {activeTab === 'links' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="fb-card">
              <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#E41E3F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🖥️</div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: '#1C1E21' }}>Canvas — cursusvoortgang</p>
                    {!canvasLoading && !canvasError && <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 700 }}>● Live</span>}
                  </div>
                </div>
              </div>
              <div style={{ padding: 16 }}>
                <CanvasProgress canvas={canvas} loading={canvasLoading} error={canvasError} />
              </div>
            </div>

            <div className="fb-card">
              <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🌐</div>
                <div><p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: '#1C1E21' }}>Taalbronnen & CEV</p></div>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label:'Taalplatform — Frans & Engels', href:'/dashboard', internal: true },
                  { label:'Kandidatenplatform CEV (agenda & planning)', href:'https://examencommissie.vlaanderen.be/kandidaat/landingspagina' },
                  { label:'Geopunt (ook op examen beschikbaar!)', href:'https://www.geopunt.be' },
                  { label:'Van Dale woordenboek (toegestaan op examen)', href:'https://vandale.be' },
                  { label:'Lingua.com — gratis taaloefeningen', href:'https://lingua.com/nl/' },
                  { label:'British Council Belgium — Engels B1/B2', href:'https://www.britishcouncil.be/' },
                ].map(l => (
                  l.internal
                    ? <Link key={l.href} href={l.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, textDecoration: 'none', transition: 'background .1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F0F2F5')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E7F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>→</div>
                        <span style={{ fontSize: 15, fontWeight: 500, color: FB }}>{l.label}</span>
                      </Link>
                    : <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, textDecoration: 'none', transition: 'background .1s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#F0F2F5')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#E7F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>↗</div>
                        <span style={{ fontSize: 15, fontWeight: 500, color: FB }}>{l.label}</span>
                      </a>
                ))}
              </div>
            </div>

            <div className="fb-card" style={{ padding: 16 }}>
              <p style={{ margin: '0 0 12px', fontWeight: 800, fontSize: 16, color: '#1C1E21' }}>📋 Alle geplande examens</p>
              {EXAMENS.map(e => {
                const d = getDaysUntil(e.datum)
                const color = KLEUR_MAP[e.kleur] ?? FB
                return (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #E4E6EB' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{e.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: '#1C1E21' }}>{e.vak}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#65676B' }}>{e.datum.split('-').reverse().join('/')} · {e.start}</p>
                    </div>
                    <span style={{ background: d < 0 ? '#E4E6EB' : d <= 7 ? '#FEE2E2' : '#E7F3FF', color: d < 0 ? '#65676B' : d <= 7 ? '#E41E3F' : FB, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>
                      {d < 0 ? 'Afgelegd' : d === 0 ? 'VANDAAG' : `${d}d`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
