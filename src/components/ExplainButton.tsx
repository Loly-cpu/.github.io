'use client'

import { useState } from 'react'

interface ExplainButtonProps {
  language: string
  level: string
  topicTitle: string
  topicContext: string
}

export default function ExplainButton({ language, level, topicTitle, topicContext }: ExplainButtonProps) {
  const [open, setOpen] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function fetchExplanation() {
    if (explanation) { setOpen(true); return }
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, level, topicTitle, topicContext }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setExplanation(data.explanation)
      setOpen(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={fetchExplanation}
        disabled={loading}
        className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
            Even geduld…
          </>
        ) : (
          <>💡 Ik begrijp dit niet</>
        )}
      </button>

      {error && (
        <p className="text-red-600 text-sm mt-2">
          Kon geen uitleg laden. Controleer je internetverbinding.
        </p>
      )}

      {open && explanation && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-lg">💡 Extra uitleg</h3>
              <button onClick={() => setOpen(false)} className="btn-ghost p-1 text-gray-400">✕</button>
            </div>
            <div className="theory-text whitespace-pre-wrap">{explanation}</div>
          </div>
        </div>
      )}
    </>
  )
}
