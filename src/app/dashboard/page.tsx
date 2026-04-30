'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, getProgress } from '@/lib/supabase'
import { AVAILABLE_LEVELS, LEVEL_LABELS, LANGUAGE_LABELS, LANGUAGE_FLAGS } from '@/lib/content'
import { loadPlacementResult } from '@/lib/placement'
import type { Language, Level, TopicProgress } from '@/lib/types'
import type { PlacementResult } from '@/lib/placement'

const FB = '#1877F2'

const TOPIC_COUNTS: Partial<Record<string, number>> = {
  'fr-a0': 6, 'fr-a1': 8, 'fr-a2': 6, 'en-a1': 4, 'en-a2': 6,
}

const LANG_COLOR: Record<string, string> = {
  fr: '#003189', en: '#012169',
}
const LANG_BG: Record<string, string> = {
  fr: 'linear-gradient(135deg, #002395 0%, #ED2939 100%)',
  en: 'linear-gradient(135deg, #012169 0%, #C8102E 100%)',
}

export default function DashboardPage() {
  const router = useRouter()
  const [progress, setProgress] = useState<TopicProgress[]>([])
  const [placements, setPlacements] = useState<Partial<Record<Language, PlacementResult>>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/auth/login'); return }
      const uid = data.session.user.id
      try { const p = await getProgress(uid); setProgress(p) } catch { /* no progress yet */ }
      const langs = Object.keys(AVAILABLE_LEVELS) as Language[]
      const results: Partial<Record<Language, PlacementResult>> = {}
      for (const lang of langs) { const r = loadPlacementResult(lang); if (r) results[lang] = r }
      setPlacements(results)
      setLoading(false)
    })
  }, [router])

  function completedCount(lang: Language, level: Level) {
    return progress.filter(p => p.language === lang && p.level === level && p.completed).length
  }
  function progressPct(lang: Language, level: Level) {
    const done = completedCount(lang, level)
    const total = TOPIC_COUNTS[`${lang}-${level}`] ?? 0
    return total > 0 ? Math.round((done / total) * 100) : 0
  }

  if (loading) return (
    <div className="page-fullbleed" style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: 32, height: 32, border: `4px solid ${FB}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', fontFamily: 'var(--fb-font)' }}>

      {/* Page header — FB Groups style */}
      <div className="fb-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ height: 120, background: 'linear-gradient(135deg, #1877F2 0%, #42A5F5 100%)' }} />
        <div style={{ padding: '0 20px 16px', display: 'flex', alignItems: 'flex-end', gap: 16, marginTop: -32 }}>
          <div style={{ width: 80, height: 80, borderRadius: 8, background: '#fff', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, boxShadow: '0 2px 8px rgba(0,0,0,.15)', flexShrink: 0 }}>🌐</div>
          <div style={{ flex: 1, paddingBottom: 4 }}>
            <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#1C1E21' }}>Taalplatform</h1>
            <p style={{ margin: 0, fontSize: 14, color: '#65676B' }}>Oefen Frans en Engels op jouw niveau · CEV Examenvoorbereiding</p>
          </div>
        </div>
      </div>

      {/* Languages */}
      {(Object.keys(AVAILABLE_LEVELS) as Language[]).map((lang) => {
        const placement = placements[lang]
        const recommendedLevel = placement?.recommendedLevel

        return (
          <div key={lang} style={{ marginBottom: 24 }}>
            {/* Language header — FB group cover style */}
            <div className="fb-card" style={{ overflow: 'hidden', marginBottom: 12 }}>
              <div style={{ height: 80, background: LANG_BG[lang] ?? 'linear-gradient(135deg, #1877F2, #42A5F5)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12 }}>
                <span style={{ fontSize: 36 }}>{LANGUAGE_FLAGS[lang]}</span>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,.3)' }}>{LANGUAGE_LABELS[lang]}</h2>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <p style={{ margin: 0, fontSize: 14, color: '#65676B' }}>
                  {placement ? `Niveau: ${placement.recommendedLevel?.toUpperCase()}` : 'Nog geen plaatsingstest gedaan'}
                </p>
                <Link href={`/placement/${lang}`}
                  style={{ background: '#E4E6EB', color: '#1C1E21', borderRadius: 6, padding: '7px 14px', fontSize: 14, fontWeight: 700, textDecoration: 'none', transition: 'background .12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#D8DADF')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#E4E6EB')}>
                  {placement ? 'Test opnieuw' : '🎯 Plaatsingstest'}
                </Link>
              </div>
            </div>

            {!placement && (
              <Link href={`/placement/${lang}`}
                style={{ display: 'block', marginBottom: 12, background: '#FFF3CD', border: '1px solid #FFD54F', borderRadius: 8, padding: '12px 16px', textDecoration: 'none' }}>
                <p style={{ margin: 0, fontSize: 14, color: '#795548', fontWeight: 600 }}>
                  💡 Weet je niet waar te beginnen? Doe de gratis plaatsingstest in 10 vragen →
                </p>
              </Link>
            )}

            {/* Level cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {AVAILABLE_LEVELS[lang].map((level) => {
                const done = completedCount(lang, level)
                const total = TOPIC_COUNTS[`${lang}-${level}`] ?? 0
                const pct = progressPct(lang, level)
                const isRecommended = level === recommendedLevel

                return (
                  <Link key={level} href={`/learn/${lang}/${level}`} style={{ textDecoration: 'none' }}>
                    <div className="fb-card" style={{
                      margin: 0, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow .15s',
                      border: isRecommended ? `2px solid ${FB}` : '2px solid transparent',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.15)')}
                      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,.1)')}>

                      {isRecommended && (
                        <div style={{ background: FB, color: '#fff', fontSize: 12, fontWeight: 700, padding: '5px 12px', textAlign: 'center' }}>
                          ⭐ Aanbevolen voor jou
                        </div>
                      )}

                      <div style={{ padding: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <span style={{ background: LANG_COLOR[lang] ?? FB, color: '#fff', borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 800, letterSpacing: '0.05em' }}>
                            {level.toUpperCase().replace('BPLUS', 'B+')}
                          </span>
                          {done > 0 && <span style={{ fontSize: 13, color: '#22c55e', fontWeight: 600 }}>✓ {done}/{total}</span>}
                        </div>

                        <p style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 700, color: '#1C1E21' }}>{LEVEL_LABELS[level]}</p>

                        <div style={{ height: 6, background: '#E4E6EB', borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: FB, borderRadius: 6, transition: 'width .4s ease' }} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, color: '#65676B' }}>{pct}% voltooid</span>
                          <span style={{ fontSize: 14, fontWeight: 700, color: FB }}>{done > 0 ? 'Verdergaan →' : 'Starten →'}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
