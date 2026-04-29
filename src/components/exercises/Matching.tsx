'use client'

import { useState, useMemo } from 'react'
import type { MatchingExercise } from '@/lib/types'
import TextToSpeech from '@/components/TextToSpeech'

interface Props {
  exercise: MatchingExercise
  lang: 'fr-FR' | 'en-GB'
  onScore: (correct: boolean) => void
}

export default function Matching({ exercise, lang, onScore }: Props) {
  const shuffledRight = useMemo(
    () => [...exercise.pairs].sort(() => Math.random() - 0.5),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exercise.id]
  )

  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
  const [matched, setMatched] = useState<Record<number, number>>({}) // leftIndex → rightIndex
  const [wrong, setWrong] = useState<number | null>(null)
  const [done, setDone] = useState(false)

  const matchedLeftIndices = Object.keys(matched).map(Number)
  const matchedRightIndices = Object.values(matched)

  function handleLeft(i: number) {
    if (done || matchedLeftIndices.includes(i)) return
    setSelectedLeft(i === selectedLeft ? null : i)
  }

  function handleRight(ri: number) {
    if (done || selectedLeft === null || matchedRightIndices.includes(ri)) return

    const leftItem = exercise.pairs[selectedLeft]
    const rightItem = shuffledRight[ri]

    if (leftItem.left === rightItem.left || leftItem.right === rightItem.right) {
      const next = { ...matched, [selectedLeft]: ri }
      setMatched(next)
      setSelectedLeft(null)
      if (Object.keys(next).length === exercise.pairs.length) {
        setDone(true)
        onScore(true)
      }
    } else {
      setWrong(ri)
      setTimeout(() => { setWrong(null); setSelectedLeft(null) }, 800)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-gray-600 text-sm">{exercise.instruction}</p>
      <p className="text-gray-500 text-sm">Klik op een woord links, dan op de bijpassende vertaling rechts.</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {exercise.pairs.map((pair, i) => {
            const isMatched = matchedLeftIndices.includes(i)
            const isSelected = selectedLeft === i
            return (
              <div key={i} className="flex items-center gap-2">
                <button
                  onClick={() => handleLeft(i)}
                  disabled={isMatched}
                  className={`flex-1 text-left px-3 py-2.5 rounded-xl border-2 font-medium text-sm transition-colors ${
                    isMatched ? 'border-green-300 bg-green-50 text-green-700 cursor-default' :
                    isSelected ? 'border-primary-500 bg-primary-50 text-primary-800' :
                    'border-warm-gray bg-white hover:border-primary-300'
                  }`}
                >
                  {pair.left}
                </button>
                <TextToSpeech text={pair.left} lang={lang} className="flex-shrink-0 w-7 h-7" />
              </div>
            )
          })}
        </div>

        <div className="space-y-2">
          {shuffledRight.map((pair, ri) => {
            const isMatched = matchedRightIndices.includes(ri)
            const isWrong = wrong === ri
            return (
              <button
                key={ri}
                onClick={() => handleRight(ri)}
                disabled={isMatched || selectedLeft === null}
                className={`w-full text-left px-3 py-2.5 rounded-xl border-2 font-medium text-sm transition-colors ${
                  isMatched ? 'border-green-300 bg-green-50 text-green-700 cursor-default' :
                  isWrong ? 'border-red-400 bg-red-50 text-red-700' :
                  selectedLeft !== null ? 'border-warm-gray bg-white hover:border-primary-300 hover:bg-primary-50' :
                  'border-warm-gray bg-white opacity-60'
                }`}
              >
                {pair.right}
              </button>
            )
          })}
        </div>
      </div>

      {done && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl px-4 py-3 text-sm font-medium">
          ✓ Alle koppels gevonden! Goed gedaan.
        </div>
      )}
    </div>
  )
}
