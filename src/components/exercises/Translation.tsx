'use client'

import { useState } from 'react'
import type { TranslationExercise } from '@/lib/types'
import TextToSpeech from '@/components/TextToSpeech'

interface Props {
  exercise: TranslationExercise
  lang: 'fr-FR' | 'en-GB'
  onScore: (correct: boolean) => void
}

function normalize(s: string) {
  return s.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, "'")
}

export default function Translation({ exercise, lang, onScore }: Props) {
  const [value, setValue] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const isTargetToNl = exercise.direction === 'target_to_nl'
  const ttsLang = lang
  const isCorrect = submitted && exercise.accepted.some(
    (a) => normalize(value) === normalize(a)
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitted || !value.trim()) return
    setSubmitted(true)
    onScore(exercise.accepted.some((a) => normalize(value) === normalize(a)))
  }

  return (
    <div className="space-y-4">
      <div className="bg-primary-50 rounded-xl px-4 py-3 flex items-center gap-3">
        <span className="text-primary-400 text-sm font-medium">
          {isTargetToNl ? 'Vertaal naar het Nederlands:' : 'Vertaal naar het ' + (lang === 'fr-FR' ? 'Frans' : 'Engels') + ':'}
        </span>
      </div>

      <div className="flex items-start gap-2">
        <p className="font-semibold text-gray-800 text-lg flex-1">{exercise.source}</p>
        {isTargetToNl && <TextToSpeech text={exercise.source} lang={ttsLang} />}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          disabled={submitted}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input"
          placeholder="Typ hier je vertaling…"
          autoComplete="off"
        />
        {!submitted && (
          <button type="submit" disabled={!value.trim()} className="btn-primary text-sm px-5 py-2">
            Controleren
          </button>
        )}
      </form>

      {submitted && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${isCorrect ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {isCorrect ? '✓ Correct!' : `✗ Juist antwoord: ${exercise.accepted[0]}`}
          <p className="mt-1 font-normal">{exercise.explanation}</p>
        </div>
      )}
    </div>
  )
}
