'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function WachtwoordResetPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/wachtwoord-nieuw`,
    })
    setLoading(false)
    if (error) { setError('Kon geen reset-mail sturen. Controleer het e-mailadres.'); return }
    setSent(true)
  }

  if (sent) return (
    <main className="min-h-screen bg-[#f4f4f4] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-xl shadow-sm border border-[#e8e8e8] p-8">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-lg font-bold text-[#242424] mb-2">Check je e-mail</h2>
          <p className="text-[#5b5b5b] text-sm mb-6">
            We hebben een resetlink gestuurd naar <strong>{email}</strong>.
          </p>
          <Link href="/auth/login" className="text-[#2563eb] font-semibold text-sm hover:underline">
            Terug naar inloggen
          </Link>
        </div>
      </div>
    </main>
  )

  return (
    <main className="min-h-screen bg-[#f4f4f4] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-sm border border-[#e8e8e8] p-6">
          <h2 className="text-base font-bold text-[#242424] mb-1" style={{ fontFamily: 'Roboto, system-ui' }}>
            Wachtwoord vergeten
          </h2>
          <p className="text-xs text-[#5b5b5b] mb-4">Vul je e-mailadres in — we sturen je een resetlink.</p>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="email" required autoComplete="email"
              className="w-full border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2563eb]"
              placeholder="jouw@email.be" value={email}
              onChange={e => setEmail(e.target.value)} />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2 rounded-lg text-white text-sm font-medium disabled:opacity-60"
              style={{ background: '#2563eb' }}>
              {loading ? 'Versturen…' : 'Resetlink sturen'}
            </button>
          </form>
          <p className="text-center text-xs text-[#5b5b5b] mt-4">
            <Link href="/auth/login" className="text-[#2563eb] font-semibold hover:underline">Terug naar inloggen</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
