'use client'

import { useState, useEffect } from 'react'
import type { DictationExercise } from '@/lib/types'
import type { TtsLang } from '@/components/TextToSpeech'
import { speak } from '@/components/TextToSpeech'

interface Props {
  exercise: DictationExercise
  lang: TtsLang
  onScore: (correct: boolean) => void
}

function normalize(s: string) {
  return s.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, "'")
}

export default function Dictation({ exercise, lang, onScore }: Props) {
  const [value, setValue] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [playCount, setPlayCount] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => {
      speak(exercise.audio_text, lang)
      setPlayCount(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [exercise.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function handlePlay() {
    speak(exercise.audio_text, lang)
    setPlayCount((c) => c + 1)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitted || !value.trim()) return
    setSubmitted(true)
    const correct = exercise.accepted.some((a) => normalize(value) === normalize(a))
    onScore(correct)
  }

  const isCorrect = submitted && exercise.accepted.some((a) => normalize(value) === normalize(a))

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">
        Dictee — Typ wat je hoort
      </p>

      <div className="flex flex-col items-center gap-3 py-3 bg-primary-50 rounded-2xl">
        <button
          onClick={handlePlay}
          disabled={submitted}
          className="w-16 h-16 rounded-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center text-white transition-colors shadow-md"
          title="Speel de zin opnieuw af"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06C18.01 19.86 21 16.28 21 12s-2.99-7.86-7-8.77z"/>
          </svg>
        </button>
        <p className="text-xs text-gray-500">
          {playCount === 0 ? 'Audio laadt…' : `Afgespeeld ${playCount}×`} · Klik voor herhaling
        </p>
      </div>

      {exercise.hint && (
        <p className="text-sm text-gray-400 italic">💡 {exercise.hint}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          disabled={submitted}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input"
          placeholder="Typ hier wat je hoort…"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {!submitted && (
          <button type="submit" disabled={!value.trim()} className="btn-primary text-sm px-5 py-2">
            Controleren
          </button>
        )}
      </form>

      {submitted && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${isCorrect ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {isCorrect ? '✓ Correct!' : `✗ Juist antwoord: ${exercise.accepted[0]}`}
          <p className="mt-1 font-normal">{exercise.explanation}</p>
        </div>
      )}
    </div>
  )
}
