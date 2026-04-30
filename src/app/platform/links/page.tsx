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
    showToast(catModal.id ? 'Categorie bijgewerkt' : 'Categorie toegevoegd')
  }

  async function deleteCategory() {
    if (!delCat) return
    await supabase.from('link_categories').delete().eq('id', delCat.id)
    await load(); setDelCat(null)
    showToast('Categorie verwijderd')
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
    <div style={{ maxWidth: 960, margin: '0 auto' }}>

      {/* ── Page header card ── */}
      <div className="fb-card">
        <div className="fb-card-header">
          <span>🔗 Links</span>
          {isAdmin && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="fb-btn fb-btn-secondary fb-btn-sm"
                onClick={() => setCatModal({ icon: '🔗' })}
              >
                + Categorie
              </button>
              <button
                className="fb-btn fb-btn-primary fb-btn-sm"
                onClick={() => setLinkModal({ category_id: cats[0]?.id })}
              >
                + Link
              </button>
            </div>
          )}
        </div>
        <div style={{ padding: '4px 16px 12px', color: '#65676B', fontSize: 14 }}>
          Alle belangrijke bronnen op één plek.
        </div>

        {/* ── Filter tabs ── */}
        <div className="fb-filter-tabs" style={{ borderTop: '1px solid #E4E6EB', paddingTop: 12 }}>
          {['Alle', ...cats.map(c => c.name)].map((f) => (
            <button
              key={f}
              className={`fb-filter-btn${filter === f ? ' active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* ── Links grouped by category ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {activeCats.map(cat => {
          const catLinks = links.filter(l => l.category_id === cat.id)
          if (catLinks.length === 0 && !isAdmin) return null
          return (
            <div key={cat.id} className="fb-card">
              {/* Category header */}
              <div className="fb-card-header" style={{ fontSize: 16 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>{cat.icon}</span>
                  <span style={{ color: '#1C1E21', fontWeight: 700 }}>{cat.name}</span>
                </span>
                {isAdmin && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="fb-btn fb-btn-primary fb-btn-sm"
                      style={{ fontSize: 13 }}
                      onClick={() => setLinkModal({ category_id: cat.id })}
                    >
                      + link
                    </button>
                    <button
                      className="fb-btn fb-btn-ghost fb-btn-sm"
                      onClick={() => setCatModal({ id: cat.id, name: cat.name, icon: cat.icon })}
                      title="Categorie bewerken"
                      style={{ fontSize: 16 }}
                    >
                      ✏️
                    </button>
                    <button
                      className="fb-btn fb-btn-ghost fb-btn-sm"
                      onClick={() => setDelCat(cat)}
                      title="Categorie verwijderen"
                      style={{ fontSize: 16 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#E41E3F')}
                      onMouseLeave={e => (e.currentTarget.style.color = '')}
                    >
                      🗑
                    </button>
                  </div>
                )}
              </div>

              <div className="fb-card-body">
                {catLinks.length === 0 ? (
                  <p style={{ fontSize: 14, color: '#65676B', margin: 0 }}>Nog geen links in deze categorie.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {catLinks.map(l => (
                      <div
                        key={l.id}
                        style={{ position: 'relative' }}
                        className="link-row-wrapper"
                      >
                        <a
                          href={l.url}
                          target={l.url.startsWith('/') ? '_self' : '_blank'}
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '10px 12px',
                            borderRadius: 8,
                            textDecoration: 'none',
                            color: '#1C1E21',
                            transition: 'background .1s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#F2F2F2')}
                          onMouseLeave={e => (e.currentTarget.style.background = '')}
                        >
                          <span
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: '50%',
                              background: '#E7F3FF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 18,
                              flexShrink: 0,
                            }}
                          >
                            {cat.icon}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 15, fontWeight: 600, color: '#1C1E21', margin: 0 }}>{l.label}</p>
                            {l.description && (
                              <p style={{ fontSize: 13, color: '#65676B', margin: '1px 0 0' }}>{l.description}</p>
                            )}
                            <p style={{
                              fontSize: 12,
                              color: '#65676B',
                              margin: '2px 0 0',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {l.url}
                            </p>
                          </div>
                          <span style={{ color: '#1877F2', fontSize: 18, flexShrink: 0 }}>↗</span>
                        </a>

                        {isAdmin && (
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            right: 48,
                            transform: 'translateY(-50%)',
                            display: 'flex',
                            gap: 4,
                          }}>
                            <button
                              className="fb-btn fb-btn-secondary fb-btn-sm"
                              style={{ fontSize: 13, padding: '4px 8px' }}
                              onClick={() => setLinkModal({ id: l.id, label: l.label, url: l.url, description: l.description, category_id: l.category_id })}
                            >
                              ✏️
                            </button>
                            <button
                              className="fb-btn fb-btn-secondary fb-btn-sm"
                              style={{ fontSize: 13, padding: '4px 8px' }}
                              onClick={() => setDelLink(l)}
                              onMouseEnter={e => { e.currentTarget.style.background = '#E41E3F'; e.currentTarget.style.color = '#fff' }}
                              onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '' }}
                            >
                              🗑
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Category modal ── */}
      {catModal && (
        <div className="fb-modal-overlay">
          <div className="fb-modal">
            <div className="fb-modal-header">
              <h2 className="fb-modal-title">{catModal.id ? 'Categorie bewerken' : 'Nieuwe categorie'}</h2>
              <button className="fb-modal-close" onClick={() => setCatModal(null)}>×</button>
            </div>
            <div className="fb-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input
                className="fb-input"
                placeholder="Naam categorie*"
                value={catModal.name ?? ''}
                onChange={e => setCatModal({ ...catModal, name: e.target.value })}
              />
              <div>
                <p style={{ fontSize: 13, color: '#65676B', margin: '0 0 8px', fontWeight: 600 }}>Icoon</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {ICONS.map(ic => (
                    <button
                      key={ic}
                      onClick={() => setCatModal({ ...catModal, icon: ic })}
                      style={{
                        fontSize: 20,
                        background: catModal.icon === ic ? '#E7F3FF' : '#F0F2F5',
                        border: `2px solid ${catModal.icon === ic ? '#1877F2' : 'transparent'}`,
                        borderRadius: 6,
                        padding: '4px 6px',
                        cursor: 'pointer',
                      }}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="fb-modal-footer">
              <button className="fb-btn fb-btn-secondary" onClick={() => setCatModal(null)}>Annuleren</button>
              <button
                className="fb-btn fb-btn-primary"
                onClick={saveCategory}
                disabled={saving || !catModal.name}
                style={{ opacity: saving || !catModal.name ? 0.5 : 1 }}
              >
                {saving ? 'Opslaan…' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Link modal ── */}
      {linkModal && (
        <div className="fb-modal-overlay">
          <div className="fb-modal">
            <div className="fb-modal-header">
              <h2 className="fb-modal-title">{linkModal.id ? 'Link bewerken' : 'Nieuwe link'}</h2>
              <button className="fb-modal-close" onClick={() => setLinkModal(null)}>×</button>
            </div>
            <div className="fb-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <select
                className="fb-input"
                value={linkModal.category_id ?? ''}
                onChange={e => setLinkModal({ ...linkModal, category_id: e.target.value })}
              >
                {cats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
              <input
                className="fb-input"
                placeholder="Label*"
                value={linkModal.label ?? ''}
                onChange={e => setLinkModal({ ...linkModal, label: e.target.value })}
              />
              <input
                className="fb-input"
                placeholder="URL* (https://... of /intern/pad)"
                value={linkModal.url ?? ''}
                onChange={e => setLinkModal({ ...linkModal, url: e.target.value })}
                style={{ fontFamily: 'monospace' }}
              />
              <input
                className="fb-input"
                placeholder="Beschrijving (optioneel)"
                value={linkModal.description ?? ''}
                onChange={e => setLinkModal({ ...linkModal, description: e.target.value })}
              />
            </div>
            <div className="fb-modal-footer">
              <button className="fb-btn fb-btn-secondary" onClick={() => setLinkModal(null)}>Annuleren</button>
              <button
                className="fb-btn fb-btn-primary"
                onClick={saveLink}
                disabled={saving || !linkModal.label || !linkModal.url || !linkModal.category_id}
                style={{ opacity: saving || !linkModal.label || !linkModal.url ? 0.5 : 1 }}
              >
                {saving ? 'Opslaan…' : 'Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmations ── */}
      {(delCat || delLink) && (
        <div className="fb-modal-overlay">
          <div className="fb-modal" style={{ maxWidth: 400 }}>
            <div className="fb-modal-header">
              <h2 className="fb-modal-title" style={{ fontSize: 18 }}>Verwijderen?</h2>
              <button className="fb-modal-close" onClick={() => { setDelCat(null); setDelLink(null) }}>×</button>
            </div>
            <div className="fb-modal-body" style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#1C1E21', margin: '0 0 8px' }}>
                {delCat ? `"${delCat.name}" verwijderen?` : `"${delLink?.label}" verwijderen?`}
              </p>
              <p style={{ fontSize: 14, color: '#65676B', margin: 0 }}>
                {delCat ? 'Alle links in deze categorie worden ook verwijderd.' : 'Dit kan niet ongedaan worden gemaakt.'}
              </p>
            </div>
            <div className="fb-modal-footer" style={{ justifyContent: 'center' }}>
              <button
                className="fb-btn fb-btn-secondary"
                onClick={() => { setDelCat(null); setDelLink(null) }}
              >
                Annuleren
              </button>
              <button
                className="fb-btn fb-btn-danger"
                onClick={delCat ? deleteCategory : deleteLink}
              >
                Verwijderen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="fb-toast">✓ {toast}</div>
      )}
    </div>
  )
}
