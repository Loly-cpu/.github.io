'use client'

import { useState } from 'react'
import type { Exercise, Language } from '@/lib/types'
import MultipleChoice from './exercises/MultipleChoice'
import FillInBlank from './exercises/FillInBlank'
import Translation from './exercises/Translation'
import Matching from './exercises/Matching'

const LANG_CODE: Record<Language, 'fr-FR' | 'en-GB'> = { fr: 'fr-FR', en: 'en-GB' }

interface Props {
  exercises: Exercise[]
  language: Language
  onComplete: (score: number, max: number) => void
}

export default function ExerciseContainer({ exercises, language, onComplete }: Props) {
  const [current, setCurrent] = useState(0)
  const [scores, setScores] = useState<boolean[]>([])
  const [answered, setAnswered] = useState(false)

  const lang = LANG_CODE[language]
  const ex = exercises[current]
  const isLast = current === exercises.length - 1

  function handleScore(correct: boolean) {
    setAnswered(true)
    setScores((prev) => [...prev, correct])
  }

  function handleNext() {
    if (isLast) {
      const finalScores = [...scores]
      const correct = finalScores.filter(Boolean).length
      onComplete(correct, exercises.length)
    } else {
      setCurrent((c) => c + 1)
      setAnswered(false)
    }
  }

  if (!ex) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Oefening {current + 1} van {exercises.length}</span>
        <div className="flex gap-1">
          {exercises.map((_, i) => (
            <div
              key={i}
              className={`w-2.5 h-2.5 rounded-full ${
                i < scores.length
                  ? scores[i] ? 'bg-green-500' : 'bg-red-400'
                  : i === current ? 'bg-primary-400' : 'bg-warm-gray'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="card">
        {ex.type === 'multiple_choice' && (
          <MultipleChoice exercise={ex} lang={lang} onScore={handleScore} />
        )}
        {ex.type === 'fill_blank' && (
          <FillInBlank exercise={ex} onScore={handleScore} />
        )}
        {ex.type === 'translation' && (
          <Translation exercise={ex} lang={lang} onScore={handleScore} />
        )}
        {ex.type === 'matching' && (
          <Matching exercise={ex} lang={lang} onScore={handleScore} />
        )}
      </div>

      {answered && (
        <button onClick={handleNext} className="btn-primary w-full">
          {isLast ? 'Resultaten bekijken' : 'Volgende oefening →'}
        </button>
      )}
    </div>
  )
}
