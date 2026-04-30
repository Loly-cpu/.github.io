'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('De wachtwoorden komen niet overeen.'); return }
    if (password.length < 8)  { setError('Wachtwoord moet minstens 8 tekens bevatten.'); return }
    setLoading(true)
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://examen.atlasleads.be'
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name || email.split('@')[0] },
        emailRedirectTo: `${siteUrl}/platform`,
      },
    })
    setLoading(false)
    if (signUpError) {
      setError('Registratie mislukt: ' + signUpError.message)
      return
    }
    // If session exists immediately → email confirmation is disabled
    if (data.session) {
      // Save display_name to profiles
      if (name) {
        await supabase.from('profiles').upsert({ id: data.session.user.id, display_name: name })
      }
      router.replace('/platform')
    } else {
      // Email confirmation required
      setEmailSent(true)
    }
  }

  if (emailSent) {
    return (
      <main className="min-h-screen bg-[#f4f4f4] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-xl shadow-sm border border-[#e8e8e8] p-8">
            <div className="text-5xl mb-4">📬</div>
            <h2 className="text-xl font-bold text-[#242424] mb-2">Controleer je e-mail</h2>
            <p className="text-[#5b5b5b] text-sm mb-6">
              We hebben een bevestigingslink gestuurd naar <strong>{email}</strong>.<br />
              Klik op de link om je account te activeren.
            </p>
            <Link href="/auth/login"
              className="text-[#ff520e] font-semibold text-sm hover:underline">
              Terug naar inloggen
            </Link>
          </div>
        </div>
      </main>
    )
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
            Account aanmaken
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#5b5b5b] mb-1">Naam</label>
              <input
                type="text"
                autoComplete="name"
                className="w-full border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff520e]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jona Leenders"
              />
            </div>
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
              <label className="block text-xs font-medium text-[#5b5b5b] mb-1">Wachtwoord <span className="text-[#9ca3af]">(min. 8 tekens)</span></label>
              <input
                type="password"
                autoComplete="new-password"
                required
                className="w-full border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff520e]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#5b5b5b] mb-1">Herhaal wachtwoord</label>
              <input
                type="password"
                autoComplete="new-password"
                required
                className="w-full border border-[#e8e8e8] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#ff520e]"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              {loading ? 'Account aanmaken…' : 'Registreren'}
            </button>
          </form>

          <p className="text-center text-xs text-[#5b5b5b] mt-4">
            Al een account?{' '}
            <Link href="/auth/login" className="text-[#ff520e] font-semibold hover:underline">Log hier in</Link>
          </p>
        </div>
      </div>
    </main>
  )
}
