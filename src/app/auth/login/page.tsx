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
      router.replace('/dashboard')
    }
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Taalplatform</h1>
          <p className="text-gray-500 text-lg">Frans & Engels leren — van A0 tot B2</p>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-6">Inloggen</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block font-medium mb-2 text-gray-700">
                E-mailadres
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jouw@email.be"
              />
            </div>

            <div>
              <label htmlFor="password" className="block font-medium mb-2 text-gray-700">
                Wachtwoord
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm font-medium">
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Even geduld…' : 'Inloggen'}
            </button>
          </form>

          <p className="text-center text-gray-500 mt-6">
            Nog geen account?{' '}
            <Link href="/auth/register" className="text-primary-600 font-semibold hover:underline">
              Registreer hier
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
