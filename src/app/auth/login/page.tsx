'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const FB = '#1877F2'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('E-mail of wachtwoord klopt niet.'); setLoading(false) }
    else router.replace('/platform')
  }

  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/platform` },
    })
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#F0F2F5',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '20px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, maxWidth: 980, width: '100%', flexWrap: 'wrap' }}>

        {/* ── Links: branding ── */}
        <div style={{ flex: 1, minWidth: 240, maxWidth: 480, textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: FB, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="28" height="28" viewBox="0 0 50 39" fill="white">
                <path d="M16.4992 2H37.5808L22.0816 24.9729H1L16.4992 2Z"/>
                <path d="M17.4224 27.102L11.4192 36H33.5008L49 13.0271H32.7024L23.2064 27.102H17.4224Z"/>
              </svg>
            </div>
            <span style={{ fontSize: 32, fontWeight: 800, color: FB, letterSpacing: '-1px' }}>school</span>
          </div>
          <p style={{ fontSize: 26, fontWeight: 400, color: '#1C1E21', margin: 0, lineHeight: 1.4 }}>
            Verbind met je klas en leer slimmer.
          </p>
        </div>

        {/* ── Rechts: login card (exact Facebook) ── */}
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,.1), 0 8px 16px rgba(0,0,0,.1)', padding: 16, width: '100%', maxWidth: 396 }}>
          <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email" placeholder="E-mail of telefoonnummer" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: '100%', padding: '14px 16px', fontSize: 17, border: '1px solid #CED0D4', borderRadius: 6, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#1C1E21', transition: 'border-color .15s' }}
              onFocus={e => (e.target.style.borderColor = FB)}
              onBlur={e => (e.target.style.borderColor = '#CED0D4')}
            />
            <input
              type="password" placeholder="Wachtwoord" required autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: '100%', padding: '14px 16px', fontSize: 17, border: '1px solid #CED0D4', borderRadius: 6, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', color: '#1C1E21', transition: 'border-color .15s' }}
              onFocus={e => (e.target.style.borderColor = FB)}
              onBlur={e => (e.target.style.borderColor = '#CED0D4')}
            />

            {error && <p style={{ margin: 0, fontSize: 14, color: '#E41E3F', textAlign: 'center' }}>{error}</p>}

            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '14px 16px', fontSize: 20, fontWeight: 700, background: FB, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1, transition: 'background .1s' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#166FE5' }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = FB }}>
              {loading ? 'Aanmelden…' : 'Aanmelden'}
            </button>

            <Link href="/auth/wachtwoord-reset"
              style={{ textAlign: 'center', color: FB, fontSize: 14, fontWeight: 500, textDecoration: 'none', display: 'block' }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
              Wachtwoord vergeten?
            </Link>

            <div style={{ height: 1, background: '#CED0D4', margin: '4px 0' }} />

            {/* Google */}
            <button type="button" onClick={handleGoogleSignIn}
              style={{ width: '100%', padding: '12px 16px', fontSize: 15, fontWeight: 600, background: '#fff', color: '#1C1E21', border: '1px solid #CED0D4', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'background .1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F2F2F2')}
              onMouseLeave={e => (e.currentTarget.style.background = '#fff')}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Verdergaan met Google
            </button>

            <div style={{ textAlign: 'center', margin: '4px 0 0' }}>
              <Link href="/auth/register"
                style={{ display: 'inline-block', background: '#42B72A', color: '#fff', fontSize: 17, fontWeight: 700, padding: '14px 24px', borderRadius: 6, textDecoration: 'none', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#36A420')}
                onMouseLeave={e => (e.currentTarget.style.background = '#42B72A')}>
                Nieuwe account aanmaken
              </Link>
            </div>
          </form>
        </div>
      </div>

      <p style={{ marginTop: 28, fontSize: 14, color: '#65676B', textAlign: 'center' }}>
        <strong>Schoolplatform</strong> · Privacy · Voorwaarden · Adverteren · Cookies · Meer
      </p>
    </div>
  )
}
