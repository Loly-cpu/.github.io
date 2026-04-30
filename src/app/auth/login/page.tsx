'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError('E-mailadres of wachtwoord klopt niet.'); return }
    router.replace('/platform')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Roboto, system-ui, sans-serif', background: '#f3f4f6' }}>

      {/* ── Left: form ───────────────────────────────────── */}
      <div style={{ flex: '0 0 460px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 56px', background: '#fff' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#ff520e', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 16 }}>S</div>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#111827' }}>Schoolplatform</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: '0 0 6px' }}>Inloggen</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>Welkom terug. Vul je gegevens in om verder te gaan.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>E-mailadres</label>
            <input type="email" required autoComplete="email"
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 14px', fontSize: 14, color: '#111827', background: '#fff', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.15s' }}
              placeholder="naam@school.be"
              value={email} onChange={e => setEmail(e.target.value)}
              onFocus={e => (e.target.style.borderColor = '#ff520e')}
              onBlur={e  => (e.target.style.borderColor = '#d1d5db')}
            />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>Wachtwoord</label>
              <Link href="/auth/wachtwoord-reset" style={{ fontSize: 12, color: '#ff520e', textDecoration: 'none', fontWeight: 500 }}>
                Vergeten?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <input type={showPw ? 'text' : 'password'} required autoComplete="current-password"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 10, padding: '10px 42px 10px 14px', fontSize: 14, color: '#111827', background: '#fff', boxSizing: 'border-box', outline: 'none', transition: 'border-color 0.15s' }}
                placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)}
                onFocus={e => (e.target.style.borderColor = '#ff520e')}
                onBlur={e  => (e.target.style.borderColor = '#d1d5db')}
              />
              <button type="button" onClick={() => setShowPw(s => !s)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, padding: 0, lineHeight: 1 }}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626', fontWeight: 500 }}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: '#ff520e', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s', opacity: loading ? 0.7 : 1, marginTop: 4 }}
            onMouseEnter={e => !loading && (e.currentTarget.style.background = '#ea4a08')}
            onMouseLeave={e => (e.currentTarget.style.background = '#ff520e')}>
            {loading ? 'Bezig met inloggen…' : 'Inloggen'}
          </button>
        </form>

        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 24, textAlign: 'center' }}>
          Nog geen account?{' '}
          <Link href="/auth/register" style={{ color: '#ff520e', fontWeight: 600, textDecoration: 'none' }}>Maak er gratis een aan</Link>
        </p>
      </div>

      {/* ── Right: platform info ─────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '48px 56px', background: '#f3f4f6' }}
        className="hidden md:flex">
        <div style={{ maxWidth: 420 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#ff520e', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Belgisch schoolplatform</p>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#111827', lineHeight: 1.25, marginBottom: 20 }}>
            Alles voor je school,<br />op één plek.
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { icon: '📅', title: 'Agenda & studieplanning', sub: 'Examenvoorbereiding met persoonlijk studieplan' },
              { icon: '💬', title: 'Berichten & groepen', sub: 'Samenwerken per graad, richting en vak' },
              { icon: '📁', title: 'Documenten delen', sub: 'Samenvattingen en notities voor iedereen' },
              { icon: '🌐', title: 'Frans & Engels oefenen', sub: 'Van A0 tot B2 — op jouw eigen tempo' },
            ].map(item => (
              <div key={item.icon} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fff', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>{item.title}</p>
                  <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
