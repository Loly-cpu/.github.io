'use client'

import { useState, useRef } from 'react'
import type { SpeakingExercise } from '@/lib/types'
import type { TtsLang } from '@/components/TextToSpeech'
import { speak } from '@/components/TextToSpeech'

interface Props {
  exercise: SpeakingExercise
  lang: TtsLang
  onScore: (correct: boolean) => void
}

function normalize(s: string) {
  return s.trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/['']/g, "'")
    .replace(/[^a-z0-9' ]/g, '')
}

function tokenMatch(transcript: string, target: string): number {
  const a = normalize(transcript).split(/\s+/).filter(Boolean)
  const b = normalize(target).split(/\s+/).filter(Boolean)
  if (b.length === 0) return 0
  const matches = a.filter((w) => b.includes(w)).length
  return Math.round((matches / b.length) * 100)
}

type State = 'idle' | 'recording' | 'done' | 'fallback'

export default function Speaking({ exercise, lang, onScore }: Props) {
  const [state, setState] = useState<State>(
    typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
      ? 'idle'
      : 'fallback'
  )
  const [transcript, setTranscript] = useState('')
  const [match, setMatch] = useState(0)
  const [fallbackValue, setFallbackValue] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const recRef = useRef<SpeechRecognition | null>(null)

  function startRecording() {
    const SR = (window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      ?? (window as typeof window & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    recRef.current = rec
    rec.lang = lang
    rec.interimResults = false
    rec.maxAlternatives = 1
    setState('recording')

    rec.onresult = (e) => {
      const said = e.results[0][0].transcript
      const pct = tokenMatch(said, exercise.target)
      setTranscript(said)
      setMatch(pct)
      setState('done')
      onScore(pct >= 70)
    }
    rec.onerror = () => setState('fallback')
    rec.onend = () => { if (state === 'recording') setState('idle') }
    rec.start()
  }

  function stopRecording() {
    recRef.current?.stop()
  }

  function handleFallbackSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitted || !fallbackValue.trim()) return
    setSubmitted(true)
    const pct = tokenMatch(fallbackValue, exercise.target)
    setMatch(pct)
    onScore(pct >= 70)
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-primary-600 uppercase tracking-wide">
        {exercise.instruction}
      </p>

      <div className="bg-primary-50 rounded-2xl px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => speak(exercise.target, lang)}
          className="w-10 h-10 rounded-full bg-primary-100 hover:bg-primary-200 flex items-center justify-center text-primary-600 transition-colors flex-shrink-0"
          title="Beluister de zin"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
          </svg>
        </button>
        <p className="text-xl font-semibold text-primary-900 italic">«&nbsp;{exercise.target}&nbsp;»</p>
      </div>

      {exercise.hint && (
        <p className="text-sm text-gray-400 italic">💡 {exercise.hint}</p>
      )}

      {state === 'fallback' ? (
        <form onSubmit={handleFallbackSubmit} className="space-y-3">
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Spraakherkenning is niet beschikbaar in deze browser. Typ de zin hieronder over.
          </p>
          <input
            type="text"
            disabled={submitted}
            value={fallbackValue}
            onChange={(e) => setFallbackValue(e.target.value)}
            className="input"
            placeholder="Typ de zin over…"
            autoComplete="off"
          />
          {!submitted && (
            <button type="submit" disabled={!fallbackValue.trim()} className="btn-primary text-sm px-5 py-2">
              Controleren
            </button>
          )}
          {submitted && (
            <div className={`rounded-xl px-4 py-3 text-sm font-medium ${match >= 70 ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
              {match >= 70 ? '✓ Correct!' : `✗ Juist: ${exercise.target}`}
              <p className="mt-1 font-normal">{exercise.explanation}</p>
            </div>
          )}
        </form>
      ) : state === 'done' ? (
        <div className={`rounded-xl px-4 py-3 text-sm space-y-2 font-medium border ${match >= 70 ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          <p>{match >= 70 ? `✓ Goed! (${match}% overeenkomst)` : `✗ Probeer opnieuw. (${match}% overeenkomst)`}</p>
          <p className="font-normal text-gray-600">Jij zei: <span className="italic">"{transcript}"</span></p>
          <p className="font-normal">{exercise.explanation}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-2">
          <button
            onClick={state === 'recording' ? stopRecording : startRecording}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all shadow-md ${
              state === 'recording'
                ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              {state === 'recording'
                ? <rect x="6" y="6" width="12" height="12" rx="2"/>
                : <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 3.39-3.4 6-6.91 6s-6.42-2.61-6.91-6H2.09C2.6 14.95 5.56 17.8 9 18.44V21h6v-2.56c3.44-.64 6.4-3.49 6.91-6.44H17.91z"/>
              }
            </svg>
          </button>
          <p className="text-sm text-gray-500">
            {state === 'recording' ? 'Opname bezig… klik om te stoppen' : 'Klik om te beginnen met spreken'}
          </p>
        </div>
      )}
    </div>
  )
}
