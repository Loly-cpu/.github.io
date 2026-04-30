'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, getProgress } from '@/lib/supabase'
import { AVAILABLE_LEVELS, LEVEL_LABELS, LANGUAGE_LABELS, LANGUAGE_FLAGS } from '@/lib/content'
import { loadPlacementResult } from '@/lib/placement'
import type { Language, Level, TopicProgress } from '@/lib/types'
import type { PlacementResult } from '@/lib/placement'


const TOPIC_COUNTS: Partial<Record<string, number>> = {
  'fr-a0': 6,
  'fr-a1': 8,
  'fr-a2': 6,
  'en-a1': 4,
  'en-a2': 6,
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
      try {
        const p = await getProgress(uid)
        setProgress(p)
      } catch { /* no progress yet */ }

      const langs = Object.keys(AVAILABLE_LEVELS) as Language[]
      const results: Partial<Record<Language, PlacementResult>> = {}
      for (const lang of langs) {
        const r = loadPlacementResult(lang)
        if (r) results[lang] = r
      }
      setPlacements(results)
      setLoading(false)
    })
  }, [router])

  function completedCount(lang: Language, level: Level) {
    return progress.filter((p) => p.language === lang && p.level === level && p.completed).length
  }

  function progressPct(lang: Language, level: Level) {
    const done = completedCount(lang, level)
    const total = TOPIC_COUNTS[`${lang}-${level}`] ?? 0
    return total > 0 ? Math.round((done / total) * 100) : 0
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="page-fullbleed">
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welkom terug!</h1>
          <p className="text-gray-500">Kies een taal en niveau om te beginnen of verder te gaan.</p>
        </div>

        {(Object.keys(AVAILABLE_LEVELS) as Language[]).map((lang) => {
          const placement = placements[lang]
          const recommendedLevel = placement?.recommendedLevel

          return (
            <section key={lang}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {LANGUAGE_FLAGS[lang]} {LANGUAGE_LABELS[lang]}
                </h2>
                <Link
                  href={`/placement/${lang}`}
                  className="text-sm text-primary-600 hover:underline font-medium"
                >
                  {placement ? 'Test opnieuw' : '🎯 Doe de plaatsingstest'}
                </Link>
              </div>

              {!placement && (
                <Link
                  href={`/placement/${lang}`}
                  className="block mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 hover:bg-amber-100 transition-colors"
                >
                  <span className="font-semibold">Weet je niet waar te beginnen?</span> Doe de gratis plaatsingstest en ontdek welk niveau het beste bij jou past — in 10 vragen. →
                </Link>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                {AVAILABLE_LEVELS[lang].map((level) => {
                  const done = completedCount(lang, level)
                  const pct = progressPct(lang, level)
                  const isRecommended = level === recommendedLevel

                  return (
                    <Link
                      key={level}
                      href={`/learn/${lang}/${level}`}
                      className={`card hover:shadow-md transition-shadow group flex flex-col gap-3 relative ${
                        isRecommended ? 'border-2 border-primary-400' : ''
                      }`}
                    >
                      {isRecommended && (
                        <div className="absolute -top-2.5 left-4 bg-primary-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          Aanbevolen voor jou
                        </div>
                      )}
                      <div className="flex items-start justify-between">
                        <span className="tag-level">
                          {level.toUpperCase().replace('BPLUS', 'B+')}
                        </span>
                        {done > 0 && (
                          <span className="text-green-600 text-sm font-medium">{done} afgerond</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-primary-700 transition-colors">
                          {LEVEL_LABELS[level]}
                        </h3>
                      </div>
                      <div className="h-1.5 bg-warm-gray rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-primary-600 font-medium text-sm group-hover:underline">
                        {done > 0 ? `Verder leren — ${pct}% →` : 'Beginnen →'}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </section>
          )
        })}
      </main>
    </div>
  )
}
