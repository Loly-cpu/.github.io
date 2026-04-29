'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Gewicht { naam: string; pct: number; kleur: string }
interface Examen {
  id: string; vak: string; datum: string; start: string; eind: string
  locatie: string; gewichten: Gewicht[]; tips: string[]; kleur: string; emoji: string
}
interface Taak {
  id: string; vak: string; tijd: string; taak: string; link?: string
}
interface StudieDag {
  datum: string; dag: string; beschikbaar: string; taken: Taak[]
  isExamendag?: boolean; isVandaag?: boolean
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const EXAMENS: Examen[] = [
  {
    id: 'ned1', vak: 'Nederlands 1', datum: '2026-05-06', start: '08:30', eind: '10:30',
    locatie: 'Examencentrum Conscience, Koning Albert II-laan 15, 1210 Brussel',
    emoji: '📝', kleur: 'blue',
    gewichten: [
      { naam: 'Lezen', pct: 30, kleur: 'bg-blue-500' },
      { naam: 'Luisteren', pct: 30, kleur: 'bg-blue-400' },
      { naam: 'Literatuur', pct: 20, kleur: 'bg-blue-300' },
      { naam: 'Taalbeschouwing', pct: 20, kleur: 'bg-blue-200' },
    ],
    tips: [
      'Lezen + Luisteren = 60% → dit is je grootste winst',
      'Communicatiemodel vanbuiten: zender → boodschap → ontvanger → kanaal → context → doel → effect → ruis',
      'Stromingen: Middeleeuwen → Renaissance → Romantiek → Realisme → Naturalisme → Tachtigers → Modernisme → Vijftigers → Postmodernisme',
      'Stijlfiguren: metafoor, personificatie, hyperbool, anafoor, antithese, retorische vraag, paradox',
      'Feiten vs meningen: feiten zijn controleerbaar, meningen zijn subjectief',
    ],
  },
  {
    id: 'aard', vak: 'Aardrijkskunde', datum: '2026-05-06', start: '11:15', eind: '13:15',
    locatie: 'Examencentrum Conscience, Koning Albert II-laan 15, 1210 Brussel',
    emoji: '🌍', kleur: 'green',
    gewichten: [
      { naam: 'Het heelal', pct: 20, kleur: 'bg-green-500' },
      { naam: 'De atmosfeer', pct: 20, kleur: 'bg-green-400' },
      { naam: 'De geosfeer', pct: 20, kleur: 'bg-green-400' },
      { naam: 'Klimaatverandering', pct: 15, kleur: 'bg-green-300' },
      { naam: 'Ruimtelijke ordening', pct: 12.5, kleur: 'bg-emerald-300' },
      { naam: 'Landschapsanalyse', pct: 10, kleur: 'bg-teal-200' },
      { naam: 'Situeren', pct: 2.5, kleur: 'bg-teal-100' },
    ],
    tips: [
      'Je krijgt de Plantyn wereldatlas 2022 op het examen — gebruik hem ook bij je studie!',
      'Heelal + Atmosfeer + Geosfeer = 60% → prioriteit',
      'Bereken tijdverschillen, culminatiehoogte en afstanden (lichtseconde/lichtjaar/AE)',
      'Gesteenten bijlage kennen: graniet, basalt, kalksteen, marmer, leisteen...',
      'Platentektoniek: divergentie, convergentie, transforme beweging → aardbevingen, vulkanen, reliëf',
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

const STUDIEPLAN: StudieDag[] = [
  {
    datum: '2026-04-29', dag: 'Woensdag 29 april', beschikbaar: '~6 uur', isVandaag: true,
    taken: [
      { id: 'w29-1', vak: 'Aardrijkskunde', tijd: '3u', taak: 'Het Heelal: Big Bang, uitdijend heelal, afstandsmaten (lichtseconde / lichtjaar / AE), zonnestelsel (lagen zon, planeten, maan), aardrotatie (dag/nacht, tijdzones, corioliseffect), aardrevolutie (seizoenen, dagbogen, culminatiehoogte), schijngestalten maan, getijden, eclipsen' },
      { id: 'w29-2', vak: 'Nederlands', tijd: '3u', taak: 'Literatuurstromingen: Middeleeuwen → Renaissance → Romantiek → Realisme → Naturalisme → Tachtigers → Symbolisme → Expressionisme → Modernisme → Vijftigers → Postmodernisme. Per stroming: periode + kenmerken + 1 voorbeeld. Daarna stijlfiguren: metafoor, personificatie, hyperbool, anafoor, antithese, retorische vraag, paradox, enjambement' },
    ],
  },
  {
    datum: '2026-04-30', dag: 'Donderdag 30 april', beschikbaar: '~5 uur',
    taken: [
      { id: 'do30-1', vak: 'Aardrijkskunde', tijd: '3u', taak: 'De Atmosfeer: lagen (troposfeer/stratosfeer/mesosfeer/thermosfeer/exosfeer), temperatuurfactoren (breedteligging, hoogte, zeestromen), luchtdruk & winden (cycloon/anticycloon, passaat, ITCZ, corioliseffect, land-zeewinden), neerslag (hydrologische cyclus, convectieregens/stijgingsregens/frontale regens/moesson), klimaatzones & biomen, weerkaart lezen (fronten, isobaren)' },
      { id: 'do30-2', vak: 'Nederlands', tijd: '2u', taak: 'Taalbeschouwing: communicatiemodel (zender → boodschap → ontvanger → kanaal → context → doel → effect → ruis), feiten vs meningen, argumentatiesoorten (vergelijking/oorzaak-gevolg/autoriteit/cijfers), drogredenen, taalregisters (standaardtaal/dialect/tussentaal/jargon/jongerentaal)' },
    ],
  },
  {
    datum: '2026-05-01', dag: 'Vrijdag 1 mei', beschikbaar: '~8 uur',
    taken: [
      { id: 'vr1-1', vak: 'Aardrijkskunde', tijd: '4u', taak: 'De Geosfeer: opbouw (kern/mantel/lithosfeer/korst, discontinuïteiten Moho + Gutenberg), platentektoniek (divergentie/convergentie/transforme → aardbevingen/vulkanen/reliëf), gesteenten (bijlage! graniet, basalt, kalksteen, marmer, leisteen...), gesteentecyclus, verwering (fysisch/chemisch/biologisch), watererosie (V-dal/meanders/delta), glaciale erosie (U-dal/fjord/morene), winderosie (duin/löss), datering & geologische tijdschaal' },
      { id: 'vr1-2', vak: 'Nederlands', tijd: '2u', taak: 'Leesvaardigheid oefenen: open een krantenartikel op standaard.be of demorgen.be en oefen systematisch: (1) onderwerp in 1-2 woorden, (2) hoofdgedachte in 1 zin, (3) hoofdpunten opsommen, (4) tekstverbanden herkennen (oorzaak/gevolg/tegenstelling/vergelijking), (5) bronkritiek (wie is de zender? wat is het doel?)' },
      { id: 'vr1-3', vak: 'Nederlands', tijd: '2u', taak: 'Literatuur verhaalkenmerken: personage (protagonist/antagonist/vlak/rond), vertelperspectief (ik/personaal/auctorieel/onbetrouwbaar), opbouw (expositie→stijgende actie→climax→dalende actie→ontknoping), ruimte (geografisch/symbolisch), tijd (chronologisch/flashback/flashforward), poëzie (rijmschema, strofe, enjambement, volta)' },
    ],
  },
  {
    datum: '2026-05-02', dag: 'Zaterdag 2 mei', beschikbaar: '~3 uur (na werk)',
    taken: [
      { id: 'za2-1', vak: 'Aardrijkskunde', tijd: '2u', taak: 'Klimaatverandering: geologisch (Milanković-variabelen: excentriciteit/obliquiteit/precessie, vulkanen, Pangea), huidig (broeikasgassen: CO₂/CH₄/N₂O, oorzaken concentratiewijziging, versterkt broeikaseffect), gevolgen (zeespiegelstijging, extremer weer, ontdooien permafrost), positieve/negatieve terugkoppelingen, IPCC-scenario\'s, adaptatie vs mitigatie' },
      { id: 'za2-2', vak: 'Aardrijkskunde', tijd: '1u', taak: 'Begrippen herhalen: maak flitskaartjes of test jezelf op de begrippen van Heelal + Atmosfeer' },
    ],
  },
  {
    datum: '2026-05-03', dag: 'Zondag 3 mei', beschikbaar: '~3 uur',
    taken: [
      { id: 'zo3-1', vak: 'Aardrijkskunde', tijd: '2u', taak: 'Ruimtelijke ordening: verstedelijking (urbanisatie/suburbanisatie/rurbanisatie/re-urbanisatie/desurbanisatie), gewestplan vs RSV vs BRV, problemen van niet-duurzame ordening (lintbebouwing, verharding, urban sprawl, sociale segregatie, hitte-eiland effect), duurzaam ruimtegebruik (intensivering/hergebruik/verweving/tijdelijk gebruik), bouwshift' },
      { id: 'zo3-2', vak: 'Nederlands', tijd: '1u', taak: 'Snelle zelftest: stromingen (noem per stroming 2 kenmerken), stijlfiguren (geef een voorbeeld van elk), communicatiemodel uit het hoofd' },
    ],
  },
  {
    datum: '2026-05-04', dag: 'Maandag 4 mei', beschikbaar: '~8 uur',
    taken: [
      { id: 'ma4-1', vak: 'Aardrijkskunde', tijd: '3u', taak: 'Grote herhaling aardrijkskunde: rekensommen (tijdverschil berekenen, culminatiehoogte van de zon, afstanden in het heelal omrekenen), landschapsanalyse (satellietbeelden lezen, weerkaart interpreteren), alle begrippen die je twijfelachtig vindt herhalen, gesteentebijlage nog eens controleren' },
      { id: 'ma4-2', vak: 'Nederlands', tijd: '3u', taak: 'Volledige Nederlandse oefening: (1) lees 2-3 teksten van vrt.be of standaard.be en analyseer elk volledig, (2) beluister een nieuwsitem op vrt.be/vrtnws en beantwoord: onderwerp/hoofdgedachte/hoofdpunten, (3) oefen communicatiemodel op een reclame of sociale media post' },
      { id: 'ma4-3', vak: 'Beide', tijd: '2u', taak: 'Canvas oefenexamens maken die lijken op de echte examens + zwakste punten bijwerken' },
    ],
  },
  {
    datum: '2026-05-05', dag: 'Dinsdag 5 mei — dag voor examen', beschikbaar: '~3 uur (avond)',
    taken: [
      { id: 'di5-1', vak: 'Aardrijkskunde', tijd: '1u', taak: 'Lichte herhaling: bijlage gesteenten één keer overlopen, begrippen doorlopen die je twijfelachtig vindt. GEEN nieuwe stof.' },
      { id: 'di5-2', vak: 'Nederlands', tijd: '1u', taak: 'Literaire stromingen één keer nalezen + communicatiemodel herhalen + stijlfiguren. GEEN nieuw materiaal studeren.' },
      { id: 'di5-3', vak: 'Rust', tijd: '—', taak: 'Klaar leggen: identiteitskaart, pen, kladpapier. Adres: Examencentrum Conscience, Koning Albert II-laan 15, 1210 Brussel. Vroeg slapen — beide examens beginnen \'s ochtends!' },
    ],
  },
  {
    datum: '2026-05-06', dag: 'Woensdag 6 mei — EXAMENDAG', beschikbaar: '—', isExamendag: true,
    taken: [
      { id: 'wo6-1', vak: 'Nederlands', tijd: '08:30–10:30', taak: 'EXAMEN Nederlands 1 — Examencentrum Conscience, Brussel. Goed ontbijten, op tijd vertrekken.' },
      { id: 'wo6-2', vak: 'Pauze', tijd: '10:30–11:15', taak: 'Pauze tussen examens: eet iets, drink water. Max 5 minuten notities bekijken, daarna stoppen.' },
      { id: 'wo6-3', vak: 'Aardrijkskunde', tijd: '11:15–13:15', taak: 'EXAMEN Aardrijkskunde — Examencentrum Conscience, Brussel. Je krijgt de atlas — gebruik hem!' },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getVakKleur(vak: string): string {
  if (vak === 'Aardrijkskunde') return 'bg-green-100 text-green-800 border-green-200'
  if (vak === 'Nederlands') return 'bg-blue-100 text-blue-800 border-blue-200'
  if (vak === 'Rust') return 'bg-amber-50 text-amber-800 border-amber-200'
  return 'bg-purple-100 text-purple-800 border-purple-200'
}

function getExamenKleur(kleur: string): string {
  const map: Record<string, string> = {
    blue: 'border-l-blue-500 bg-blue-50',
    green: 'border-l-green-500 bg-green-50',
    orange: 'border-l-orange-400 bg-orange-50',
    purple: 'border-l-purple-400 bg-purple-50',
    red: 'border-l-red-400 bg-red-50',
  }
  return map[kleur] ?? 'border-l-gray-400 bg-gray-50'
}

function getDaysUntil(datum: string): number {
  const target = new Date(datum)
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

// ─── Components ───────────────────────────────────────────────────────────────

function Countdown() {
  const [timeLeft, setTimeLeft] = useState({ dagen: 0, uren: 0, minuten: 0, seconden: 0 })

  useEffect(() => {
    function tick() {
      const target = new Date('2026-05-06T08:30:00')
      const diff = target.getTime() - Date.now()
      if (diff <= 0) { setTimeLeft({ dagen: 0, uren: 0, minuten: 0, seconden: 0 }); return }
      setTimeLeft({
        dagen: Math.floor(diff / 86400000),
        uren: Math.floor((diff % 86400000) / 3600000),
        minuten: Math.floor((diff % 3600000) / 60000),
        seconden: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="bg-gradient-to-r from-blue-600 to-green-600 rounded-2xl p-6 text-white text-center">
      <p className="text-sm font-semibold uppercase tracking-widest opacity-80 mb-2">Volgende examen</p>
      <p className="text-xl font-bold mb-4">Nederlands 1 — woensdag 6 mei, 08:30</p>
      <div className="flex justify-center gap-4">
        {[
          { val: timeLeft.dagen, label: 'dagen' },
          { val: timeLeft.uren, label: 'uren' },
          { val: timeLeft.minuten, label: 'min' },
          { val: timeLeft.seconden, label: 'sec' },
        ].map(({ val, label }) => (
          <div key={label} className="bg-white/20 rounded-xl px-4 py-3 min-w-[72px]">
            <div className="text-3xl font-bold tabular-nums">{String(val).padStart(2, '0')}</div>
            <div className="text-xs opacity-75">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExamenKaart({ ex }: { ex: Examen }) {
  const [open, setOpen] = useState(ex.datum === '2026-05-06')
  const dagen = getDaysUntil(ex.datum)
  const past = dagen < 0

  return (
    <div className={`card border-l-4 ${getExamenKleur(ex.kleur)} p-0 overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{ex.emoji}</span>
          <div>
            <div className="font-bold text-gray-900">{ex.vak}</div>
            <div className="text-sm text-gray-500">
              {ex.datum.split('-').reverse().join('/')} · {ex.start}–{ex.eind}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {!past && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              dagen <= 7 ? 'bg-red-100 text-red-700' :
              dagen <= 30 ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {dagen === 0 ? 'VANDAAG' : `${dagen} dag${dagen !== 1 ? 'en' : ''}`}
            </span>
          )}
          {past && <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-bold">Afgelegd</span>}
          <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-warm-gray pt-4">
          <p className="text-sm text-gray-600 flex items-start gap-2">
            <span>📍</span> {ex.locatie}
          </p>

          {ex.gewichten.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Verdeling punten</p>
              <div className="flex rounded-lg overflow-hidden h-6 mb-2">
                {ex.gewichten.map((g) => (
                  <div key={g.naam} className={`${g.kleur} flex items-center justify-center text-white text-xs font-bold`} style={{ width: `${g.pct}%` }} title={`${g.naam}: ${g.pct}%`}>
                    {g.pct >= 15 ? `${g.pct}%` : ''}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {ex.gewichten.map((g) => (
                  <span key={g.naam} className="flex items-center gap-1 text-xs text-gray-600">
                    <span className={`w-2.5 h-2.5 rounded-sm ${g.kleur}`} />
                    {g.naam} {g.pct}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {ex.tips.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
              <p className="text-xs font-semibold text-amber-800 mb-1.5">Tips</p>
              {ex.tips.map((tip, i) => (
                <p key={i} className="text-sm text-amber-900 flex items-start gap-2">
                  <span className="text-amber-500 flex-shrink-0">→</span> {tip}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StudiePlanDag({ dag, voltooid, onToggle }: {
  dag: StudieDag
  voltooid: Set<string>
  onToggle: (id: string) => void
}) {
  const [open, setOpen] = useState(dag.isVandaag ?? dag.isExamendag ?? false)
  const aantalKlaar = dag.taken.filter((t) => voltooid.has(t.id)).length
  const alle = dag.taken.length
  const pct = alle > 0 ? Math.round((aantalKlaar / alle) * 100) : 0

  const bgClass = dag.isExamendag
    ? 'border-red-300 bg-red-50'
    : dag.isVandaag
    ? 'border-primary-400 bg-primary-50'
    : 'border-warm-gray bg-white'

  return (
    <div className={`rounded-2xl border-2 ${bgClass} overflow-hidden`}>
      <button onClick={() => setOpen(!open)} className="w-full text-left px-5 py-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">{dag.dag}</span>
              {dag.isVandaag && <span className="text-xs bg-primary-500 text-white px-2 py-0.5 rounded-full font-bold">VANDAAG</span>}
              {dag.isExamendag && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">EXAMEN</span>}
            </div>
            <span className="text-xs text-gray-500">{dag.beschikbaar}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {!dag.isExamendag && (
            <span className={`text-xs font-semibold ${aantalKlaar === alle ? 'text-green-600' : 'text-gray-500'}`}>
              {aantalKlaar}/{alle}
            </span>
          )}
          <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </button>

      {!dag.isExamendag && alle > 0 && (
        <div className="h-1 bg-gray-200">
          <div className="h-full bg-green-500 transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}

      {open && (
        <div className="px-5 py-4 space-y-3 border-t border-warm-gray">
          {dag.taken.map((taak) => {
            const done = voltooid.has(taak.id)
            const vakKleur = getVakKleur(taak.vak)
            return (
              <div
                key={taak.id}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${done ? 'bg-green-50 border-green-200 opacity-75' : 'bg-white border-warm-gray'}`}
              >
                {!dag.isExamendag && (
                  <button
                    onClick={() => onToggle(taak.id)}
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'}`}
                  >
                    {done && <span className="text-xs font-bold">✓</span>}
                  </button>
                )}
                {dag.isExamendag && (
                  <span className="text-xl flex-shrink-0 mt-0.5">
                    {taak.vak === 'Nederlands' ? '📝' : taak.vak === 'Aardrijkskunde' ? '🌍' : '⏸️'}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${vakKleur}`}>
                      {taak.vak}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">{taak.tijd}</span>
                  </div>
                  <p className={`text-sm leading-relaxed ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                    {taak.taak}
                  </p>
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
  const [canvasUrl, setCanvasUrl] = useState('')
  const [editingCanvas, setEditingCanvas] = useState(false)
  const [canvasInput, setCanvasInput] = useState('')
  const [activeTab, setActiveTab] = useState<'plan' | 'examens' | 'vakinfo' | 'links'>('plan')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('examen-voltooid')
      if (saved) setVoltooid(new Set(JSON.parse(saved)))
      const cv = localStorage.getItem('canvas-url')
      if (cv) setCanvasUrl(cv)
    } catch { /* ignore */ }
  }, [])

  const toggleTaak = useCallback((id: string) => {
    setVoltooid((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      try { localStorage.setItem('examen-voltooid', JSON.stringify([...next])) } catch { /* ignore */ }
      return next
    })
  }, [])

  const saveCanvas = () => {
    setCanvasUrl(canvasInput)
    try { localStorage.setItem('canvas-url', canvasInput) } catch { /* ignore */ }
    setEditingCanvas(false)
  }

  const alleTaken = STUDIEPLAN.flatMap((d) => d.taken.filter((t) => t.vak !== 'Rust' && !d.isExamendag))
  const totaalKlaar = alleTaken.filter((t) => voltooid.has(t.id)).length
  const totaalPct = alleTaken.length > 0 ? Math.round((totaalKlaar / alleTaken.length) * 100) : 0

  const tabs = [
    { id: 'plan', label: 'Studieplan', emoji: '📅' },
    { id: 'examens', label: 'Examens', emoji: '🗓️' },
    { id: 'vakinfo', label: 'Vakinfo', emoji: '📖' },
    { id: 'links', label: 'Links & tools', emoji: '🔗' },
  ] as const

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <div className="bg-white border-b border-warm-gray sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <div>
              <h1 className="font-bold text-gray-900 leading-tight">Examencommissie Board</h1>
              <p className="text-xs text-gray-500">3de graad doorstroom — 2026</p>
            </div>
          </div>
          <Link href="/dashboard" className="text-sm text-primary-600 hover:underline font-medium">
            Taalplatform →
          </Link>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1 pb-0 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{tab.emoji}</span> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* Countdown — always visible */}
        <Countdown />

        {/* Overall progress */}
        <div className="card py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-800 text-sm">Studieplan voortgang</span>
            <span className="text-sm font-bold text-primary-600">{totaalKlaar}/{alleTaken.length} taken</span>
          </div>
          <div className="h-3 bg-warm-gray rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all" style={{ width: `${totaalPct}%` }} />
          </div>
          <p className="text-xs text-gray-500 mt-1">{totaalPct}% van het studieplan voltooid</p>
        </div>

        {/* TAB: Studieplan */}
        {activeTab === 'plan' && (
          <div className="space-y-3">
            <h2 className="font-bold text-gray-900 text-lg">Dag-per-dag studieplan</h2>
            {STUDIEPLAN.map((dag) => (
              <StudiePlanDag key={dag.datum} dag={dag} voltooid={voltooid} onToggle={toggleTaak} />
            ))}
          </div>
        )}

        {/* TAB: Examens */}
        {activeTab === 'examens' && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Aankomende examens</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              <strong>Locatie alle examens:</strong> Examencentrum Conscience, Koning Albert II-laan 15, 1210 Brussel<br/>
              <strong>Meebrengen:</strong> identiteitskaart · pen · geen gsm in examenruimte · geen cursusmateriaal
            </div>
            {EXAMENS.map((ex) => <ExamenKaart key={ex.id} ex={ex} />)}
          </div>
        )}

        {/* TAB: Vakinfo */}
        {activeTab === 'vakinfo' && (
          <div className="space-y-6">
            {/* Nederlands */}
            <div>
              <h2 className="font-bold text-gray-900 text-lg mb-3">📝 Nederlands 1 — 6 mei, 08:30</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { titel: 'Lezen (30%)', kleur: 'blue', items: ['Onderwerp bepalen (1-2 woorden)', 'Hoofdgedachte (1 zin)', 'Hoofdpunten opsommen', 'Info selecteren', 'Tekstverbanden herkennen (oorzaak/gevolg/tegenstelling/vergelijking)', 'Bronbetrouwbaarheid beoordelen (zender, doel, kanaal, nepnieuws)', 'Notities nemen'] },
                  { titel: 'Luisteren (30%)', kleur: 'blue', items: ['Zelfde vaardigheden als lezen', 'Oefen op: vrt.be/vrtnws, podcasts', 'Let op signaalwoorden (ten eerste, bovendien, echter, dus)', 'Notities nemen terwijl je luistert'] },
                  { titel: 'Literatuur (20%)', kleur: 'indigo', items: ['Stromingen: Middeleeuwen → Renaissance → Romantiek → Realisme → Naturalisme → Tachtigers → Symbolisme → Expressionisme → Modernisme → Vijftigers → Postmodernisme', 'Stijlfiguren: metafoor, personificatie, hyperbool, anafoor, antithese, paradox, retorische vraag, enjambement', 'Verhaalkenmerken: personage, vertelperspectief, opbouw (spanningsboog), ruimte, tijd', 'Poëzie: rijmschema, strofe, volta', 'Dramatiek: theatertekens'] },
                  { titel: 'Taalbeschouwing (20%)', kleur: 'violet', items: ['Communicatiemodel: zender → boodschap → ontvanger → kanaal → context → doel → effect → ruis', 'Feiten vs meningen', 'Taalregisters: standaardtaal/dialect/tussentaal/jargon/jongerentaal', 'Stereotypering op basis van taal', 'Non-verbale communicatie', 'IMS-tekststructuur (Inleiding/Midden/Slot)', 'Argumentatiestructuur: stelling + argumenten + conclusie'] },
                ].map((blok) => (
                  <div key={blok.titel} className={`card border-l-4 border-l-${blok.kleur}-400 p-4`}>
                    <h3 className={`font-bold text-${blok.kleur}-700 mb-2 text-sm`}>{blok.titel}</h3>
                    <ul className="space-y-1">
                      {blok.items.map((item, i) => (
                        <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                          <span className="text-gray-400 flex-shrink-0 mt-0.5">·</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Aardrijkskunde */}
            <div>
              <h2 className="font-bold text-gray-900 text-lg mb-3">🌍 Aardrijkskunde — 6 mei, 11:15</h2>
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 mb-3">
                <strong>Je krijgt de Plantyn wereldatlas 2022 op het examen!</strong> Gebruik hem ook bij het studeren. Er zijn ook gesloten én open vragen.
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { titel: 'Het heelal (20%)', items: ['Big Bang, uitdijend heelal, big crunch/rip/chill', 'Afstandsmaten: lichtseconde / lichtminuut / lichtjaar / AE', 'Zonnestelsel: lagen van de zon, planeten, maan', 'Aardrotatie: dag/nacht, tijdzones, corioliseffect', 'Aardrevolutie: seizoenen, dagbogen, culminatiehoogte berekenen', 'Schijngestalten maan, getijden (eb/vloed/springtij/doodtij), eclipsen'] },
                  { titel: 'De atmosfeer (20%)', items: ['Lagen: troposfeer → stratosfeer → mesosfeer → thermosfeer → exosfeer', 'Temperatuurfactoren: breedteligging, hoogte, zeestromen, ligging t.o.v. zee', 'Luchtdruk: cycloon/anticycloon, ITCZ, passaat, corioliseffect, land-zeewinden', 'Neerslag: hydrologische cyclus, convectie-, stijgings-, frontale regens, moesson', 'Klimaatzones & biomen', 'Weerkaart lezen: fronten, isobaren, windkracht/richting'] },
                  { titel: 'De geosfeer (20%)', items: ['Opbouw: kern/mantel/lithosfeer/korst, discontinuïteiten Moho + Gutenberg', 'Platentektoniek: divergentie/convergentie/transforme → aardbevingen/vulkanen/reliëf', 'Gesteenten bijlage: graniet, basalt, kalksteen, marmer, leisteen... herkennen!', 'Gesteentecyclus, verwering (fysisch/chemisch/biologisch)', 'Erosie: water (V-dal/meanders/delta), glaciaal (U-dal/fjord/morene), wind (duin/löss)', 'Datering & geologische tijdschaal'] },
                  { titel: 'Klimaatverandering (15%)', items: ['Geologisch: Milanković (excentriciteit/obliquiteit/precessie), vulkanen, Pangea', 'Huidig: broeikasgassen (CO₂/CH₄/N₂O), versterkt broeikaseffect', 'Gevolgen: zeespiegelstijging, extremer weer, ontdooien permafrost', 'Positieve/negatieve terugkoppelingen', 'IPCC-scenario\'s, adaptatie vs mitigatie'] },
                  { titel: 'Ruimtelijke ordening (12,5%)', items: ['Verstedelijking: urbanisatie/suburbanisatie/rurbanisatie/re-urbanisatie/desurbanisatie', 'Gewestplan → RSV → BRV (evolutie)', 'Problemen: lintbebouwing, verharding, urban sprawl, sociale segregatie, hitte-eiland', 'Duurzaam: intensivering/hergebruik/verweving/tijdelijk gebruik', 'Bouwshift: van verdere uitbreiding naar hergebruik bestaande ruimte'] },
                  { titel: 'Landschapsanalyse (10%)', items: ['Satellietbeelden: ware en valse kleurenbeelden lezen', 'Fysisch + sociaaleconomisch landschap analyseren', 'Geopunt gebruiken', 'SDG\'s toepassen op een gebied', 'Interacties tussen sferen (geosfeer/atmosfeer/hydrosfeer/biosfeer) uitleggen'] },
                ].map((blok) => (
                  <div key={blok.titel} className="card border-l-4 border-l-green-400 p-4">
                    <h3 className="font-bold text-green-700 mb-2 text-sm">{blok.titel}</h3>
                    <ul className="space-y-1">
                      {blok.items.map((item, i) => (
                        <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                          <span className="text-gray-400 flex-shrink-0 mt-0.5">·</span> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB: Links & tools */}
        {activeTab === 'links' && (
          <div className="space-y-6">

            {/* Canvas */}
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-xl">🖥️</span> Canvas oefenexamens
              </h3>
              {canvasUrl ? (
                <div className="space-y-3">
                  <a href={canvasUrl} target="_blank" rel="noopener noreferrer"
                    className="btn-primary w-full text-center block">
                    Open Canvas Instructure →
                  </a>
                  <button onClick={() => { setCanvasInput(canvasUrl); setEditingCanvas(true) }}
                    className="text-sm text-gray-500 hover:underline">
                    URL wijzigen
                  </button>
                </div>
              ) : editingCanvas ? (
                <div className="space-y-3">
                  <input
                    type="url" value={canvasInput}
                    onChange={(e) => setCanvasInput(e.target.value)}
                    placeholder="https://jouwschool.instructure.com/..."
                    className="input w-full"
                  />
                  <div className="flex gap-2">
                    <button onClick={saveCanvas} className="btn-primary text-sm px-4 py-2">Opslaan</button>
                    <button onClick={() => setEditingCanvas(false)} className="btn-secondary text-sm px-4 py-2">Annuleren</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Voeg je Canvas-link toe om snel naar je oefenexamens te gaan.</p>
                  <button onClick={() => setEditingCanvas(true)} className="btn-primary text-sm px-4 py-2">
                    Canvas-link toevoegen
                  </button>
                </div>
              )}
            </div>

            {/* CEV platform */}
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-xl">🏛️</span> Examencommissie
              </h3>
              <div className="space-y-2">
                {[
                  { label: 'Kandidatenplatform (agenda, spreekopdracht)', url: 'https://examencommissiesecundaironderwijs.be' },
                  { label: 'Oefenexamen digitale vraagtypes', url: 'https://www.vlaanderen.be/examencommissiesecundaironderwijs/voorbereiding' },
                  { label: 'Online woordenboek Van Dale', url: 'https://vandale.be' },
                ].map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary-600 hover:underline">
                    <span>→</span> {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Nederlands links */}
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-xl">📝</span> Nederlands — studie-sites
              </h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  { label: 'Literatuurgeschiedenis.org', url: 'https://www.literatuurgeschiedenis.org/', tip: 'Stromingen van Middeleeuwen tot heden' },
                  { label: 'Literaire canon (BE)', url: 'https://literairecanon.be/', tip: 'Belangrijkste Nederlandstalige werken' },
                  { label: 'Cambiumned.nl', url: 'https://www.cambiumned.nl/', tip: 'Theorie + oefeningen taalsysteem' },
                  { label: 'De Standaard', url: 'https://www.standaard.be/', tip: 'Leesoefeningen (echte teksten)' },
                  { label: 'De Morgen', url: 'https://www.demorgen.be/', tip: 'Leesoefeningen (echte teksten)' },
                  { label: 'VRT Nieuws (luisteren)', url: 'https://www.vrt.be/vrtnws/nl/', tip: 'Luistervaardigheid oefenen' },
                  { label: 'Taaladvies.net', url: 'https://taaladvies.net/', tip: 'Spelling & taaladvies' },
                  { label: 'Poeziecentrum.be', url: 'https://www.poeziecentrum.be/', tip: 'Poëzie bestuderen' },
                ].map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="block border border-warm-gray rounded-xl p-3 hover:border-blue-300 hover:bg-blue-50 transition-colors">
                    <div className="text-sm font-medium text-blue-700">{link.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{link.tip}</div>
                  </a>
                ))}
              </div>
            </div>

            {/* Aardrijkskunde links */}
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-xl">🌍</span> Aardrijkskunde — studie-sites
              </h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  { label: 'Geopunt.be', url: 'https://www.geopunt.be/', tip: 'GIS-viewer voor Vlaanderen (op examen!)' },
                  { label: 'Klimaatverandering IPCC', url: 'https://www.ipcc.ch/', tip: 'Officiële IPCC-rapporten' },
                  { label: 'NASA Earth Observatory', url: 'https://earthobservatory.nasa.gov/', tip: 'Satellietbeelden & klimaat' },
                  { label: 'Ruimtelijke ordening Vlaanderen', url: 'https://omgeving.vlaanderen.be/', tip: 'BRV, bouwshift, ruimtebeleid' },
                ].map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                    className="block border border-warm-gray rounded-xl p-3 hover:border-green-300 hover:bg-green-50 transition-colors">
                    <div className="text-sm font-medium text-green-700">{link.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{link.tip}</div>
                  </a>
                ))}
              </div>
            </div>

            {/* Taalplatform */}
            <div className="card bg-primary-50 border-primary-200">
              <h3 className="font-bold text-primary-800 mb-2 flex items-center gap-2">
                <span>🇫🇷🇬🇧</span> Taalplatform (Frans & Engels)
              </h3>
              <p className="text-sm text-primary-700 mb-3">Frans 1 en Engels 1 staan gepland later. Oefen alvast via het taalplatform.</p>
              <Link href="/dashboard" className="btn-primary text-sm px-4 py-2 inline-block">
                Open taalplatform →
              </Link>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
