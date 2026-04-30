'use client'

import { useState, useCallback } from 'react'

interface DeleteConfirmState {
  open: boolean
  title: string
  body: string
  onConfirm: () => void
  prefKey: string
}

let _setState: ((s: DeleteConfirmState | null) => void) | null = null

export function useDeleteConfirm() {
  const confirm = useCallback((opts: {
    title: string
    body?: string
    prefKey: string   // uniek per type (bv. 'bericht', 'document', 'melding')
    onConfirm: () => void
  }) => {
    // Check of gebruiker "niet meer vragen" heeft aangevinkt
    const skip = localStorage.getItem(`delete-skip-${opts.prefKey}`) === 'true'
    if (skip) { opts.onConfirm(); return }
    _setState?.({
      open: true,
      title: opts.title,
      body: opts.body ?? 'Dit kan niet ongedaan worden gemaakt.',
      onConfirm: opts.onConfirm,
      prefKey: opts.prefKey,
    })
  }, [])
  return confirm
}

export function DeleteConfirmProvider() {
  const [state, setState] = useState<DeleteConfirmState | null>(null)
  const [dontAsk, setDontAsk] = useState(false)
  _setState = setState

  if (!state) return null

  function handleConfirm() {
    if (dontAsk) localStorage.setItem(`delete-skip-${state!.prefKey}`, 'true')
    state!.onConfirm()
    setState(null)
    setDontAsk(false)
  }

  function handleCancel() {
    setState(null)
    setDontAsk(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, maxWidth: 380, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{state.title}</p>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>{state.body}</p>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, cursor: 'pointer' }}>
          <input type="checkbox" checked={dontAsk} onChange={e => setDontAsk(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#2563eb', cursor: 'pointer' }} />
          <span style={{ fontSize: 12, color: '#6b7280' }}>Vraag dit niet meer voor dit type</span>
        </label>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={handleCancel}
            style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, cursor: 'pointer', fontWeight: 500, color: '#374151' }}>
            Annuleren
          </button>
          <button onClick={handleConfirm}
            style={{ background: '#ef4444', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, cursor: 'pointer', fontWeight: 600, color: '#fff' }}>
            Verwijderen
          </button>
        </div>
      </div>
    </div>
  )
}
