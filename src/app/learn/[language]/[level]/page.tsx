'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase, getProgress } from '@/lib/supabase'
import { getLevelContent, LEVEL_LABELS, LANGUAGE_LABELS, AVAILABLE_LEVELS } from '@/lib/content'
import type { LevelContent, TopicProgress, Language, Level } from '@/lib/types'
import Navigation from '@/components/Navigation'

export default function LevelPage() {
  const params = useParams()
  const router = useRouter()
  const language = params.language as Language
  const level = params.level as Level

  const [content, setContent] = useState<LevelContent | null>(null)
  const [progress, setProgress] = useState<TopicProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/auth/login'); return }
      const [lvl, prog] = await Promise.all([
        getLevelContent(language, level),
        getProgress(data.session.user.id).catch(() => []),
      ])
      setContent(lvl)
      setProgress(prog)
      setLoading(false)
    })
  }, [language, level, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!content) {
    return (
      <>
        <Navigation backHref="/dashboard" backLabel="Dashboard" />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <p className="text-gray-500">Niveau niet gevonden.</p>
        </main>
      </>
    )
  }

  const levelProgress = progress.filter((p) => p.language === language && p.level === level)
  const completedTopics = levelProgress.filter((p) => p.completed)
  const allDone = content.topics.length > 0 && completedTopics.length >= content.topics.length
  const totalScore = completedTopics.reduce((s, p) => s + (p.score ?? 0), 0)
  const totalMax = completedTopics.reduce((s, p) => s + (p.max_score ?? 0), 0)
  const avgPct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0
  const readyForNext = allDone && avgPct >= 70

  const availableLevels = AVAILABLE_LEVELS[language] ?? []
  const currentIdx = availableLevels.indexOf(level)
  const nextLevel: Level | null = currentIdx >= 0 && currentIdx < availableLevels.length - 1
    ? availableLevels[currentIdx + 1]
    : null

  return (
    <>
      <Navigation
        backHref="/dashboard"
        backLabel="Dashboard"
        title={`${LANGUAGE_LABELS[language]} — ${level.toUpperCase().replace('BPLUS', 'B+')}`}
      />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <span className="tag-level mb-2">
            {level.toUpperCase().replace('BPLUS', 'B+')}
          </span>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">{content.title}</h1>
          <p className="text-gray-500 mt-1">{content.description}</p>
        </div>

        <div className="space-y-3">
          {content.topics.map((topic, i) => {
            const tp = progress.find(
              (p) => p.language === language && p.level === level && p.topic_id === topic.id
            )
            return (
              <Link
                key={topic.id}
                href={`/learn/${language}/${level}/${topic.id}`}
                className="card flex items-center gap-4 hover:shadow-md transition-shadow group"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  tp?.completed ? 'bg-green-100 text-green-700' : 'bg-primary-100 text-primary-700'
                }`}>
                  {tp?.completed ? '✓' : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary-700 transition-colors">
                    {topic.title}
                  </h3>
                  <p className="text-gray-500 text-sm truncate">{topic.description}</p>
                </div>
                {tp?.completed && tp.score !== undefined && (
                  <span className="text-sm font-medium text-green-600 flex-shrink-0">
                    {tp.score}/{tp.max_score}
                  </span>
                )}
                <span className="text-gray-300 group-hover:text-primary-400 transition-colors flex-shrink-0">→</span>
              </Link>
            )
          })}
        </div>

        {readyForNext && nextLevel && (
          <div className="card bg-green-50 border-2 border-green-300 text-center space-y-3 py-6">
            <div className="text-3xl">🏆</div>
            <h3 className="font-bold text-green-800 text-lg">
              Uitstekend! Je scoort gemiddeld {avgPct}% op {level.toUpperCase().replace('BPLUS', 'B+')}.
            </h3>
            <p className="text-green-700 text-sm">
              Je bent klaar om een stapje hoger te gaan. Probeer nu {LEVEL_LABELS[nextLevel]}.
            </p>
            <Link href={`/learn/${language}/${nextLevel}`} className="btn-primary inline-block px-6">
              Ga naar {nextLevel.toUpperCase().replace('BPLUS', 'B+')} →
            </Link>
          </div>
        )}

        {allDone && !readyForNext && (
          <div className="card bg-amber-50 border border-amber-200 text-center space-y-2 py-5">
            <p className="text-amber-800 font-semibold">
              Je hebt alle topics afgerond (gemiddeld {avgPct}%).
            </p>
            <p className="text-amber-700 text-sm">
              Oefen de topics nog eens om je score te verbeteren voor je naar het volgende niveau gaat.
            </p>
          </div>
        )}
      </main>
    </>
  )
}
