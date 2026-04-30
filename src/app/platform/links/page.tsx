'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Category { id: string; name: string; icon: string; position: number }
interface LinkRow   { id: string; category_id: string; label: string; url: string; description?: string }

const ICONS = ['🔗','🏛️','🖥️','📚','🌐','🎓','📄','🎯','💡','📊','🔬','🗺️','📝','🏠']

export default function LinksPage() {
  const [cats, setCats]       = useState<Category[]>([])
  const [links, setLinks]     = useState<LinkRow[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [filter, setFilter]   = useState('Alle')
  const [toast, setToast]     = useState<string | null>(null)

  // Modals
  const [catModal,  setCatModal]  = useState<Partial<Category> | null>(null)
  const [linkModal, setLinkModal] = useState<Partial<LinkRow> | null>(null)
  const [delCat,    setDelCat]    = useState<Category | null>(null)
  const [delLink,   setDelLink]   = useState<LinkRow | null>(null)
  const [saving,    setSaving]    = useState(false)

  useEffect(() => {
    load()
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const { data: p } = await supabase.from('profiles').select('is_admin, is_superadmin').eq('id', data.session.user.id).single()
      setIsAdmin((p?.is_admin || p?.is_superadmin) ?? false)
    })
  }, [])

  async function load() {
    const [cRes, lRes] = await Promise.all([
      supabase.from('link_categories').select('*').order('position'),
      supabase.from('links').select('*').order('created_at'),
    ])
    if (cRes.data) setCats(cRes.data)
    if (lRes.data) setLinks(lRes.data)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  /* ── Categories ──────────────────────────────────────────── */
  async function saveCategory() {
    if (!catModal?.name) return
    setSaving(true)
    if (catModal.id) {
      await supabase.from('link_categories').update({ name: catModal.name, icon: catModal.icon ?? '🔗' }).eq('id', catModal.id)
    } else {
      await supabase.from('link_categories').insert({ name: catModal.name, icon: catModal.icon ?? '🔗', position: cats.length + 1 })
    }
    await load(); setCatModal(null); setSaving(false)
    showToast(catModal.id ? 'Afdeling bijgewerkt' : 'Afdeling toegevoegd')
  }

  async function deleteCategory() {
    if (!delCat) return
    await supabase.from('link_categories').delete().eq('id', delCat.id)
    await load(); setDelCat(null)
    showToast('Afdeling verwijderd')
  }

  /* ── Links ───────────────────────────────────────────────── */
  async function saveLink() {
    if (!linkModal?.label || !linkModal?.url || !linkModal?.category_id) return
    setSaving(true)
    if (linkModal.id) {
      await supabase.from('links').update({ label: linkModal.label, url: linkModal.url, description: linkModal.description ?? null, category_id: linkModal.category_id }).eq('id', linkModal.id)
    } else {
      await supabase.from('links').insert({ label: linkModal.label, url: linkModal.url, description: linkModal.description ?? null, category_id: linkModal.category_id })
    }
    await load(); setLinkModal(null); setSaving(false)
    showToast(linkModal.id ? 'Link bijgewerkt' : 'Link toegevoegd')
  }

  async function deleteLink() {
    if (!delLink) return
    await supabase.from('links').delete().eq('id', delLink.id)
    setLinks(prev => prev.filter(l => l.id !== delLink.id)); setDelLink(null)
    showToast('Link verwijderd')
  }

  const activeCats = filter === 'Alle' ? cats : cats.filter(c => c.name === filter)

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#242424', margin: 0 }}>🔗 Handige links</h1>
          <p style={{ fontSize: 13, color: '#5b5b5b', margin: '2px 0 0' }}>Alle belangrijke bronnen op één plek.</p>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setCatModal({ icon: '🔗' })}
              style={{ background: '#fff', border: '1px solid #e8e8e8', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', color: '#5b5b5b' }}>
              + Afdeling
            </button>
            <button onClick={() => setLinkModal({ category_id: cats[0]?.id })}
              style={{ background: '#ff520e', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              + Link
            </button>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {['Alle', ...cats.map(c => c.name)].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              fontSize: 12, padding: '5px 14px', borderRadius: 20, fontWeight: 500, cursor: 'pointer', border: 'none',
              background: filter === f ? '#ff520e' : '#fff',
              color: filter === f ? '#fff' : '#5b5b5b',
              boxShadow: filter === f ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
            }}>
            {f}
          </button>
        ))}
      </div>

      {/* Links grouped by category */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {activeCats.map(cat => {
          const catLinks = links.filter(l => l.category_id === cat.id)
          if (catLinks.length === 0 && !isAdmin) return null
          return (
            <div key={cat.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 18 }}>{cat.icon}</span>
                <h2 style={{ fontSize: 13, fontWeight: 700, color: '#5b5b5b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>{cat.name}</h2>
                <div style={{ flex: 1, height: 1, background: '#e8e8e8' }} />
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setLinkModal({ category_id: cat.id })}
                      style={{ background: 'none', border: '1px solid #e8e8e8', borderRadius: 6, padding: '2px 8px', fontSize: 11, cursor: 'pointer', color: '#ff520e', fontWeight: 600 }}>
                      + link
                    </button>
                    <button onClick={() => setCatModal({ id: cat.id, name: cat.name, icon: cat.icon })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#9ca3af' }}
                      title="Afdeling bewerken">✏️</button>
                    <button onClick={() => setDelCat(cat)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#9ca3af' }}
                      title="Afdeling verwijderen"
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
                    >🗑</button>
                  </div>
                )}
              </div>

              {catLinks.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9ca3af', paddingLeft: 4 }}>Nog geen links in deze afdeling.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                  {catLinks.map(l => (
                    <div key={l.id} style={{ position: 'relative' }}>
                      <a href={l.url} target={l.url.startsWith('/') ? '_self' : '_blank'} rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, padding: '14px 16px', textDecoration: 'none', transition: 'box-shadow 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.10)')}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                      >
                        <span style={{ fontSize: 20, flexShrink: 0 }}>{cat.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#242424', margin: 0 }}>{l.label}</p>
                          {l.description && <p style={{ fontSize: 11, color: '#5b5b5b', margin: '2px 0 0' }}>{l.description}</p>}
                          <p style={{ fontSize: 11, color: '#9ca3af', margin: '3px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.url}</p>
                        </div>
                        <span style={{ color: '#9ca3af', flexShrink: 0, fontSize: 16 }}>↗</span>
                      </a>
                      {isAdmin && (
                        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 4 }}>
                          <button onClick={() => setLinkModal({ id: l.id, label: l.label, url: l.url, description: l.description, category_id: l.category_id })}
                            style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #e8e8e8', borderRadius: 5, padding: '2px 6px', fontSize: 12, cursor: 'pointer', color: '#5b5b5b' }}>✏️</button>
                          <button onClick={() => setDelLink(l)}
                            style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid #e8e8e8', borderRadius: 5, padding: '2px 6px', fontSize: 12, cursor: 'pointer', color: '#5b5b5b' }}
                            onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                            onMouseLeave={e => (e.currentTarget.style.color = '#5b5b5b')}
                          >🗑</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Category modal ─────────────────────────────────── */}
      {catModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 400, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{catModal.id ? 'Afdeling bewerken' : 'Nieuwe afdeling'}</p>
              <button onClick={() => setCatModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <input style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
                placeholder="Naam afdeling*" value={catModal.name ?? ''}
                onChange={e => setCatModal({ ...catModal, name: e.target.value })} />
              <div>
                <p style={{ fontSize: 12, color: '#5b5b5b', margin: '0 0 6px' }}>Icoon</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ICONS.map(ic => (
                    <button key={ic} onClick={() => setCatModal({ ...catModal, icon: ic })}
                      style={{ fontSize: 20, background: catModal.icon === ic ? '#fff3ef' : '#f4f4f4', border: `2px solid ${catModal.icon === ic ? '#ff520e' : 'transparent'}`, borderRadius: 6, padding: '4px 6px', cursor: 'pointer' }}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setCatModal(null)} style={{ background: '#f4f4f4', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', color: '#5b5b5b' }}>Annuleren</button>
              <button onClick={saveCategory} disabled={saving || !catModal.name}
                style={{ background: '#ff520e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving || !catModal.name ? 0.5 : 1 }}>
                {saving ? 'Opslaan…' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Link modal ─────────────────────────────────────── */}
      {linkModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 440, width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{linkModal.id ? 'Link bewerken' : 'Nieuwe link'}</p>
              <button onClick={() => setLinkModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
              <select style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
                value={linkModal.category_id ?? ''} onChange={e => setLinkModal({ ...linkModal, category_id: e.target.value })}>
                {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <input style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
                placeholder="Label*" value={linkModal.label ?? ''}
                onChange={e => setLinkModal({ ...linkModal, label: e.target.value })} />
              <input style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'monospace' }}
                placeholder="URL* (https://... of /intern/pad)" value={linkModal.url ?? ''}
                onChange={e => setLinkModal({ ...linkModal, url: e.target.value })} />
              <input style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
                placeholder="Beschrijving (optioneel)" value={linkModal.description ?? ''}
                onChange={e => setLinkModal({ ...linkModal, description: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setLinkModal(null)} style={{ background: '#f4f4f4', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', color: '#5b5b5b' }}>Annuleren</button>
              <button onClick={saveLink} disabled={saving || !linkModal.label || !linkModal.url || !linkModal.category_id}
                style={{ background: '#ff520e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: saving || !linkModal.label || !linkModal.url ? 0.5 : 1 }}>
                {saving ? 'Opslaan…' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmations ───────────────────────────── */}
      {(delCat || delLink) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 360, width: '100%', textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#242424', marginBottom: 8 }}>
              {delCat ? `Afdeling "${delCat.name}" verwijderen?` : `Link "${delLink?.label}" verwijderen?`}
            </p>
            <p style={{ fontSize: 13, color: '#5b5b5b', marginBottom: 20 }}>
              {delCat ? 'Alle links in deze afdeling worden ook verwijderd.' : 'Dit kan niet ongedaan worden gemaakt.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => { setDelCat(null); setDelLink(null) }}
                style={{ background: '#f4f4f4', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, cursor: 'pointer', fontWeight: 500, color: '#5b5b5b' }}>
                Annuleren
              </button>
              <button onClick={delCat ? deleteCategory : deleteLink}
                style={{ background: '#ef4444', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, cursor: 'pointer', fontWeight: 600, color: '#fff' }}>
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#242424', color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500, zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
          ✓ {toast}
        </div>
      )}
    </div>
  )
}
