'use client'

interface TextToSpeechProps {
  text: string
  lang: 'fr-FR' | 'en-GB'
  className?: string
}

export default function TextToSpeech({ text, lang, className }: TextToSpeechProps) {
  function speak() {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = lang
    utt.rate = 0.85
    window.speechSynthesis.speak(utt)
  }

  if (!('speechSynthesis' in window) && typeof window !== 'undefined') return null

  return (
    <button
      onClick={speak}
      title="Hoor de uitspraak"
      aria-label="Hoor de uitspraak"
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary-50 hover:bg-primary-100 text-primary-600 transition-colors ${className ?? ''}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
      </svg>
    </button>
  )
}
