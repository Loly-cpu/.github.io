'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase, upsertProgress, getProgress } from '@/lib/supabase'
import { getTopic, getLevelContent, AVAILABLE_LEVELS, LANGUAGE_LABELS } from '@/lib/content'
import type { Topic, Language, Level, LevelContent, TopicProgress } from '@/lib/types'
import CourseSidebar from '@/components/CourseSidebar'
import ExerciseContainer from '@/components/ExerciseContainer'
import ExplainButton from '@/components/ExplainButton'
import TextToSpeech from '@/components/TextToSpeech'

const LANG_CODE: Record<string, 'fr-FR' | 'en-GB'> = { fr: 'fr-FR', en: 'en-GB' }

export default function TopicPage() {
  const params = useParams()
  const router = useRouter()
  const language = params.language as Language
  const level = params.level as Level
  const topicId = params.topicId as string

  const [topic, setTopic] = useState<Topic | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [progress, setProgress] = useState<TopicProgress[]>([])
  const [levelContent, setLevelContent] = useState<Partial<Record<Level, LevelContent>>>({})
  const [tab, setTab] = useState<'theory' | 'exercises'>('theory')
  const [result, setResult] = useState<{ score: number; max: number } | null>(null)
  const [loading, setLoading] = useState(true)

  const lang = LANG_CODE[language] ?? 'fr-FR'

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/auth/login'); return }
      setUserId(data.session.user.id)

      const levels = AVAILABLE_LEVELS[language] ?? []
      const [topicData, prog, ...contents] = await Promise.all([
        getTopic(language, level, topicId),
        getProgress(data.session.user.id).catch(() => [] as TopicProgress[]),
        ...levels.map((l) => getLevelContent(language, l)),
      ])

      setTopic(topicData)
      setProgress(prog)
      const contentMap: Partial<Record<Level, LevelContent>> = {}
      levels.forEach((l, i) => { if (contents[i]) contentMap[l] = contents[i]! })
      setLevelContent(contentMap)
      setLoading(false)
    })
  }, [language, level, topicId, router])

  async function handleComplete(score: number, max: number) {
    setResult({ score, max })
    if (!userId) return
    const updated = await upsertProgress({ userId, language, level, topicId, completed: true, score, maxScore: max })
      .then(() => getProgress(userId))
      .catch(() => progress)
    setProgress(updated)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!topic) {
    return (
      <div className="flex min-h-screen">
        <CourseSidebar language={language} currentLevel={level} progress={progress} levelContent={levelContent} />
        <main className="flex-1 px-6 py-8 md:pt-8 pt-16">
          <p className="text-gray-500">Onderwerp niet gevonden.</p>
        </main>
      </div>
    )
  }

  const topicContext = topic.theory
    .filter((b) => b.type === 'text' || b.type === 'note')
    .map((b) => ('content' in b ? b.content : ''))
    .join('\n')

  return (
    <div className="flex min-h-screen bg-cream">
      <CourseSidebar
        language={language}
        currentLevel={level}
        currentTopicId={topicId}
        progress={progress}
        levelContent={levelContent}
      />

      <main className="flex-1 min-w-0 md:pt-0 pt-14">
        {/* Top bar */}
        <div className="bg-white border-b border-warm-gray px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{LANGUAGE_LABELS[language]}</span>
            <span>›</span>
            <span>{level.toUpperCase().replace('BPLUS', 'B+')}</span>
            <span>›</span>
            <span className="text-gray-900 font-medium truncate">{topic.title}</span>
          </div>
          <ExplainButton language={language} level={level} topicTitle={topic.title} topicContext={topicContext} />
        </div>

        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <div>
            <span className="tag-level mb-2">{level.toUpperCase().replace('BPLUS', 'B+')}</span>
            <h1 className="text-2xl font-bold mt-2">{topic.title}</h1>
            <p className="text-gray-500 mt-1">{topic.description}</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-warm-gray">
            {(['theory', 'exercises'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 font-semibold text-sm border-b-2 -mb-px transition-colors ${
                  tab === t
                    ? 'border-primary-500 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'theory' ? '📖 Theorie' : '✏️ Oefeningen'}
              </button>
            ))}
          </div>

          {tab === 'theory' && (
            <div className="space-y-6">
              {topic.theory.map((block, i) => {
                if (block.type === 'text') {
                  return <p key={i} className="theory-text">{block.content}</p>
                }
                if (block.type === 'note') {
                  return (
                    <div key={i} className="bg-amber-50 border-l-4 border-amber-400 px-4 py-3 rounded-r-xl">
                      <p className="text-amber-900 text-sm font-medium">📌 {block.content}</p>
                    </div>
                  )
                }
                if (block.type === 'table') {
                  return (
                    <div key={i} className="overflow-x-auto rounded-xl border border-warm-gray">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr>
                            {block.headers.map((h, hi) => (
                              <th key={hi} className="text-left px-3 py-2.5 bg-primary-50 text-primary-800 font-semibold border-b-2 border-primary-200">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {block.rows.map((row, ri) => (
                            <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              {row.map((cell, ci) => (
                                <td key={ci} className="px-3 py-2.5 border-b border-warm-gray text-gray-700">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                }
                if (block.type === 'example') {
                  return (
                    <div key={i} className="space-y-2">
                      {block.pairs.map((pair, pi) => (
                        <div key={pi} className="flex items-start gap-3 bg-white border border-warm-gray rounded-xl px-4 py-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="font-semibold text-gray-800">{pair.left}</span>
                            <TextToSpeech text={pair.left} lang={lang as 'fr-FR' | 'en-GB'} />
                          </div>
                          <span className="text-gray-400 flex-shrink-0">→</span>
                          <span className="text-gray-600 flex-1">{pair.right}</span>
                        </div>
                      ))}
                    </div>
                  )
                }
                return null
              })}
              <button onClick={() => setTab('exercises')} className="btn-primary w-full">
                Naar de oefeningen →
              </button>
            </div>
          )}

          {tab === 'exercises' && !result && (
            <ExerciseContainer exercises={topic.exercises} language={language} onComplete={handleComplete} />
          )}

          {tab === 'exercises' && result && (
            <div className="card text-center space-y-4">
              <div className="text-5xl font-bold text-primary-600">{result.score}/{result.max}</div>
              <h2 className="text-xl font-bold">
                {result.score === result.max ? '🎉 Perfect! Alle oefeningen correct!' :
                 result.score >= result.max / 2 ? '👍 Goed gedaan!' : '💪 Blijf oefenen!'}
              </h2>
              <div className="flex gap-3 justify-center flex-wrap">
                <button onClick={() => setResult(null)} className="btn-secondary">
                  Opnieuw oefenen
                </button>
                <button onClick={() => router.push(`/learn/${language}/${level}`)} className="btn-primary">
                  Terug naar overzicht
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
