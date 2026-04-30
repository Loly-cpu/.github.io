'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Profile {
  id: string; display_name: string; email?: string
  is_admin: boolean; is_superadmin: boolean; is_blocked: boolean
  banned_until?: string | null; ban_reason?: string | null
  ban_channels?: string[] | null; created_at?: string
}

interface BanConfig {
  profile: Profile
  channels: string[]      // [] = volledig platform
  duration: string        // '1h' | '6h' | '24h' | '48h' | '7d' | '30d' | 'permanent'
  reason: string
}

const CHANNELS = [
  { key: 'berichten',  label: 'Berichten', icon: '💬' },
  { key: 'documenten', label: 'Documenten', icon: '📁' },
  { key: 'formulieren',label: 'Formulieren', icon: '📝' },
]

const DURATIONS = [
  { key: '1h',        label: '1 uur' },
  { key: '6h',        label: '6 uur' },
  { key: '24h',       label: '24 uur' },
  { key: '48h',       label: '2 dagen' },
  { key: '7d',        label: '7 dagen' },
  { key: '30d',       label: '30 dagen' },
  { key: 'permanent', label: 'Permanent' },
]

function durationToDate(dur: string): string | null {
  if (dur === 'permanent') return null
  const now = new Date()
  const map: Record<string, number> = { '1h': 1, '6h': 6, '24h': 24, '48h': 48, '7d': 168, '30d': 720 }
  now.setHours(now.getHours() + (map[dur] ?? 24))
  return now.toISOString()
}

function banLabel(p: Profile): { text: string; color: string } | null {
  if (!p.is_blocked) return null
  const expired = p.banned_until && new Date(p.banned_until) < new Date()
  if (expired) return { text: 'Verlopen', color: '#9ca3af' }
  const scope = !p.ban_channels?.length ? 'Platform' : p.ban_channels.join(', ')
  const until = p.banned_until
    ? `t/m ${new Date(p.banned_until).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
    : 'Permanent'
  return { text: `${scope} · ${until}`, color: '#dc2626' }
}

function RoleBadge({ p }: { p: Profile }) {
  if (p.is_superadmin) return <span style={{ fontSize: 11, background: '#f3e8ff', color: '#7e22ce', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>Superadmin</span>
  if (p.is_admin)      return <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>Admin</span>
  return <span style={{ fontSize: 11, background: '#f4f4f4', color: '#5b5b5b', borderRadius: 6, padding: '2px 7px', fontWeight: 600 }}>Gebruiker</span>
}

// ── Ban dialog ────────────────────────────────────────────────────────────────
function BanDialog({ config, onClose, onConfirm }: {
  config: BanConfig
  onClose: () => void
  onConfirm: (cfg: BanConfig) => void
}) {
  const [local, setLocal] = useState<BanConfig>(config)
  const allPlatform = local.channels.length === 0

  function toggleChannel(key: string) {
    setLocal(c => ({
      ...c,
      channels: c.channels.includes(key)
        ? c.channels.filter(k => k !== key)
        : [...c.channels, key]
    }))
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#fef2f2', border: '2px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🚫</div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#111827' }}>Gebruiker bannen</p>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{local.profile.display_name}</p>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {/* Scope */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bereik</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Volledig platform */}
            <button onClick={() => setLocal(c => ({ ...c, channels: [] }))}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                border: `2px solid ${allPlatform ? '#dc2626' : '#e5e7eb'}`,
                borderRadius: 10, background: allPlatform ? '#fef2f2' : '#fff',
                cursor: 'pointer', textAlign: 'left',
              }}>
              <span style={{ fontSize: 16 }}>🏫</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: allPlatform ? '#dc2626' : '#111827' }}>Volledig platform</p>
                <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Kan nergens meer bij — kan nog wel inloggen</p>
              </div>
              {allPlatform && <span style={{ color: '#dc2626', fontSize: 16 }}>✓</span>}
            </button>

            {/* Per kanaal */}
            <div style={{ border: `2px solid ${!allPlatform ? '#f97316' : '#e5e7eb'}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '8px 14px', background: !allPlatform ? '#fff7ed' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: !allPlatform ? '#ea580c' : '#6b7280' }}>Specifieke kanalen</p>
              </div>
              {CHANNELS.map(ch => {
                const active = local.channels.includes(ch.key)
                return (
                  <button key={ch.key}
                    onClick={() => { if (allPlatform) setLocal(c => ({ ...c, channels: [ch.key] })); else toggleChannel(ch.key) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
                      width: '100%', background: active ? '#fff7ed' : '#fff',
                      border: 'none', borderBottom: '1px solid #f4f4f4', cursor: 'pointer', textAlign: 'left',
                    }}>
                    <input type="checkbox" checked={active} readOnly
                      style={{ width: 15, height: 15, accentColor: '#f97316', cursor: 'pointer', flexShrink: 0 }} />
                    <span style={{ fontSize: 15 }}>{ch.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#ea580c' : '#374151' }}>{ch.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Duur */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duur</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {DURATIONS.map(d => (
              <button key={d.key} onClick={() => setLocal(c => ({ ...c, duration: d.key }))}
                style={{
                  padding: '6px 14px', borderRadius: 20, border: `2px solid ${local.duration === d.key ? '#dc2626' : '#e5e7eb'}`,
                  background: local.duration === d.key ? '#fef2f2' : '#fff',
                  color: local.duration === d.key ? '#dc2626' : '#374151',
                  fontSize: 12, fontWeight: local.duration === d.key ? 700 : 400, cursor: 'pointer',
                }}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reden */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Reden <span style={{ fontWeight: 400, textTransform: 'none', color: '#9ca3af' }}>(optioneel)</span></p>
          <textarea
            style={{ width: '100%', border: '2px solid #e5e7eb', borderRadius: 10, padding: '10px 12px', fontSize: 13, resize: 'none', height: 72, fontFamily: 'Roboto, system-ui', boxSizing: 'border-box', outline: 'none' }}
            placeholder="Bv. spam, ongepast gedrag, misbruik..."
            value={local.reason}
            onChange={e => setLocal(c => ({ ...c, reason: e.target.value }))}
            onFocus={e => (e.target.style.borderColor = '#dc2626')}
            onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
          />
        </div>

        {/* Samenvatting */}
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#dc2626' }}>
          <strong>{local.profile.display_name}</strong> wordt {local.duration === 'permanent' ? 'permanent' : `${DURATIONS.find(d => d.key === local.duration)?.label} lang`} gebanned
          {allPlatform ? ' van het volledige platform' : ` van: ${local.channels.map(k => CHANNELS.find(c => c.key === k)?.label).join(', ')}`}.
        </div>

        {/* Acties */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '10px', background: '#f3f4f6', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151' }}>
            Annuleren
          </button>
          <button onClick={() => onConfirm(local)}
            style={{ flex: 1, padding: '10px', background: '#dc2626', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', color: '#fff' }}>
            🚫 Bannen
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Hoofd pagina ──────────────────────────────────────────────────────────────
export default function GebruikersBeheerPage() {
  const router = useRouter()
  const [profiles, setProfiles]     = useState<Profile[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [saving, setSaving]         = useState<string | null>(null)
  const [toast, setToast]           = useState<string | null>(null)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [banConfig, setBanConfig]   = useState<BanConfig | null>(null)

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
      .select('id, display_name, email, is_admin, is_superadmin, is_blocked, banned_until, ban_reason, ban_channels, created_at')
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

  async function applyBan(cfg: BanConfig) {
    setBanConfig(null)
    const bannedUntil = durationToDate(cfg.duration)
    await updateProfile(cfg.profile.id, {
      is_blocked: true,
      banned_until: bannedUntil,
      ban_reason: cfg.reason || null,
      ban_channels: cfg.channels.length ? cfg.channels : null,
    } as Partial<Profile>)
    showToast(`${cfg.profile.display_name} gebanned`)
  }

  async function unban(id: string) {
    await updateProfile(id, {
      is_blocked: false,
      banned_until: null,
      ban_reason: null,
      ban_channels: null,
    } as Partial<Profile>)
    showToast('Ban opgeheven')
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const filtered = profiles.filter(p =>
    (p.display_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (p.email ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    users:      profiles.filter(p => !p.is_admin && !p.is_superadmin).length,
    admins:     profiles.filter(p => p.is_admin).length,
    superadmins:profiles.filter(p => p.is_superadmin).length,
    banned:     profiles.filter(p => p.is_blocked && (!p.banned_until || new Date(p.banned_until) > new Date())).length,
  }

  if (loading || !isSuperAdmin) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#9333ea', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 10, background: '#f3e8ff', color: '#7e22ce', borderRadius: 6, padding: '2px 7px', fontWeight: 700 }}>SUPERADMIN</span>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#242424', margin: 0 }}>Gebruikersbeheer</h1>
        </div>
        <p style={{ fontSize: 13, color: '#5b5b5b', margin: 0 }}>{profiles.length} accounts</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Gebruikers',  count: stats.users,       color: '#5b5b5b', bg: '#f9fafb' },
          { label: 'Admins',      count: stats.admins,      color: '#15803d', bg: '#f0fdf4' },
          { label: 'Superadmins', count: stats.superadmins, color: '#7e22ce', bg: '#faf5ff' },
          { label: 'Gebanned',    count: stats.banned,      color: '#dc2626', bg: '#fef2f2' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 10, padding: '10px 18px', textAlign: 'center', minWidth: 90 }}>
            <p style={{ fontSize: 22, fontWeight: 700, color: s.color, margin: 0, lineHeight: 1 }}>{s.count}</p>
            <p style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 0' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Zoekbalk */}
      <div style={{ marginBottom: 16 }}>
        <input
          style={{ width: '100%', border: '1px solid #e8e8e8', borderRadius: 10, padding: '10px 14px', fontSize: 13, background: '#fff', boxSizing: 'border-box', outline: 'none' }}
          placeholder="Zoek op naam of e-mail..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          onFocus={e => (e.target.style.borderColor = '#9333ea')}
          onBlur={e => (e.target.style.borderColor = '#e8e8e8')}
        />
      </div>

      {/* Gebruikerslijst */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af', fontSize: 13 }}>Geen gebruikers gevonden</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((p) => {
            const ban = banLabel(p)
            const isBanned = p.is_blocked && !!ban && ban.color === '#dc2626'
            return (
              <div key={p.id} style={{
                background: isBanned ? '#fef2f2' : '#fff',
                border: `1px solid ${isBanned ? '#fecaca' : '#e5e7eb'}`,
                borderRadius: 14, padding: '14px 16px',
                display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap',
                transition: 'box-shadow 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                {/* Avatar */}
                <div style={{
                  width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                  background: isBanned ? '#fecaca' : p.is_superadmin ? '#9333ea' : p.is_admin ? '#16a34a' : '#ff520e',
                  color: isBanned ? '#dc2626' : '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700,
                }}>
                  {isBanned ? '🚫' : (p.display_name ?? '?')[0].toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#111827', fontSize: 14 }}>{p.display_name ?? 'Onbekend'}</p>
                    <RoleBadge p={p} />
                  </div>
                  {p.email && <p style={{ margin: '1px 0 4px', fontSize: 12, color: '#9ca3af' }}>{p.email}</p>}
                  {ban && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <span style={{ fontSize: 11, background: `${ban.color}15`, color: ban.color, borderRadius: 6, padding: '2px 8px', fontWeight: 600 }}>
                        🚫 {ban.text}
                      </span>
                      {p.ban_reason && (
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>· {p.ban_reason}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Acties */}
                {!p.is_superadmin && (
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Admin toggle */}
                    <button onClick={() => updateProfile(p.id, { is_admin: !p.is_admin })} disabled={saving === p.id}
                      style={{
                        background: p.is_admin ? '#dcfce7' : '#f3f4f6',
                        color: p.is_admin ? '#15803d' : '#374151',
                        border: `1px solid ${p.is_admin ? '#86efac' : '#e5e7eb'}`,
                        borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        opacity: saving === p.id ? 0.5 : 1, transition: 'all 0.15s',
                      }}>
                      {p.is_admin ? '✓ Admin' : 'Admin'}
                    </button>

                    {/* Ban / Unban */}
                    {isBanned ? (
                      <button onClick={() => unban(p.id)} disabled={saving === p.id}
                        style={{
                          background: '#fff', color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          opacity: saving === p.id ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                        ↩ Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => setBanConfig({ profile: p, channels: [], duration: '24h', reason: '' })}
                        disabled={saving === p.id}
                        style={{
                          background: '#fff', color: '#6b7280',
                          border: '1px solid #e5e7eb',
                          borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          opacity: saving === p.id ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 4,
                          transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.borderColor = '#fecaca' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#6b7280'; e.currentTarget.style.borderColor = '#e5e7eb' }}
                      >
                        🚫 Bannen
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Ban dialog */}
      {banConfig && (
        <BanDialog
          config={banConfig}
          onClose={() => setBanConfig(null)}
          onConfirm={applyBan}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#242424', color: '#fff', borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 500, zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.20)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#4ade80' }}>✓</span> {toast}
        </div>
      )}
    </div>
  )
}
