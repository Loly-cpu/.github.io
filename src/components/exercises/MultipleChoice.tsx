'use client'

import { useState } from 'react'
import type { MultipleChoiceExercise } from '@/lib/types'
import TextToSpeech from '@/components/TextToSpeech'

interface Props {
  exercise: MultipleChoiceExercise
  lang: 'fr-FR' | 'en-GB'
  onScore: (correct: boolean) => void
}

export default function MultipleChoice({ exercise, lang, onScore }: Props) {
  const [selected, setSelected] = useState<number | null>(null)

  const answered = selected !== null
  const isCorrect = selected === exercise.correct

  function handleSelect(i: number) {
    if (answered) return
    setSelected(i)
    onScore(i === exercise.correct)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <p className="font-medium text-gray-800 flex-1">{exercise.question}</p>
        <TextToSpeech text={exercise.question} lang={lang} />
      </div>

      <div className="grid gap-2">
        {exercise.options.map((opt, i) => {
          let cls = 'w-full text-left px-4 py-3 rounded-xl border-2 font-medium transition-colors text-base '
          if (!answered) {
            cls += 'border-warm-gray bg-white hover:border-primary-300 hover:bg-primary-50'
          } else if (i === exercise.correct) {
            cls += 'border-green-400 bg-green-50 text-green-800'
          } else if (i === selected) {
            cls += 'border-red-400 bg-red-50 text-red-800'
          } else {
            cls += 'border-warm-gray bg-white text-gray-400'
          }

          return (
            <button key={i} className={cls} onClick={() => handleSelect(i)} disabled={answered}>
              <span className="mr-3 font-bold text-gray-400">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          )
        })}
      </div>

      {answered && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${isCorrect ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {isCorrect ? '✓ Correct!' : `✗ Fout. Juist antwoord: ${exercise.options[exercise.correct]}`}
          <p className="mt-1 font-normal">{exercise.explanation}</p>
        </div>
      )}
    </div>
  )
}
