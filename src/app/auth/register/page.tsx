'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.21-4.764-.389-7.917z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-1.341-.21-4.764-.389-7.917z" />
  </svg>
)

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-border bg-foreground/5 backdrop-blur-sm transition-colors focus-within:border-violet-400/70 focus-within:bg-violet-500/10">
    {children}
  </div>
)

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [showCf, setShowCf]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
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
    if (signUpError) { setError('Registratie mislukt: ' + signUpError.message); return }
    if (data.session) {
      if (name) await supabase.from('profiles').upsert({ id: data.session.user.id, display_name: name })
      router.replace('/platform')
    } else {
      setEmailSent(true)
    }
  }

  async function handleGoogle() {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://examen.atlasleads.be'
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${siteUrl}/platform` },
    })
  }

  if (emailSent) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-md text-center bg-card border border-border rounded-3xl p-10">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-2xl font-semibold text-foreground mb-3">Controleer je e-mail</h2>
          <p className="text-muted-foreground text-sm mb-6">
            We stuurden een bevestigingslink naar <strong>{email}</strong>.<br />
            Klik op de link om je account te activeren.
          </p>
          <a href="/auth/login" className="text-violet-400 font-semibold text-sm hover:underline">
            Terug naar inloggen
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] flex flex-col md:flex-row font-sans w-[100dvw]">
      {/* Left column: form */}
      <section className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-6">
            <div className="animate-element animate-delay-100">
              <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
                <span className="font-light text-foreground tracking-tighter">Account aanmaken</span>
              </h1>
            </div>
            <p className="animate-element animate-delay-200 text-muted-foreground">
              Maak een gratis account aan om toegang te krijgen tot het schoolplatform.
            </p>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="animate-element animate-delay-300">
                <label className="text-sm font-medium text-muted-foreground">Naam</label>
                <GlassInputWrapper>
                  <input
                    type="text" autoComplete="name"
                    placeholder="Jona Leenders"
                    value={name} onChange={e => setName(e.target.value)}
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                  />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400">
                <label className="text-sm font-medium text-muted-foreground">E-mailadres</label>
                <GlassInputWrapper>
                  <input
                    type="email" autoComplete="email" required
                    placeholder="jouw@email.be"
                    value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                  />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-500">
                <label className="text-sm font-medium text-muted-foreground">
                  Wachtwoord <span className="text-muted-foreground/60">(min. 8 tekens)</span>
                </label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'} autoComplete="new-password" required
                      placeholder="••••••••"
                      value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none"
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute inset-y-0 right-3 flex items-center">
                      {showPw ? <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" /> : <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-600">
                <label className="text-sm font-medium text-muted-foreground">Herhaal wachtwoord</label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input
                      type={showCf ? 'text' : 'password'} autoComplete="new-password" required
                      placeholder="••••••••"
                      value={confirm} onChange={e => setConfirm(e.target.value)}
                      className="w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none"
                    />
                    <button type="button" onClick={() => setShowCf(!showCf)} className="absolute inset-y-0 right-3 flex items-center">
                      {showCf ? <EyeOff className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" /> : <Eye className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              {error && (
                <div className="animate-element rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 text-sm font-medium">
                  ⚠️ {error}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="animate-element animate-delay-700 w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60">
                {loading ? 'Account aanmaken…' : 'Registreren'}
              </button>
            </form>

            <div className="animate-element animate-delay-800 relative flex items-center justify-center">
              <span className="w-full border-t border-border"></span>
              <span className="px-4 text-sm text-muted-foreground bg-background absolute">Of verder met</span>
            </div>

            <button onClick={handleGoogle}
              className="animate-element animate-delay-900 w-full flex items-center justify-center gap-3 border border-border rounded-2xl py-4 hover:bg-secondary transition-colors">
              <GoogleIcon />
              Doorgaan met Google
            </button>

            <p className="animate-element animate-delay-1000 text-center text-sm text-muted-foreground">
              Al een account?{' '}
              <a href="/auth/login" className="text-violet-400 hover:underline transition-colors">Log hier in</a>
            </p>
          </div>
        </div>
      </section>

      {/* Right column: hero */}
      <section className="hidden md:block flex-1 relative p-4">
        <div
          className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1600&q=80')` }}
        />
      </section>
    </div>
  )
}
