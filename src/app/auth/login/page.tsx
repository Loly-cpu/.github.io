'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('E-mail of wachtwoord klopt niet. Probeer opnieuw.')
    } else {
      router.replace('/platform')
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f4f4] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#ff520e] flex items-center justify-center text-white font-bold text-sm">S</div>
            <span className="font-bold text-lg text-[#242424]" style={{ fontFamily: 'Roboto, system-ui, sans-serif' }}>Schoolplatform</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#e8e8e8] p-6">
          <h2 className="text-base font-bold text-[#242424] mb-4" style={{ fontFamily: 'Roboto, system-ui, sans-serif' }}>
            Inloggen
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#5b5b5b] mb-1">E-mailadres</label>
              <input
                type="email"
                autoComplete="email"
                required
                className="w-full border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff520e]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jouw@email.be"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5b5b5b] mb-1">Wachtwoord</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                className="w-full border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff520e]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs font-medium">
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-2 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-60"
              style={{ background: '#ff520e' }}>
              {loading ? 'Even geduld…' : 'Inloggen'}
            </button>
          </form>

          <p className="text-center text-xs text-[#5b5b5b] mt-4">
            Nog geen account?{' '}
            <Link href="/auth/register" className="text-[#ff520e] font-semibold hover:underline">Registreer hier</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
