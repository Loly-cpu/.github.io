'use client'

export type TtsLang = 'fr-FR' | 'en-GB' | 'nl-NL' | 'nl-BE'

interface TextToSpeechProps {
  text: string
  lang: TtsLang
  className?: string
}

function getBestVoice(lang: TtsLang): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  const prefix = lang.split('-')[0]
  // Prefer exact match, fall back to same language prefix
  return (
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.startsWith(prefix)) ??
    null
  )
}

export function speak(text: string, lang: TtsLang) {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.lang = lang
  utt.rate = lang.startsWith('nl') ? 0.95 : 0.82

  const setVoiceAndSpeak = () => {
    const voice = getBestVoice(lang)
    if (voice) utt.voice = voice
    window.speechSynthesis.speak(utt)
  }

  const voices = window.speechSynthesis.getVoices()
  if (voices.length > 0) {
    setVoiceAndSpeak()
  } else {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null
      setVoiceAndSpeak()
    }
  }
}

export default function TextToSpeech({ text, lang, className }: TextToSpeechProps) {
  // Suppress — only works client-side; gracefully hidden if unavailable

  return (
    <button
      onClick={() => speak(text, lang)}
      title="Hoor de uitspraak"
      aria-label="Hoor de uitspraak"
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-600 transition-colors flex-shrink-0 ${className ?? ''}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
      </svg>
    </button>
  )
}
