'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string; display_name: string; email?: string
  is_admin: boolean; is_superadmin: boolean; is_blocked: boolean
  created_at?: string
}

function RoleBadge({ p }: { p: Profile }) {
  if (p.is_superadmin) return <span style={{ fontSize: 11, background: '#f3e8ff', color: '#7e22ce', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>Superadmin</span>
  if (p.is_admin)      return <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>Admin</span>
  return <span style={{ fontSize: 11, background: '#f4f4f4', color: '#5b5b5b', borderRadius: 6, padding: '2px 7px', fontWeight: 600 }}>Gebruiker</span>
}

export default function GebruikersBeheerPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [saving, setSaving]     = useState<string | null>(null)
  const [toast, setToast]       = useState<string | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/auth/login'); return }
      const { data: me } = await supabase.from('profiles').select('is_superadmin').eq('id', data.session.user.id).single()
      if (!me?.is_superadmin) { router.replace('/platform'); return }
      setIsSuperAdmin(true)
      await loadProfiles()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProfiles() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, email, is_admin, is_superadmin, is_blocked, created_at')
      .order('display_name')
    if (data) setProfiles(data as Profile[])
    setLoading(false)
  }

  async function updateProfile(id: string, update: Partial<Profile>) {
    setSaving(id)
    await supabase.from('profiles').update(update).eq('id', id)
    setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...update } : p))
    setSaving(null)
    showToast('Opgeslagen')
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const filtered = profiles.filter(p =>
    (p.display_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading || !isSuperAdmin) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#9333ea', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 10, background: '#f3e8ff', color: '#7e22ce', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>SUPERADMIN</span>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#242424', margin: 0 }}>Gebruikersbeheer</h1>
        </div>
        <p style={{ fontSize: 13, color: '#5b5b5b', margin: 0 }}>{profiles.length} accounts · Beheer rollen en toegang</p>
      </div>

      {/* Zoekbalk */}
      <div style={{ marginBottom: 16 }}>
        <input
          style={{ width: '100%', border: '1px solid #e8e8e8', borderRadius: 8, padding: '9px 14px', fontSize: 13, background: '#fff', boxSizing: 'border-box' }}
          placeholder="Zoek op naam of e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Gebruikers', count: profiles.filter(p => !p.is_admin && !p.is_superadmin).length, color: '#5b5b5b' },
          { label: 'Admins', count: profiles.filter(p => p.is_admin).length, color: '#15803d' },
          { label: 'Superadmins', count: profiles.filter(p => p.is_superadmin).length, color: '#7e22ce' },
          { label: 'Geblokkeerd', count: profiles.filter(p => p.is_blocked).length, color: '#dc2626' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: s.color, margin: 0 }}>{s.count}</p>
            <p style={{ fontSize: 11, color: '#5b5b5b', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Gebruikerslijst — kaarten (werkt op mobiel) */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>Geen gebruikers gevonden</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((p) => (
            <div key={p.id} style={{ background: p.is_blocked ? '#fef2f2' : '#fff', border: `1px solid ${p.is_blocked ? '#fecaca' : '#e5e7eb'}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              {/* Avatar */}
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: p.is_superadmin ? '#9333ea' : p.is_admin ? '#16a34a' : '#ff520e', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                {(p.display_name ?? '?')[0].toUpperCase()}
              </div>
              {/* Info */}
              <div style={{ flex: 1, minWidth: 120 }}>
                <p style={{ margin: 0, fontWeight: 600, color: '#111827', fontSize: 14 }}>{p.display_name ?? 'Onbekend'}</p>
                {p.email && <p style={{ margin: '1px 0 4px', fontSize: 12, color: '#9ca3af' }}>{p.email}</p>}
                <RoleBadge p={p} />
              </div>
              {/* Acties */}
              {!p.is_superadmin && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                  <button onClick={() => updateProfile(p.id, { is_admin: !p.is_admin })} disabled={saving === p.id}
                    style={{ background: p.is_admin ? '#dcfce7' : '#f3f4f6', color: p.is_admin ? '#15803d' : '#374151', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: saving === p.id ? 0.5 : 1 }}>
                    {p.is_admin ? '✓ Admin' : 'Admin maken'}
                  </button>
                  <button onClick={() => updateProfile(p.id, { is_blocked: !p.is_blocked })} disabled={saving === p.id}
                    style={{ background: p.is_blocked ? '#fee2e2' : '#f3f4f6', color: p.is_blocked ? '#dc2626' : '#374151', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: saving === p.id ? 0.5 : 1 }}>
                    {p.is_blocked ? '✓ Geblokkeerd' : 'Blokkeer'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#242424', color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500, zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.20)' }}>
          ✓ {toast}
        </div>
      )}
    </div>
  )
}
