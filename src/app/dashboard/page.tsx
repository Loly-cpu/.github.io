'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, getProgress } from '@/lib/supabase'
import { AVAILABLE_LEVELS, LEVEL_LABELS, LANGUAGE_LABELS, LANGUAGE_FLAGS } from '@/lib/content'
import type { Language, Level, TopicProgress } from '@/lib/types'
import Navigation from '@/components/Navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [progress, setProgress] = useState<TopicProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/auth/login'); return }
      const uid = data.session.user.id
      setUserId(uid)
      try {
        const p = await getProgress(uid)
        setProgress(p)
      } catch { /* no progress yet */ }
      setLoading(false)
    })
  }, [router])

  function completedCount(lang: Language, level: Level) {
    return progress.filter(
      (p) => p.language === lang && p.level === level && p.completed
    ).length
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <Navigation title="Mijn voortgang" />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Welkom terug!</h1>
          <p className="text-gray-500">Kies een taal en niveau om te beginnen of verder te gaan.</p>
        </div>

        {(Object.keys(AVAILABLE_LEVELS) as Language[]).map((lang) => (
          <section key={lang}>
            <h2 className="text-xl font-bold mb-4">
              {LANGUAGE_FLAGS[lang]} {LANGUAGE_LABELS[lang]}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {AVAILABLE_LEVELS[lang].map((level) => {
                const done = completedCount(lang, level)
                return (
                  <Link
                    key={level}
                    href={`/learn/${lang}/${level}`}
                    className="card hover:shadow-md transition-shadow group flex flex-col gap-3"
                  >
                    <div className="flex items-start justify-between">
                      <span className="tag-level">{level.toUpperCase()}</span>
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
                        style={{ width: done > 0 ? '40%' : '0%' }}
                      />
                    </div>
                    <span className="text-primary-600 font-medium text-sm group-hover:underline">
                      {done > 0 ? 'Verder leren →' : 'Beginnen →'}
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </main>
    </>
  )
}
