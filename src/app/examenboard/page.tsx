'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PomodoroTimer from '@/components/PomodoroTimer'

// ─── Canvas types ──────────────────────────────────────────────────────────────

interface CanvasItemReq { type: string; completed: boolean; min_score: number | null }
interface CanvasItem    { id: number; title: string; type: string; url: string; req: CanvasItemReq | null }
interface CanvasModule  { id: number; name: string; url: string; items: CanvasItem[] }
interface CanvasCourse  {
  id: number; name: string; url: string
  pct: number | null; doneCount: number; totalCount: number; hasTracking: boolean
  modules: CanvasModule[]
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Gewicht { naam: string; pct: number; kleur: string }
interface Examen {
  id: string; vak: string; datum: string; start: string; eind: string
  locatie: string; gewichten: Gewicht[]; tips: string[]; kleur: string; emoji: string
}
interface Taak {
  id: string; vak: string; tijd: string; taak: string
  canvas?: string; canvasUrl?: string; priority?: 'hoog' | 'medium' | 'laag'
}
interface StudieDag {
  datum: string; dag: string; beschikbaar: string; taken: Taak[]
  isExamendag?: boolean
}

// ─── Exam data ────────────────────────────────────────────────────────────────

const CEV_LOCATIE = 'Examencentrum Conscience, Koning Albert II-laan 15, 1210 Brussel'

const EXAMENS: Examen[] = [
  {
    id: 'aard', vak: 'Aardrijkskunde', datum: '2026-05-06', start: '11:15', eind: '13:15',
    locatie: CEV_LOCATIE, emoji: '🌍', kleur: 'green',
    gewichten: [
      { naam: 'Heelal',             pct: 20,   kleur: 'bg-green-600' },
      { naam: 'Atmosfeer',          pct: 20,   kleur: 'bg-green-500' },
      { naam: 'Geosfeer',           pct: 20,   kleur: 'bg-green-400' },
      { naam: 'Klimaatverandering', pct: 15,   kleur: 'bg-emerald-400' },
      { naam: 'Ruimtelijke ord.',   pct: 12.5, kleur: 'bg-teal-400' },
      { naam: 'Landschapsanalyse',  pct: 10,   kleur: 'bg-teal-300' },
      { naam: 'Situeren',           pct: 2.5,  kleur: 'bg-teal-200' },
    ],
    tips: [
      'Je krijgt de Plantyn wereldatlas 2022 — gebruik hem ook bij het studeren',
      'Heelal reeks A al gedaan — vandaag B, C, D afwerken',
      'Heelal + Atmosfeer + Geosfeer = 60% — dit zijn de drie grote blokken',
      'Proefexamens genereren elke keer een nieuw examen — maak er minimum 3',
    ],
  },
  {
    id: 'ned1', vak: 'Nederlands 1', datum: '2026-05-29', start: '11:15', eind: '13:15',
    locatie: CEV_LOCATIE, emoji: '📝', kleur: 'blue',
    gewichten: [
      { naam: 'Lezen',           pct: 30, kleur: 'bg-blue-500' },
      { naam: 'Luisteren',       pct: 30, kleur: 'bg-blue-400' },
      { naam: 'Literatuur',      pct: 20, kleur: 'bg-indigo-400' },
      { naam: 'Taalbeschouwing', pct: 20, kleur: 'bg-violet-300' },
    ],
    tips: [
      '23 dagen na aardrijkskunde — eerste focus is aard, dan volledig Nederlands',
      'Lezen + Luisteren = 60% — meeste punten haal je hier',
      '6/8 op literatuur algemeen — stijlfiguren en poëziebegrippen zijn de rest',
      'Proefexamens A, B, C, D beschikbaar op Canvas INZICHT PLUS',
    ],
  },
  {
    id: 'bedeco', vak: 'Bedrijfseconomie', datum: '2026-08-21', start: '11:45', eind: '13:45',
    locatie: CEV_LOCATIE, emoji: '💼', kleur: 'orange', gewichten: [], tips: [],
  },
  {
    id: 'eng1', vak: 'Engels 1', datum: '2026-09-02', start: '11:15', eind: '13:15',
    locatie: CEV_LOCATIE, emoji: '🇬🇧', kleur: 'indigo',
    gewichten: [
      { naam: 'Lezen',     pct: 50, kleur: 'bg-indigo-500' },
      { naam: 'Luisteren', pct: 50, kleur: 'bg-indigo-300' },
    ],
    tips: [
      'Alleen lezen (50%) + luisteren (50%) — geen schrijven of spreken op examen 1',
      'Niveau B1+ vereist — gebruik De Studie Factorie cursus op Canvas',
      'Taalplatform op dit platform heeft A1/A2 oefeningen ter voorbereiding',
    ],
  },
  {
    id: 'natuur', vak: 'Natuurwetenschappen', datum: '2026-09-18', start: '11:45', eind: '14:15',
    locatie: CEV_LOCATIE, emoji: '🔬', kleur: 'purple', gewichten: [], tips: [],
  },
  {
    id: 'sameco', vak: 'Samenleving en economie', datum: '2026-09-24', start: '11:15', eind: '13:15',
    locatie: CEV_LOCATIE, emoji: '🏛️', kleur: 'amber', gewichten: [], tips: [],
  },
  {
    id: 'wisk', vak: 'Wiskunde gevorderd 1', datum: '2026-09-28', start: '11:45', eind: '14:15',
    locatie: CEV_LOCATIE, emoji: '📐', kleur: 'red', gewichten: [], tips: [],
  },
  {
    id: 'algeco', vak: 'Algemene economie', datum: '2026-10-12', start: '11:15', eind: '13:15',
    locatie: CEV_LOCATIE, emoji: '📊', kleur: 'teal', gewichten: [], tips: [],
  },
]

// ─── Study plan ───────────────────────────────────────────────────────────────

const CANVAS_AARD = 'https://canvas.instructure.com/courses/12731557'
const CANVAS_NED  = 'https://canvas.instructure.com/courses/12361937'

const STUDIEPLAN: StudieDag[] = [
  // ── BLOK 1: Aardrijkskunde (6 mei) ──────────────────────────────────────────
  {
    datum: '2026-04-29', dag: 'Woensdag 29 april', beschikbaar: '~6 uur',
    taken: [
      { id: 'w29-1', vak: 'Aardrijkskunde', tijd: '3u', priority: 'hoog',
        canvas: 'INZICHT → het heelal → reeksen B, C, D', canvasUrl: CANVAS_AARD,
        taak: 'INZICHT PLUS aardrijkskunde → "het heelal" cursus als snelle herhaling, dan reeksen B, C, D (reeks A al klaar). Focus: afstandsmaten, aardrotatie (tijdzones, corioliseffect), aardrevolutie (culminatiehoogte berekenen), maan en eclipsen.' },
      { id: 'w29-2', vak: 'Aardrijkskunde', tijd: '3u', priority: 'hoog',
        canvas: 'INZICHT → de atmosfeer → cursus + reeks A', canvasUrl: CANVAS_AARD,
        taak: 'INZICHT PLUS → "cursus atmosfeer & het weer" doorlopen, daarna reeks A. Focus: lagen atmosfeer, temperatuurfactoren, luchtdruk (cycloon/anticycloon, ITCZ, passaat), neerslagtypen, klimaatzones & biomen.' },
    ],
  },
  {
    datum: '2026-04-30', dag: 'Donderdag 30 april', beschikbaar: '~5 uur',
    taken: [
      { id: 'do30-1', vak: 'Aardrijkskunde', tijd: '3u', priority: 'hoog',
        canvas: 'INZICHT → atmosfeer reeksen B, C, D + geosfeer cursus', canvasUrl: CANVAS_AARD,
        taak: 'INZICHT PLUS → atmosfeer reeksen B, C, D afwerken. Daarna "cursus geosfeer" starten. Focus atmosfeer: weerkaart lezen (fronten, isobaren, windrichting). Focus geosfeer: opbouw aarde, discontinuïteiten Moho & Gutenberg.' },
      { id: 'do30-2', vak: 'Aardrijkskunde', tijd: '2u', priority: 'hoog',
        canvas: 'INZICHT → geosfeer reeksen A, B', canvasUrl: CANVAS_AARD,
        taak: 'INZICHT PLUS → geosfeer reeksen A en B. Focus: platentektoniek (divergentie/convergentie/transforme), aardbevingen (Richter/MMS, hypo/epicentrum), vulkanen (strato/schildvulkaan), gesteenten bijlage kennen.' },
    ],
  },
  {
    datum: '2026-05-01', dag: 'Vrijdag 1 mei', beschikbaar: '~8 uur',
    taken: [
      { id: 'vr1-1', vak: 'Aardrijkskunde', tijd: '4u', priority: 'hoog',
        canvas: 'INZICHT → geosfeer reeksen C, D, E, F + klimaatverandering cursus', canvasUrl: CANVAS_AARD,
        taak: 'INZICHT PLUS → geosfeer reeksen C–F. Daarna klimaatverandering cursus. Focus geosfeer: gesteentecyclus, verwering, erosie (water/ijs/wind), geologische tijdschaal. Focus klimaat: Milanković, broeikasgassen, IPCC-scenario\'s.' },
      { id: 'vr1-2', vak: 'Aardrijkskunde', tijd: '2u', priority: 'hoog',
        canvas: 'INZICHT → klimaatverandering reeks A + ruimtelijke ordening cursus', canvasUrl: CANVAS_AARD,
        taak: 'INZICHT PLUS → klimaatverandering reeks A afwerken. Daarna ruimtelijke ordening cursus. Focus klimaat: positieve/negatieve terugkoppelingen, adaptatie vs mitigatie. Focus RO: urbanisatie-types, gewestplan → RSV → BRV.' },
      { id: 'vr1-3', vak: 'Aardrijkskunde', tijd: '2u', priority: 'medium',
        canvas: 'INZICHT → ruimtelijke ordening reeksen A, B', canvasUrl: CANVAS_AARD,
        taak: 'INZICHT PLUS → ruimtelijke ordening reeksen A + B. Focus: lintbebouwing, verharding, urban sprawl, bouwshift, duurzaam ruimtegebruik, SDG\'s toepassen.' },
    ],
  },
  {
    datum: '2026-05-02', dag: 'Zaterdag 2 mei', beschikbaar: '~3 uur (na werk)',
    taken: [
      { id: 'za2-1', vak: 'Aardrijkskunde', tijd: '1.5u', priority: 'hoog',
        canvas: 'INZICHT → landschapsanalyse cursus + reeks A', canvasUrl: CANVAS_AARD,
        taak: 'INZICHT PLUS → "cursus landschapsanalyse" doorlopen + reeks A. Focus: satellietbeelden (ware vs valse kleuren), Geopunt gebruiken, SDG\'s beoordelen, geografisch onderzoek.' },
      { id: 'za2-2', vak: 'Aardrijkskunde', tijd: '1.5u', priority: 'hoog',
        canvas: 'INZICHT → proefexamen (1e keer) + zwakste punten bijwerken', canvasUrl: CANVAS_AARD,
        taak: 'INZICHT PLUS → eerste proefexamen aardrijkskunde starten (elke keer nieuw examen). Na afloop: kijk wat je fout hebt en ga terug naar die specifieke cursus-onderdelen.' },
    ],
  },
  {
    datum: '2026-05-03', dag: 'Zondag 3 mei', beschikbaar: '~3 uur',
    taken: [
      { id: 'zo3-1', vak: 'Aardrijkskunde', tijd: '2u', priority: 'hoog',
        canvas: 'INZICHT → geosfeer reeksen G, H, I + atmosfeer D, E', canvasUrl: CANVAS_AARD,
        taak: 'INZICHT PLUS → geosfeer reeksen G, H, I (verdere verdieping). Daarna atmosfeer reeksen D + E als je tijd hebt. Dit zijn de reeksen die je vorige dagen niet volledig hebt afgewerkt.' },
      { id: 'zo3-2', vak: 'Aardrijkskunde', tijd: '1u', priority: 'medium',
        canvas: 'INZICHT → proefexamen (2e keer)', canvasUrl: CANVAS_AARD,
        taak: 'INZICHT PLUS → tweede proefexamen. Noteer opnieuw de zwakke punten. Niet langer dan 1 uur — tijd is beperkt.' },
    ],
  },
  {
    datum: '2026-05-04', dag: 'Maandag 4 mei', beschikbaar: '~8 uur',
    taken: [
      { id: 'ma4-1', vak: 'Aardrijkskunde', tijd: '3u', priority: 'hoog',
        canvas: 'INZICHT → herhaling zwakste blokken op basis van proefexamens', canvasUrl: CANVAS_AARD,
        taak: 'INZICHT PLUS → ga terug naar de blokken waar je punten verloor in de twee proefexamens. Maak de bijhorende extra oefenreeksen. Dit is de efficiëntste manier om bij te sturen.' },
      { id: 'ma4-2', vak: 'Aardrijkskunde', tijd: '2u', priority: 'hoog',
        canvas: 'INZICHT → proefexamen (3e en laatste)', canvasUrl: CANVAS_AARD,
        taak: 'INZICHT PLUS → derde proefexamen. Dit is je laatste echte oefening voor het examen. Meet je score en vergelijk met de vorige twee. Daarna STOPPEN met nieuwe stof.' },
      { id: 'ma4-3', vak: 'Aardrijkskunde', tijd: '1u', priority: 'medium',
        taak: 'Maak een persoonlijke "spiekbrief" (alleen voor studie): schrijf de formules, specifieke data en de gesteentenlijs van de bijlage op. Controleer of je Geopunt en de atlas kan gebruiken.' },
    ],
  },
  {
    datum: '2026-05-05', dag: 'Dinsdag 5 mei — dag voor aardrijkskunde', beschikbaar: '~3 uur (avond)',
    taken: [
      { id: 'di5-1', vak: 'Aardrijkskunde', tijd: '1u', priority: 'medium',
        canvas: 'INZICHT → vluchtig bekijken, niks nieuws meer', canvasUrl: CANVAS_AARD,
        taak: 'Maximaal 1 uur: blik over je spiekbrief + eventuele twijfelpunten. NIET meer studeren — je hebt het gedaan. Rust is nu productiver.' },
      { id: 'di5-2', vak: 'Voorbereiding', tijd: '15min', priority: 'hoog',
        taak: 'Klaarleggen: identiteitskaart, pen, kladpapier. Adres: Examencentrum Conscience, Koning Albert II-laan 15, 1210 Brussel. Examen start om 11:15 — op tijd vertrekken! Rekenmachine meenemen voor tijdzone/culminatiehoogte-berekeningen.' },
    ],
  },
  {
    datum: '2026-05-06', dag: 'Woensdag 6 mei — EXAMEN AARDRIJKSKUNDE', beschikbaar: '—', isExamendag: true,
    taken: [
      { id: 'wo6-1', vak: 'Aardrijkskunde', tijd: '11:15–13:15',
        taak: 'EXAMEN Aardrijkskunde — 120 min. Je krijgt de Plantyn atlas! Gebruik hem actief bij elke vraag. Rekenmachine beschikbaar voor berekeningen. Geopunt beschikbaar voor landschapsanalyse.' },
    ],
  },

  // ── Na examen: schoolverplichtingen ──────────────────────────────────────────
  {
    datum: '2026-05-07', dag: 'Donderdag 7 mei — SCHOOL EXAMEN', beschikbaar: '~4 uur (na examen)', isExamendag: true,
    taken: [
      { id: 'so07-ex', vak: 'School', tijd: '08:20–09:10',
        taak: '⚠️ SCHOOL EXAMEN: Schrijfopdracht opiniestuk "AI" (Nederlandsles BA Stassart). Dit is de dag ná je CEV-examen — lees dit bericht goed! Schrijf een overtuigend opiniestuk over AI. Je hebt net geoefend met stijlfiguren — gebruik die nu.' },
      { id: 'so07-1', vak: 'School', tijd: 'Na examen — 2u', priority: 'hoog',
        canvas: 'Smartschool → Aardrijkskunde → Planner → Geopunt opdracht',
        canvasUrl: 'https://bastassart.smartschool.be/planner/main/user/43_16564_0/2026-05-08/planned-assignments/43/299b308b-1793-448f-be6d-4145772234d8',
        taak: 'Na het school-examen: begin aan de Geopunt-opdracht (deadline 8 mei 12:50). "Dromen van een weekendje weg" — gebruik geopunt.be om een route/bestemming te zoeken. Je hebt dit net geoefend voor CEV.' },
    ],
  },

  // ── BLOK 2: Nederlands 1 (29 mei) ───────────────────────────────────────────
  {
    datum: '2026-05-08', dag: 'Vrijdag 8 mei', beschikbaar: '~4 uur',
    taken: [
      { id: 'n08-1', vak: 'Nederlands', tijd: '3u', priority: 'hoog',
        canvas: 'INZICHT → leerpad taalbeschouwing → taalvariatie + alineaverbanden', canvasUrl: CANVAS_NED,
        taak: 'INZICHT PLUS Nederlands → leerpad taalbeschouwing: "cursus taalvariatie" + test. Daarna leerpad taalgebruik: "cursus alineaverbanden" + test. Communicatiemodel vanbuiten kennen.' },
    ],
  },
  {
    datum: '2026-05-08', dag: 'Vrijdag 8 mei', beschikbaar: '~6 uur',
    taken: [
      { id: 'n08-1', vak: 'Nederlands', tijd: '3u', priority: 'hoog',
        canvas: 'INZICHT → leerpad taalsysteem → fonologie + extra oefeningen poëzie', canvasUrl: CANVAS_NED,
        taak: 'INZICHT PLUS → leerpad taalsysteem: "cursus fonologie" + test. Extra oefeningen: "Poëzie: dichtvormen" (9p) + "Poëzie: rijm en strofe" (15p). Dit zijn literaire begrippen die vaak terugkomen op het examen.' },
      { id: 'n08-2', vak: 'Nederlands', tijd: '3u', priority: 'hoog',
        canvas: 'INZICHT → extra leesoefeningen → Digi-taal + Nooit meer niksdoen', canvasUrl: CANVAS_NED,
        taak: 'INZICHT PLUS → extra digitale leesoefeningen: "Digi-taal" (13p) + "Nooit meer niksdoen" (11p). Dit zijn authentieke leesoefeningen die lijken op het examen. Oefen leesstrategie: (1) onderwerp, (2) hoofdgedachte, (3) hoofdpunten, (4) tekstverbanden.' },
    ],
  },
  {
    datum: '2026-05-14', dag: 'Donderdag 14 mei', beschikbaar: '~4 uur',
    taken: [
      { id: 'n14-1', vak: 'Nederlands', tijd: '2u', priority: 'hoog',
        canvas: 'INZICHT → extra oefeningen literaire termen → Proza + Verhaalkenmerken', canvasUrl: CANVAS_NED,
        taak: 'INZICHT PLUS → extra oefeningen: "Proza" (11p) + "Verhaalkenmerken: vertelperspectief" (4p) + "Literatuur algemeen" (herhaling). Focus op de begrippen die je vorig keer niet zeker kende.' },
      { id: 'n14-2', vak: 'Nederlands', tijd: '2u', priority: 'medium',
        canvas: 'INZICHT → taalbeschouwelijke termen oefeningen', canvasUrl: CANVAS_NED,
        taak: 'INZICHT PLUS → extra oefeningen taalbeschouwelijke termen. Herhaal communicatiemodel, taalregisters en drogredenen.' },
    ],
  },
  {
    datum: '2026-05-21', dag: 'Donderdag 21 mei', beschikbaar: '~4 uur',
    taken: [
      { id: 'n21-1', vak: 'Nederlands', tijd: '2u', priority: 'hoog',
        canvas: 'INZICHT → proefexamen A (42p)', canvasUrl: CANVAS_NED,
        taak: 'INZICHT PLUS Nederlands → proefexamen A (42p) volledig maken. Bekijk wat je fout hebt en ga terug naar de cursus voor die specifieke onderdelen.' },
      { id: 'n21-2', vak: 'Nederlands', tijd: '2u', priority: 'hoog',
        canvas: 'INZICHT → proefexamen B (25p)', canvasUrl: CANVAS_NED,
        taak: 'INZICHT PLUS Nederlands → proefexamen B (25p). Vergelijk je score met proefexamen A. Noteer de zwakste categorie.' },
    ],
  },
  {
    datum: '2026-05-26', dag: 'Dinsdag 26 mei', beschikbaar: '~4 uur',
    taken: [
      { id: 'n26-1', vak: 'Nederlands', tijd: '2u', priority: 'hoog',
        canvas: 'INZICHT → proefexamen C + D', canvasUrl: CANVAS_NED,
        taak: 'INZICHT PLUS → proefexamen C en/of D. Na elk examen: snel de fouten doorlopen en de juiste antwoorden inprenten.' },
      { id: 'n26-2', vak: 'Nederlands', tijd: '2u', priority: 'hoog',
        canvas: 'INZICHT → zwakste punten bijwerken op basis van alle proefexamens', canvasUrl: CANVAS_NED,
        taak: 'Ga terug naar de Canvas-modules voor de onderdelen waar je het meeste punten verloor over alle proefexamens heen. Dit is de meest gerichte voorbereiding.' },
    ],
  },
  {
    datum: '2026-05-28', dag: 'Donderdag 28 mei — dag voor Nederlands', beschikbaar: '~2 uur (avond)',
    taken: [
      { id: 'n28-1', vak: 'Nederlands', tijd: '45min', priority: 'medium',
        taak: 'Vluchtig de samenvatting/spiekbrief bekijken: stijlfiguren, communicatiemodel, tekstverbanden, literaire stromingen. NIET meer studeren — vertrouw op je voorbereiding.' },
      { id: 'n28-2', vak: 'Voorbereiding', tijd: '10min', priority: 'hoog',
        taak: 'Klaarleggen: identiteitskaart, pen. Adres: Examencentrum Conscience, Brussel. Examen start om 11:15. Vroeg slapen.' },
    ],
  },
  {
    datum: '2026-05-29', dag: 'Vrijdag 29 mei — EXAMEN NEDERLANDS 1', beschikbaar: '—', isExamendag: true,
    taken: [
      { id: 'ned29-1', vak: 'Nederlands', tijd: '11:15–13:15',
        taak: 'EXAMEN Nederlands 1 — 120 min. Lezen (30%) + Luisteren (30%) + Literatuur (20%) + Taalbeschouwing (20%). Online woordenboek beschikbaar. Neem de tijd voor elke tekst: onderwerp → hoofdgedachte → hoofdpunten → tekstverbanden.' },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getVakKleur(vak: string): string {
  if (vak === 'Aardrijkskunde') return 'bg-green-100 text-green-800 border-green-200'
  if (vak === 'Nederlands')     return 'bg-blue-100 text-blue-800 border-blue-200'
  if (vak === 'Voorbereiding')  return 'bg-amber-100 text-amber-800 border-amber-200'
  if (vak === 'Pauze')          return 'bg-gray-100 text-gray-700 border-gray-200'
  return 'bg-purple-100 text-purple-800 border-purple-200'
}

function getExamenBorder(kleur: string): string {
  const map: Record<string, string> = {
    blue: 'border-l-blue-500', green: 'border-l-green-500', orange: 'border-l-orange-400',
    purple: 'border-l-purple-400', red: 'border-l-red-400', indigo: 'border-l-indigo-500',
    amber: 'border-l-amber-400', teal: 'border-l-teal-500',
  }
  return map[kleur] ?? 'border-l-gray-400'
}

function getDaysUntil(datum: string): number {
  const target = new Date(datum); const now = new Date()
  now.setHours(0,0,0,0); target.setHours(0,0,0,0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

function isToday(datum: string) { return getDaysUntil(datum) === 0 }
function isPast(datum: string)  { return getDaysUntil(datum) < 0 }

function getNextExamen(): Examen | null {
  const now = new Date()
  now.setHours(0,0,0,0)
  return EXAMENS
    .filter((e) => new Date(e.datum) >= now)
    .sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime())[0] ?? null
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

  if (!next) return (
    <div className="bg-green-600 rounded-2xl p-6 text-white text-center">
      <p className="font-bold text-lg">Alle examens afgelegd 🎉</p>
    </div>
  )

  const colorClass = next.kleur === 'green'
    ? 'from-green-600 via-emerald-600 to-teal-600'
    : next.kleur === 'blue'
    ? 'from-blue-600 via-indigo-600 to-blue-500'
    : 'from-gray-700 via-gray-600 to-gray-700'

  return (
    <div className={`bg-gradient-to-br ${colorClass} rounded-2xl p-6 text-white text-center shadow-lg`}>
      <p className="text-xs font-bold uppercase tracking-widest opacity-75 mb-1">Volgende examen</p>
      <p className="text-lg font-bold mb-4">{next.emoji} {next.vak} — {next.datum.split('-').reverse().join('/')} om {next.start}</p>
      <div className="flex justify-center gap-3">
        {[{ v: t.d, l: 'dagen' }, { v: t.h, l: 'uren' }, { v: t.m, l: 'min' }, { v: t.s, l: 'sec' }].map(({ v, l }) => (
          <div key={l} className="bg-white/20 rounded-xl px-3 py-2.5 min-w-[60px]">
            <div className="text-2xl font-bold tabular-nums">{String(v).padStart(2,'0')}</div>
            <div className="text-xs opacity-70">{l}</div>
          </div>
        ))}
      </div>
      {/* Next upcoming exams */}
      <div className="flex justify-center gap-4 mt-4">
        {EXAMENS.filter(e => !isPast(e.datum) && e.datum !== next.datum).slice(0,2).map((e) => (
          <span key={e.id} className="text-xs bg-white/15 rounded-lg px-2.5 py-1">
            {e.emoji} {e.vak.split(' ')[0]} — {getDaysUntil(e.datum)}d
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── ExamenKaart ──────────────────────────────────────────────────────────────

function ExamenKaart({ ex }: { ex: Examen }) {
  const [open, setOpen] = useState(getDaysUntil(ex.datum) <= 14 && getDaysUntil(ex.datum) >= 0)
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
          {!past && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              dagen === 0 ? 'bg-red-100 text-red-700' :
              dagen <= 7  ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {dagen === 0 ? 'VANDAAG' : `${dagen}d`}
            </span>
          )}
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
                  <div key={g.naam} className={`${g.kleur} flex items-center justify-center text-white text-xs font-bold`}
                    style={{ width: `${g.pct}%` }} title={`${g.naam}: ${g.pct}%`}>
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
  const past  = isPast(dag.datum)
  const [open, setOpen] = useState(today || dag.isExamendag || (!past && getDaysUntil(dag.datum) <= 3))
  const taken = dag.taken.filter((t) => t.vak !== 'Voorbereiding')
  const klaar = taken.filter((t) => voltooid.has(t.id)).length
  const pct = taken.length > 0 ? Math.round((klaar / taken.length) * 100) : 0
  const allKlaar = klaar === taken.length && taken.length > 0

  // Determine block (aard vs ned)
  const hasAard = dag.taken.some(t => t.vak === 'Aardrijkskunde')
  const hasNed  = dag.taken.some(t => t.vak === 'Nederlands')
  const blockColor = dag.isExamendag && dag.datum === '2026-05-06'
    ? 'border-green-300 bg-green-50'
    : dag.isExamendag && dag.datum === '2026-05-29'
    ? 'border-blue-300 bg-blue-50'
    : dag.isExamendag
    ? 'border-red-300 bg-red-50'
    : today ? 'border-primary-400 bg-primary-50'
    : past && allKlaar ? 'border-green-300 bg-green-50'
    : past ? 'border-gray-200 bg-gray-50 opacity-80'
    : hasNed && !hasAard ? 'border-blue-200 bg-blue-50/30'
    : 'border-warm-gray bg-white'

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${blockColor}`}>
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
                        {taak.canvasUrl ? (
                          <a href={taak.canvasUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs text-indigo-700 font-medium hover:underline">{taak.canvas} ↗</a>
                        ) : (
                          <span className="text-xs text-indigo-700 font-medium">{taak.canvas}</span>
                        )}
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

// ─── Canvas progress widget ────────────────────────────────────────────────────

function CanvasProgress({ canvas, loading, error }: {
  canvas: CanvasCourse[] | null; loading: boolean; error: string | null
}) {
  const [expanded, setExpanded] = useState<number | null>(null)

  if (loading) return (
    <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
      <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      Canvas laden...
    </div>
  )

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
      <p className="font-semibold mb-1">Canvas kon niet geladen worden</p>
      <p className="text-xs font-mono break-all">{error}</p>
    </div>
  )

  if (!canvas || canvas.length === 0) return <p className="text-sm text-gray-500">Geen cursussen gevonden.</p>

  const typeIcon = (type: string) => {
    if (type === 'Quiz')         return '📝'
    if (type === 'ExternalTool') return '🔗'
    if (type === 'Page')         return '📄'
    if (type === 'Assignment')   return '✏️'
    if (type === 'File')         return '📎'
    return '•'
  }

  return (
    <div className="space-y-3">
      {canvas.map((course) => (
        <div key={course.id} className="border border-warm-gray rounded-xl overflow-hidden">
          {/* Course header */}
          <button
            onClick={() => setExpanded(expanded === course.id ? null : course.id)}
            className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-tight">{course.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {course.hasTracking
                  ? `${course.doneCount}/${course.totalCount} bijgehouden items · ${course.pct}%`
                  : `${course.modules.length} modules · voortgang niet getrackt door Canvas`
                }
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {course.hasTracking && course.pct !== null && (
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  course.pct === 100 ? 'bg-green-100 text-green-700' :
                  course.pct > 50 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}>{course.pct}%</span>
              )}
              <a href={course.url} target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-primary-600 hover:underline font-medium">
                Open ↗
              </a>
              <span className={`text-gray-400 text-xs transition-transform ${expanded === course.id ? 'rotate-180' : ''}`}>▼</span>
            </div>
          </button>

          {/* Progress bar (only when tracking) */}
          {course.hasTracking && (
            <div className="h-1 bg-gray-200">
              <div className="h-full bg-green-500" style={{ width: `${course.pct ?? 0}%` }} />
            </div>
          )}

          {/* Module list */}
          {expanded === course.id && (
            <div className="divide-y divide-warm-gray max-h-80 overflow-y-auto">
              {course.modules.map((mod) => (
                <div key={mod.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-gray-700">{mod.name}</p>
                    <a href={mod.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-indigo-500 hover:underline">→</a>
                  </div>
                  <div className="space-y-0.5">
                    {mod.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-2">
                        <span className="text-xs w-4 text-center flex-shrink-0">
                          {item.req
                            ? item.req.completed ? '✅' : '⬜'
                            : <span className="text-gray-300">{typeIcon(item.type)}</span>
                          }
                        </span>
                        <a href={item.url} target="_blank" rel="noopener noreferrer"
                          className={`text-xs hover:underline truncate ${
                            item.req?.completed ? 'text-gray-400 line-through' : 'text-gray-600'
                          }`}>
                          {item.title}
                        </a>
                        {item.req && !item.req.completed && item.req.min_score && (
                          <span className="text-xs text-amber-500 flex-shrink-0">min {item.req.min_score}pt</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      <p className="text-xs text-gray-400">
        INZICHT PLUS gebruikt externe oefentools — Canvas registreert individuele scores niet via de API.
        Directe links ↗ brengen je naar het juiste onderdeel in Canvas.
      </p>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ExamenBoard() {
  const router = useRouter()
  const [authed, setAuthed]     = useState<boolean | null>(null)  // null = loading
  const [voltooid, setVoltooid] = useState<Set<string>>(new Set())
  const [userId, setUserId]     = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'plan' | 'examens' | 'vakinfo' | 'links'>('plan')
  const [canvas, setCanvas]       = useState<CanvasCourse[] | null>(null)
  const [canvasError, setCanvasError] = useState<string | null>(null)
  const [canvasLoading, setCanvasLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auth guard + load tasks
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session?.user) { router.replace('/auth/login'); return }
      const uid = data.session.user.id
      setUserId(uid)
      setAuthed(true)
      const { data: rows } = await supabase
        .from('study_tasks').select('task_id')
        .eq('user_id', uid).eq('completed', true)
      if (rows) setVoltooid(new Set(rows.map((r: { task_id: string }) => r.task_id)))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fetch Canvas
  useEffect(() => {
    fetch('/api/canvas')
      .then((r) => r.json())
      .then((d) => { if (d.error) setCanvasError(d.error); else setCanvas(d.courses) })
      .catch((e) => setCanvasError(String(e)))
      .finally(() => setCanvasLoading(false))
  }, [])

  const saveToSupabase = useCallback(async (uid: string, id: string, done: boolean) => {
    await supabase.from('study_tasks').upsert({
      user_id: uid, task_id: id, completed: done, completed_at: done ? new Date().toISOString() : null,
    })
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

  // Show spinner while checking auth (prevents flash of private data)
  if (authed === null) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

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
                {userId
                  ? <span className="text-xs text-green-600 font-semibold">● Gesynchroniseerd</span>
                  : <span className="text-xs text-amber-600">● Lokaal opgeslagen</span>
                }
              </div>
            </div>
          </div>
          <Link href="/platform" className="text-sm text-primary-600 hover:underline font-medium hidden sm:block">
            ← Home
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

        {/* Overall progress */}
        <div className="card py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-gray-800 text-sm">Studieplan voortgang</span>
            <span className="text-sm font-bold text-primary-600">{totaalKlaar}/{alleTaken.length} taken · {totaalPct}%</span>
          </div>
          <div className="h-2.5 bg-warm-gray rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full transition-all duration-700" style={{ width: `${totaalPct}%` }} />
          </div>
          {!userId && (
            <p className="text-xs text-amber-600 mt-2">
              <Link href="/auth/login" className="underline">Inloggen</Link> om voortgang te synchroniseren.
            </p>
          )}
        </div>

        {/* ── PLAN ── */}
        {activeTab === 'plan' && (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
              <p className="text-sm text-blue-800 font-semibold mb-1">Twee blokken</p>
              <p className="text-sm text-blue-700">
                <strong>Blok 1:</strong> Aardrijkskunde — 6 mei (11:15) ·
                <strong> Blok 2:</strong> Nederlands 1 — 29 mei (11:15)
                <span className="ml-1 text-blue-500">— je hebt 23 extra dagen na aardrijkskunde voor Nederlands.</span>
              </p>
            </div>
            {STUDIEPLAN.map((dag) => (
              <StudiePlanDag key={dag.datum} dag={dag} voltooid={voltooid} onToggle={toggleTaak} />
            ))}
          </div>
        )}

        {/* ── EXAMENS ── */}
        {activeTab === 'examens' && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Geplande examens ({EXAMENS.length})</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 space-y-1">
              <p><strong>Locatie:</strong> Examencentrum Conscience, Koning Albert II-laan 15, 1210 Brussel</p>
              <p><strong>Meebrengen:</strong> identiteitskaart · pen · GEEN gsm, cursusmateriaal of samenvattingen</p>
              <p><strong>Je krijgt:</strong> kladpapier · hoofdtelefoon · (aardrijkskunde: Plantyn atlas 2022)</p>
            </div>
            {EXAMENS.map((ex) => <ExamenKaart key={ex.id} ex={ex} />)}
          </div>
        )}

        {/* ── VAKINFO ── */}
        {activeTab === 'vakinfo' && (
          <div className="space-y-6">
            {/* Aardrijkskunde */}
            <div>
              <h2 className="font-bold text-gray-900 text-lg mb-1">🌍 Aardrijkskunde — 6 mei, 11:15–13:15</h2>
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                Heelal reeks A al gedaan. Plantyn atlas beschikbaar op examen. Rekenmachine mag mee.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { titel: 'Heelal (20%)', border: 'border-l-green-600', items: ['Big Bang, uitdijend heelal', 'Afstandsmaten: lichtseconde/minuut/jaar/AE — berekeningen oefenen!', 'Zon (kern/stralingszone/fotosfeer/chromosfeer/corona), planeten', 'Aardrotatie: dag/nacht, tijdverschil berekenen, corioliseffect, dagboog', 'Aardrevolutie: seizoenen, culminatiehoogte berekenen (22/12, 21/3, 21/6, 23/9)', 'Maan: schijngestalten, getijden, eclipsen'] },
                  { titel: 'Atmosfeer (20%)', border: 'border-l-green-500', items: ['Lagen: tropo/strato/meso/thermo/exosfeer (T/dichtheid/druk)', 'Temperatuurfactoren: breedteligging, hoogte, zeestromen, ligging t.o.v. zee, albedo', 'Luchtdruk: cycloon/anticycloon, ITCZ, passaat, corioliseffect, straalstroom', 'Neerslag: convectie/stijging/frontale/moesson', 'Klimaatzones & biomen', 'Weerkaart: fronten (koud/warm/occlusie), isobaren, windrichting'] },
                  { titel: 'Geosfeer (20%)', border: 'border-l-green-400', items: ['Opbouw: binnenkern/buitenkern/mantel/lithosfeer/korst + Moho & Gutenberg', 'Platentektoniek: divergentie/convergentie/transforme', 'Aardbevingen (Richter, MMS, hypo/epicentrum), vulkanen (strato/schildvulkaan)', 'Gesteenten bijlage KENNEN: graniet, basalt, kalksteen, zandsteen, marmer, leisteen', 'Gesteentecyclus, verwering, Karst', 'Erosie: water (V-dal/meanders), glaciaal (U-dal/fjord/morene), wind (duin/löss)', 'Datering: gidsfossielen, geologische tijdschaal, massaextincties'] },
                  { titel: 'Klimaatverandering (15%)', border: 'border-l-emerald-500', items: ['Milanković (excentriciteit/obliquiteit/precessie), vulkanen, Pangea', 'Huidig: CO₂/CH₄/N₂O, versterkt broeikaseffect', 'Gevolgen: zeespiegelstijging, extremer weer, permafrost', 'Positieve (versterken) vs negatieve (afzwakken) terugkoppelingen', 'IPCC-scenario\'s, adaptatie vs mitigatie'] },
                  { titel: 'Ruimtelijke ordening (12,5%)', border: 'border-l-teal-500', items: ['Urbanisatie/suburbanisatie/rurbanisatie/re-urbanisatie/desurbanisatie', 'Gewestplan → RSV → BRV (evolutie)', 'Lintbebouwing, verharding, urban sprawl, hitte-eiland', 'Bouwshift: stop uitbreiden, hergebruik bestaande ruimte', 'SDG\'s toepassen'] },
                  { titel: 'Landschapsanalyse (10%)', border: 'border-l-teal-400', items: ['Satellietbeelden: ware vs valse kleuren', 'Geopunt gebruiken (beschikbaar op examen!)', 'Fysisch + sociaaleconomisch landschap analyseren', 'Interacties tussen sferen', 'Onderzoeksvraag beantwoorden'] },
                ].map((b) => (
                  <div key={b.titel} className={`card border-l-4 ${b.border} p-4`}>
                    <h3 className="font-bold text-gray-800 text-sm mb-2">{b.titel}</h3>
                    <ul className="space-y-1">{b.items.map((item, i) => <li key={i} className="text-xs text-gray-700 flex items-start gap-1.5"><span className="text-gray-400 flex-shrink-0">·</span>{item}</li>)}</ul>
                  </div>
                ))}
              </div>
            </div>

            {/* Nederlands */}
            <div>
              <h2 className="font-bold text-gray-900 text-lg mb-1">📝 Nederlands 1 — 29 mei, 11:15–13:15</h2>
              <p className="text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-3">
                6/8 op literatuur algemeen — goed fundament. Stijlfiguren + leesoefeningen zijn de prioriteit. 23 dagen na aardrijkskunde.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { titel: 'Lezen (30%)', border: 'border-l-blue-500', items: ['Onderwerp (1-2 woorden)', 'Hoofdgedachte (1 zin)', 'Hoofdpunten opsommen', 'Tekstverbanden: oorzaak/gevolg, tegenstelling, vergelijking, opsomming', 'Bronbetrouwbaarheid: zender, doel, kanaal, nepnieuws'] },
                  { titel: 'Luisteren (30%)', border: 'border-l-blue-400', items: ['Zelfde vaardigheden als lezen', 'Notities nemen terwijl je luistert', 'Signaalwoorden: ten eerste, bovendien, echter, dus, want, hoewel', 'Oefen: vrt.be/vrtnws nieuws, VRT Max documentaires'] },
                  { titel: 'Literatuur (20%)', border: 'border-l-indigo-500', items: ['Stijlfiguren: metafoor, personificatie, hyperbool, anafoor, antithese, paradox, retorische vraag', 'Verhaalkenmerken: personage, vertelperspectief (ik/personaal/auctorieel), opbouw', 'Poëzie: rijmschema, strofe, enjambement, volta', 'Dramatiek: theatertekens', 'Literaire stromingen (Canvas: literatuur algemeen)'] },
                  { titel: 'Taalbeschouwing (20%)', border: 'border-l-violet-500', items: ['Communicatiemodel: zender→boodschap→ontvanger→kanaal→context→doel→effect→ruis', 'Feiten vs meningen, drogredenen', 'Taalregisters: standaardtaal, dialect, tussentaal, jargon (Canvas: taalvariatie)', 'Alineaverbanden: oorzakelijk, chronologisch, tegenstellend, concluderend', 'Fonologie, woordsoorten, zinsdelen'] },
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

        {/* ── LINKS ── */}
        {activeTab === 'links' && (
          <div className="space-y-5">
            {/* Canvas */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">🖥️ Canvas — cursusvoortgang</h3>
                {!canvasLoading && !canvasError && (
                  <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" /> Live
                  </span>
                )}
              </div>
              <CanvasProgress canvas={canvas} loading={canvasLoading} error={canvasError} />
            </div>

            {/* Taalplatform + taalbronnen */}
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">🌐 Taalbronnen (Frans & Engels)</h3>
              <div className="space-y-2">
                {[
                  { label: 'Taalplatform — Frans & Engels oefeningen', url: '/dashboard', internal: true },
                  { label: 'Lingua.com — gratis taaloefeningen', url: 'https://lingua.com/nl/' },
                  { label: 'British Council Belgium — Engels oefeningen B1/B2', url: 'https://www.britishcouncil.be/' },
                  { label: 'Examencommissie.be — taalinformatie', url: 'https://examencommissie.be/' },
                ].map((l) => (
                  l.internal
                    ? <Link key={l.url} href={l.url} className="flex items-center gap-2 text-sm text-primary-600 hover:underline"><span>→</span>{l.label}</Link>
                    : <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary-600 hover:underline"><span>→</span>{l.label}</a>
                ))}
              </div>
            </div>

            {/* CEV */}
            <div className="card">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">🏛️ Examencommissie Vlaanderen</h3>
              <div className="space-y-2">
                {[
                  { label: 'Kandidatenplatform (agenda & planning)', url: 'https://examencommissie.vlaanderen.be/kandidaat/landingspagina' },
                  { label: 'Oefenexamen digitale vraagtypes', url: 'https://www.vlaanderen.be/examencommissiesecundaironderwijs/voorbereiding' },
                  { label: 'Geopunt (ook op examen beschikbaar!)', url: 'https://www.geopunt.be' },
                  { label: 'Van Dale woordenboek (toegestaan op examen)', url: 'https://vandale.be' },
                ].map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary-600 hover:underline">
                    <span>→</span>{l.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Exam overview */}
            <div className="card bg-gray-50">
              <h3 className="font-bold text-gray-800 mb-2 text-sm">📋 Alle geplande examens</h3>
              <div className="space-y-1">
                {EXAMENS.map((e) => {
                  const d = getDaysUntil(e.datum)
                  return (
                    <div key={e.id} className="flex items-center justify-between text-sm py-1 border-b border-warm-gray last:border-0">
                      <span>{e.emoji} {e.vak}</span>
                      <span className={`text-xs font-semibold ${d < 0 ? 'text-gray-400' : d <= 7 ? 'text-red-600' : 'text-gray-600'}`}>
                        {e.datum.split('-').reverse().join('/')} {d < 0 ? '(afgelegd)' : d === 0 ? 'VANDAAG' : `(${d}d)`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Pomodoro timer */}
      <PomodoroTimer />
    </div>
  )
}
