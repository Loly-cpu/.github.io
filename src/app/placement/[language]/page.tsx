'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Language, Level } from '@/lib/types'
import {
  PLACEMENT_QUESTIONS,
  calculateRecommendedLevel,
  savePlacementResult,
} from '@/lib/placement'
import { LEVEL_LABELS, LANGUAGE_LABELS, LANGUAGE_FLAGS, AVAILABLE_LEVELS } from '@/lib/content'


export default function PlacementPage() {
  const params = useParams()
  const router = useRouter()
  const language = params.language as Language
  const questions = PLACEMENT_QUESTIONS[language] ?? []

  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<{
    recommendedLevel: Level
    scores: Record<string, number>
  } | null>(null)

  function handleSelect(idx: number) {
    if (selected !== null) return
    setSelected(idx)
  }

  function handleNext() {
    if (selected === null) return
    const q = questions[current]
    const newAnswers = { ...answers, [q.id]: selected }
    setAnswers(newAnswers)
    setSelected(null)

    if (current + 1 < questions.length) {
      setCurrent(current + 1)
    } else {
      const { recommendedLevel, scores } = calculateRecommendedLevel(language, newAnswers)
      savePlacementResult({ language, recommendedLevel, scores, date: new Date().toISOString() })
      setResult({ recommendedLevel, scores })
    }
  }

  if (!questions.length) {
    return (
      <>
        
        <main className="max-w-2xl mx-auto px-4 py-8">
          <p className="text-gray-500">Taal niet gevonden.</p>
        </main>
      </>
    )
  }

  if (result) {
    const available = AVAILABLE_LEVELS[language] ?? []
    const targetLevel = available.includes(result.recommendedLevel)
      ? result.recommendedLevel
      : available[available.length - 1]

    return (
      <>
        
        <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          <div className="card text-center space-y-5">
            <div className="text-5xl">🎯</div>
            <h1 className="text-2xl font-bold text-gray-900">Jouw aanbevolen startniveau</h1>
            <div className="bg-primary-50 border-2 border-primary-300 rounded-xl p-5">
              <span className="tag-level mb-2 inline-block">
                {result.recommendedLevel.toUpperCase().replace('BPLUS', 'B+')}
              </span>
              <p className="font-bold text-primary-800 text-xl mt-2">
                {LEVEL_LABELS[result.recommendedLevel]}
              </p>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Dit niveau ligt net een stapje boven jouw huidige kennis — ideaal om snel vooruit te gaan zonder gedemotiveerd te raken.
            </p>

            <div className="grid grid-cols-5 gap-2 text-xs">
              {(['a0', 'a1', 'a2', 'b1', 'b2'] as Level[]).map((lvl) => {
                const score = result.scores[lvl] ?? 0
                const isRec = lvl === result.recommendedLevel
                return (
                  <div
                    key={lvl}
                    className={`rounded-lg p-2 text-center border-2 ${
                      isRec
                        ? 'border-primary-400 bg-primary-50'
                        : score === 2
                        ? 'border-green-300 bg-green-50'
                        : 'border-warm-gray bg-gray-50'
                    }`}
                  >
                    <div className="font-bold text-gray-700">{lvl.toUpperCase()}</div>
                    <div className={score === 2 ? 'text-green-600' : score === 1 ? 'text-amber-600' : 'text-gray-400'}>
                      {score}/2
                    </div>
                    {isRec && <div className="text-primary-600 font-bold">←</div>}
                  </div>
                )
              })}
            </div>

            <button
              onClick={() => router.push(`/learn/${language}/${targetLevel}`)}
              className="btn-primary w-full text-lg py-3"
            >
              Begin op {targetLevel.toUpperCase().replace('BPLUS', 'B+')} →
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-400 text-sm hover:text-gray-600 hover:underline transition-colors"
            >
              Bekijk alle niveaus op het dashboard
            </button>
          </div>
        </main>
      </>
    )
  }

  const q = questions[current]
  const progressPct = (current / questions.length) * 100

  return (
    <>
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <div className="flex justify-between text-sm text-gray-500 mb-1.5">
            <span>Vraag {current + 1} van {questions.length}</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="h-2.5 bg-warm-gray rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="card space-y-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Niveau {q.level.toUpperCase().replace('BPLUS', 'B+')}
          </p>
          <h2 className="text-lg font-semibold text-gray-900 leading-snug">{q.question}</h2>
          <div className="space-y-3">
            {q.options.map((opt, i) => {
              let cls = 'w-full text-left px-4 py-3 rounded-xl border-2 font-medium transition-all '
              if (selected === null) {
                cls += 'border-warm-gray hover:border-primary-400 hover:bg-primary-50 cursor-pointer'
              } else if (i === q.correct) {
                cls += 'border-green-500 bg-green-50 text-green-800'
              } else if (i === selected && i !== q.correct) {
                cls += 'border-red-400 bg-red-50 text-red-700'
              } else {
                cls += 'border-warm-gray opacity-40'
              }
              return (
                <button key={i} className={cls} onClick={() => handleSelect(i)}>
                  {opt}
                </button>
              )
            })}
          </div>
          {selected !== null && (
            <button onClick={handleNext} className="btn-primary w-full mt-1">
              {current + 1 < questions.length ? 'Volgende vraag →' : 'Bekijk mijn resultaat →'}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-gray-400">
          De test bepaalt automatisch welk niveau het beste bij jou past.
        </p>
      </main>
    </>
  )
}
