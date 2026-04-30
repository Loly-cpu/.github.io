'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('App error:', error)
  }, [error])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f4f4', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#242424', marginBottom: 8 }}>Er ging iets mis</h2>
        <p style={{ fontSize: 13, color: '#5b5b5b', marginBottom: 24 }}>
          De pagina kon niet geladen worden. Probeer het opnieuw of ga terug naar de startpagina.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={reset}
            style={{ background: '#ff520e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Opnieuw proberen
          </button>
          <a href="/platform"
            style={{ background: '#f4f4f4', color: '#5b5b5b', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
            ← Home
          </a>
        </div>
      </div>
    </div>
  )
}
