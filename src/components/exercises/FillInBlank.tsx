'use client'

import { useState } from 'react'
import type { FillBlankExercise } from '@/lib/types'

interface Props {
  exercise: FillBlankExercise
  onScore: (correct: boolean) => void
}

function normalize(s: string) {
  return s.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export default function FillInBlank({ exercise, onScore }: Props) {
  const [values, setValues] = useState<string[]>(exercise.blanks.map(() => ''))
  const [submitted, setSubmitted] = useState(false)

  const parts = exercise.question.split('___')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitted) return
    setSubmitted(true)
    const correct = exercise.blanks.every((ans, i) =>
      normalize(values[i] ?? '') === normalize(ans)
    )
    onScore(correct)
  }

  const allCorrect = submitted && exercise.blanks.every((ans, i) =>
    normalize(values[i] ?? '') === normalize(ans)
  )

  return (
    <div className="space-y-4">
      {exercise.hint && (
        <p className="text-sm text-gray-500 italic">💡 Hint: {exercise.hint}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-base text-gray-800 flex flex-wrap items-center gap-1 leading-relaxed">
          {parts.map((part, i) => (
            <span key={i} className="flex items-center gap-1">
              <span>{part}</span>
              {i < exercise.blanks.length && (
                <input
                  type="text"
                  disabled={submitted}
                  value={values[i]}
                  onChange={(e) => {
                    const next = [...values]
                    next[i] = e.target.value
                    setValues(next)
                  }}
                  className={`border-b-2 bg-transparent text-center w-28 px-1 py-0.5 text-base focus:outline-none transition-colors ${
                    submitted
                      ? normalize(values[i] ?? '') === normalize(exercise.blanks[i])
                        ? 'border-green-500 text-green-700'
                        : 'border-red-400 text-red-700'
                      : 'border-primary-400 focus:border-primary-600'
                  }`}
                />
              )}
            </span>
          ))}
        </div>

        {!submitted && (
          <button type="submit" className="btn-primary text-sm px-5 py-2">
            Controleren
          </button>
        )}
      </form>

      {submitted && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${allCorrect ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {allCorrect ? '✓ Correct!' : `✗ Juist antwoord: ${exercise.blanks.join(', ')}`}
          <p className="mt-1 font-normal">{exercise.explanation}</p>
        </div>
      )}
    </div>
  )
}
