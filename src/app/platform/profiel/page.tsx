'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const FB = '#1877F2'

interface Profile {
  id: string; display_name: string; is_admin: boolean; is_superadmin: boolean
  canvas_url?: string; canvas_token?: string
}

export default function ProfielPage() {
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState<string | null>(null)
  const [tab, setTab]           = useState<'profiel' | 'accounts'>('profiel')
  const [name, setName]         = useState('')
  const [canvasUrl, setCanvasUrl]   = useState('')
  const [canvasToken, setCanvasToken] = useState('')
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing, setTesting]   = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const uid = data.session.user.id
      const { data: p } = await supabase.from('profiles').select('*').eq('id', uid).single()
      if (p) { setProfile(p); setName(p.display_name ?? ''); setCanvasUrl(p.canvas_url ?? ''); setCanvasToken(p.canvas_token ?? '') }
      setLoading(false)
    })
  }, [])

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function saveName() {
    if (!profile || !name.trim()) return
    setSaving(true)
    await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', profile.id)
    setProfile(p => p ? { ...p, display_name: name.trim() } : p)
    showToast('Naam opgeslagen')
    setSaving(false)
  }

  async function saveCanvas() {
    if (!profile) return
    setSaving(true)
    await supabase.from('profiles').update({ canvas_url: canvasUrl.trim() || null, canvas_token: canvasToken.trim() || null }).eq('id', profile.id)
    showToast('Canvas-account opgeslagen')
    setSaving(false)
  }

  async function testCanvas() {
    if (!canvasUrl.trim() || !canvasToken.trim()) return
    setTesting(true); setTestResult(null)
    try {
      const base = canvasUrl.trim().replace(/\/$/, '')
      const res = await fetch(`${base}/api/v1/users/self/profile`, { headers: { Authorization: `Bearer ${canvasToken.trim()}` } })
      if (res.ok) {
        const d = await res.json()
        setTestResult(`✅ Verbonden als: ${d.name ?? d.login_id}`)
      } else {
        setTestResult(`❌ Fout ${res.status}: controleer je URL en token`)
      }
    } catch {
      setTestResult('❌ Kan server niet bereiken. Controleer je Canvas-URL.')
    }
    setTesting(false)
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><div className="fb-spinner" /></div>

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif' }}>

      {/* FB cover */}
      <div className="fb-card">
        <div style={{ height: 160, background: `linear-gradient(135deg, ${FB}, #42A5F5)` }} />
        <div style={{ padding: '0 24px 20px', display: 'flex', alignItems: 'flex-end', gap: 16, marginTop: -40 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', border: '4px solid #fff', background: profile?.is_superadmin ? '#9333ea' : profile?.is_admin ? '#16a34a' : FB, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 32, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,.2)' }}>
            {(profile?.display_name ?? '?')[0].toUpperCase()}
          </div>
          <div style={{ flex: 1, paddingBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1C1E21' }}>{profile?.display_name}</h1>
            <p style={{ margin: 0, fontSize: 14, color: '#65676B' }}>{profile?.is_superadmin ? 'Superadmin' : profile?.is_admin ? 'Admin' : 'Leerling'}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="fb-tabs">
          <button className={`fb-tab-btn ${tab === 'profiel' ? 'active' : ''}`} onClick={() => setTab('profiel')}>Profiel</button>
          <button className={`fb-tab-btn ${tab === 'accounts' ? 'active' : ''}`} onClick={() => setTab('accounts')}>⚙️ Accounts beheren</button>
        </div>
      </div>

      {tab === 'profiel' && (
        <div className="fb-card">
          <div className="fb-card-header" style={{ fontSize: 18 }}>Profielinformatie</div>
          <div className="fb-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#65676B', display: 'block', marginBottom: 6 }}>Weergavenaam</label>
              <input className="fb-input" value={name} onChange={e => setName(e.target.value)} placeholder="Jouw naam" />
            </div>
            <button className="fb-btn fb-btn-primary" onClick={saveName} disabled={saving || !name.trim()} style={{ alignSelf: 'flex-start', opacity: (saving || !name.trim()) ? 0.6 : 1 }}>
              {saving ? 'Opslaan…' : 'Naam opslaan'}
            </button>
          </div>
        </div>
      )}

      {tab === 'accounts' && (
        <>
          {/* Canvas koppeling */}
          <div className="fb-card">
            <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: '#E41E3F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>📚</div>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1C1E21' }}>Canvas LMS</h2>
                <p style={{ margin: 0, fontSize: 13, color: '#65676B' }}>Koppel jouw eigen Canvas-account om je persoonlijke cijfers te zien</p>
              </div>
            </div>
            <div className="fb-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ background: '#E7F3FF', borderRadius: 8, padding: '10px 14px' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#1C1E21', fontWeight: 600 }}>Hoe vind je jouw Canvas-token?</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#65676B' }}>1. Ga naar je Canvas-instantie (bijv. <em>canvas.instructure.com</em> of de URL van je school)</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#65676B' }}>2. Klik rechts bovenaan op je profielfoto → <strong>Instellingen</strong></p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#65676B' }}>3. Scroll naar <strong>Goedgekeurde integraties</strong> → <strong>Nieuw toegangstoken aanmaken</strong></p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#65676B' }}>4. Kopieer het token en plak het hieronder</p>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#65676B', display: 'block', marginBottom: 6 }}>Canvas-URL (URL van je school)</label>
                <input className="fb-input" placeholder="https://canvas.instructure.com" value={canvasUrl} onChange={e => setCanvasUrl(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#65676B', display: 'block', marginBottom: 6 }}>Toegangstoken</label>
                <input className="fb-input" type="password" placeholder="Jouw Canvas-token" value={canvasToken} onChange={e => setCanvasToken(e.target.value)} />
              </div>

              {testResult && (
                <div style={{ background: testResult.startsWith('✅') ? '#D4EDDA' : '#F8D7DA', borderRadius: 8, padding: '10px 14px', fontSize: 14, color: testResult.startsWith('✅') ? '#155724' : '#721C24', fontWeight: 600 }}>
                  {testResult}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="fb-btn fb-btn-secondary" onClick={testCanvas} disabled={testing || !canvasUrl.trim() || !canvasToken.trim()} style={{ opacity: (testing || !canvasUrl.trim() || !canvasToken.trim()) ? 0.5 : 1 }}>
                  {testing ? 'Testen…' : '🔍 Verbinding testen'}
                </button>
                <button className="fb-btn fb-btn-primary" onClick={saveCanvas} disabled={saving} style={{ opacity: saving ? 0.6 : 1 }}>
                  {saving ? 'Opslaan…' : 'Canvas koppelen'}
                </button>
              </div>
            </div>
          </div>

          {/* Spotify */}
          <div className="fb-card">
            <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: '#1DB954', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>🎵</div>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1C1E21' }}>Spotify</h2>
                <p style={{ margin: 0, fontSize: 13, color: '#65676B' }}>Koppel Spotify voor volledige afspeelbesturing in het muziekwidget</p>
              </div>
            </div>
            <div className="fb-card-body">
              <a href="/api/auth/spotify" className="fb-btn fb-btn-primary" style={{ textDecoration: 'none', background: '#1DB954', display: 'inline-flex' }}>
                Spotify koppelen
              </a>
            </div>
          </div>

          {/* Google Calendar */}
          <div className="fb-card">
            <div style={{ padding: '16px 16px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>📅</div>
              <div>
                <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#1C1E21' }}>Google Calendar</h2>
                <p style={{ margin: 0, fontSize: 13, color: '#65676B' }}>Synchroniseer je Google-agenda automatisch</p>
              </div>
            </div>
            <div className="fb-card-body">
              <a href="/api/auth/google-calendar" className="fb-btn fb-btn-primary" style={{ textDecoration: 'none', background: '#4285F4', display: 'inline-flex' }}>
                Google Calendar koppelen
              </a>
            </div>
          </div>
        </>
      )}

      {toast && <div className="fb-toast">✓ {toast}</div>}
    </div>
  )
}
