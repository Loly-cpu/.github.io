'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function WachtwoordNieuwPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [ready, setReady]       = useState(false)

  useEffect(() => {
    // Supabase sets the session from the URL hash after redirect
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
      else router.replace('/auth/wachtwoord-reset')
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Wachtwoorden komen niet overeen.'); return }
    if (password.length < 8)  { setError('Minimaal 8 tekens vereist.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError('Kon wachtwoord niet opslaan. Probeer opnieuw.'); return }
    router.replace('/platform')
  }

  if (!ready) return (
    <div className="min-h-screen bg-[#f4f4f4] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#ff520e] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <main className="min-h-screen bg-[#f4f4f4] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-[#e8e8e8] p-6">
          <h2 className="text-base font-bold text-[#242424] mb-4" style={{ fontFamily: 'Roboto, system-ui' }}>
            Nieuw wachtwoord instellen
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="password" required autoComplete="new-password"
              className="w-full border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff520e]"
              placeholder="Nieuw wachtwoord (min. 8 tekens)" value={password}
              onChange={e => setPassword(e.target.value)} />
            <input type="password" required autoComplete="new-password"
              className="w-full border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff520e]"
              placeholder="Herhaal wachtwoord" value={confirm}
              onChange={e => setConfirm(e.target.value)} />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
              style={{ background: '#ff520e' }}>
              {loading ? 'Opslaan…' : 'Wachtwoord opslaan'}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
