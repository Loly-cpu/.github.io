'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useDeleteConfirm } from '@/components/DeleteConfirm'

interface Doc {
  id: string; title: string; description?: string; subject?: string
  file_url: string; file_name: string; file_size?: number
  downloads: number; created_at: string; is_private: boolean; user_id: string
  profiles?: { display_name: string }
}

const SUBJECTS = ['Aardrijkskunde','Nederlands','Frans','Engels','Wiskunde','Economie','Overig']
const MAX_PRIVATE = 15

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(0)} KB`
  return `${(bytes/1024/1024).toFixed(1)} MB`
}

function fileIcon(name: string) {
  if (name.endsWith('.pdf'))        return '📕'
  if (name.match(/\.(docx?)$/))    return '📄'
  if (name.match(/\.(pptx?)$/))    return '📊'
  if (name.match(/\.(xlsx?)$/))    return '📈'
  if (name.match(/\.(png|jpg|jpeg|webp)$/)) return '🖼️'
  return '📎'
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DocumentenPage() {
  const [docs, setDocs]         = useState<Doc[]>([])
  const [userId, setUserId]     = useState<string | null>(null)
  const [filter, setFilter]     = useState('Alle vakken')
  const [tab, setTab]           = useState<'gedeeld'|'privé'>('gedeeld')
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading]   = useState(false)
  const [uploadErr, setUploadErr]   = useState('')
  const [toast, setToast]       = useState<string|null>(null)
  const deleteConfirm           = useDeleteConfirm()
  const [privateCount, setPrivateCount] = useState(0)
  const [form, setForm] = useState({ title: '', description: '', subject: 'Overig', is_private: false })
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null
      setUserId(uid)
      await loadDocs(uid)
    })
  }, [])

  async function loadDocs(uid: string | null) {
    // Gebruik geen join — haal docs apart op om RLS-join-problemen te vermijden
    const { data, error } = await supabase
      .from('documents')
      .select('id, title, description, subject, file_url, file_name, file_size, downloads, created_at, is_private, user_id')
      .order('created_at', { ascending: false })
    if (error) { console.error('Docs error:', error.message); return }
    if (!data) return

    // Haal display_names op voor uploaders
    const uids = [...new Set(data.map(d => d.user_id).filter(Boolean))]
    let nameMap: Record<string, string> = {}
    if (uids.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles').select('id, display_name').in('id', uids)
      if (profiles) profiles.forEach(p => { nameMap[p.id] = p.display_name })
    }

    const enriched = data.map(d => ({
      ...d,
      profiles: { display_name: nameMap[d.user_id] ?? 'Anoniem' },
    }))
    setDocs(enriched as Doc[])
    if (uid) setPrivateCount(enriched.filter(d => d.is_private && d.user_id === uid).length)
  }

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500) }

  async function uploadDoc() {
    const file = fileRef.current?.files?.[0]
    if (!file || !userId || !form.title) return
    if (form.is_private && privateCount >= MAX_PRIVATE) {
      setUploadErr(`Je hebt het maximum van ${MAX_PRIVATE} privédocumenten bereikt.`)
      return
    }
    if (file.size > 50 * 1024 * 1024) { setUploadErr('Bestand mag max 50 MB zijn.'); return }
    setUploading(true); setUploadErr('')
    try {
      const path = `${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
      const { error: insertError } = await supabase.from('documents').insert({
        user_id: userId, title: form.title, description: form.description || null,
        subject: form.subject, file_url: urlData.publicUrl,
        file_name: file.name, file_size: file.size,
        downloads: 0, is_private: form.is_private,
      })
      if (insertError) throw insertError
      setForm({ title: '', description: '', subject: 'Overig', is_private: false })
      setShowUpload(false)
      if (fileRef.current) fileRef.current.value = ''
      await loadDocs(userId)
      showToast('Document geüpload')
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : 'Upload mislukt.')
    } finally {
      setUploading(false)
    }
  }

  async function downloadDoc(doc: Doc) {
    await supabase.from('documents').update({ downloads: doc.downloads + 1 }).eq('id', doc.id)
    window.open(doc.file_url, '_blank')
  }

  function deleteDoc(id: string, title: string) {
    deleteConfirm({
      title: `"${title}" verwijderen?`,
      body: 'Het bestand wordt permanent verwijderd.',
      prefKey: 'document',
      onConfirm: async () => {
        const { error } = await supabase.from('documents').delete().eq('id', id)
        if (!error) { setDocs(prev => prev.filter(d => d.id !== id)); showToast('Verwijderd') }
      },
    })
  }

  const publicDocs  = docs.filter(d => !d.is_private)
  const privateDocs = docs.filter(d => d.is_private && d.user_id === userId)

  const visibleDocs = (tab === 'gedeeld' ? publicDocs : privateDocs)
    .filter(d => filter === 'Alle vakken' || d.subject === filter)

  const SUBJECTS_ALL = ['Alle vakken', ...SUBJECTS]

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif' }}>

      {/* FB page header */}
      <div className="fb-card">
        <div className="fb-page-cover" style={{ background: 'linear-gradient(135deg, #F5C400, #FF9800)' }} />
        <div className="fb-page-info" style={{ display: 'flex', alignItems: 'flex-end', gap: 16, padding: '0 16px 16px', marginTop: -32 }}>
          <div className="fb-page-icon">📁</div>
          <div style={{ flex: 1, paddingBottom: 4 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1C1E21' }}>Bestanden</h1>
            <p style={{ margin: 0, fontSize: 14, color: '#65676B' }}>{publicDocs.length} gedeeld · {privateDocs.length} privé</p>
          </div>
          {userId && <button onClick={() => setShowUpload(true)} className="fb-btn fb-btn-primary">+ Uploaden</button>}
        </div>

        {/* Tabs */}
        {userId && (
          <div className="fb-tabs">
            {([['gedeeld','🌐 Gedeeld'], ['privé', `🔒 Privé (${privateCount}/${MAX_PRIVATE})`]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`fb-tab-btn ${tab === k ? 'active' : ''}`}>{l}</button>
            ))}
          </div>
        )}
      </div>

      {/* Subject filters */}
      <div className="fb-filter-tabs" style={{ paddingLeft: 0, paddingRight: 0, marginBottom: 8 }}>
        {(['Alle vakken', ...SUBJECTS]).map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`fb-filter-btn ${filter === s ? 'active' : ''}`}>{s}</button>
        ))}
      </div>

      {/* Files */}
      {visibleDocs.length === 0 ? (
        <div className="fb-card" style={{ padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>📂</div>
          <p style={{ fontWeight: 800, fontSize: 18, color: '#1C1E21', margin: '0 0 8px' }}>
            {tab === 'privé' ? 'Geen privébestanden' : 'Nog geen bestanden'}
          </p>
          <p style={{ color: '#65676B', fontSize: 15, margin: '0 0 16px' }}>
            {tab === 'privé' ? `Upload tot ${MAX_PRIVATE} persoonlijke bestanden.` : 'Upload als eerste een samenvatting!'}
          </p>
          {userId && <button onClick={() => setShowUpload(true)} className="fb-btn fb-btn-primary fb-btn-lg">Bestand uploaden</button>}
        </div>
      ) : (
        <div className="fb-card" style={{ overflow: 'hidden' }}>
          {/* Column header */}
          <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 110px 90px 90px 80px', padding: '10px 16px', borderBottom: '1px solid #E4E6EB', fontSize: 12, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <div/>
            <div>Naam</div>
            <div>Vak</div>
            <div>Grootte</div>
            <div>Datum</div>
            <div style={{ textAlign: 'right' }}>Acties</div>
          </div>
          {visibleDocs.map((doc, i) => (
            <div key={doc.id}
              style={{ display: 'grid', gridTemplateColumns: '48px 1fr 110px 90px 90px 80px', padding: '12px 16px', borderBottom: i < visibleDocs.length - 1 ? '1px solid #E4E6EB' : 'none', alignItems: 'center', transition: 'background .1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#F9F9F9')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ fontSize: 24 }}>{fileIcon(doc.file_name)}</div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#1C1E21', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</p>
                {doc.description && <p style={{ fontSize: 13, color: '#65676B', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.description}</p>}
                <p style={{ fontSize: 12, color: '#BEC3C9', margin: 0 }}>door {doc.profiles?.display_name ?? 'Anoniem'}</p>
              </div>
              <div>{doc.subject && <span style={{ background: '#E4E6EB', color: '#1C1E21', borderRadius: 4, padding: '3px 8px', fontSize: 12, fontWeight: 600 }}>{doc.subject}</span>}</div>
              <div style={{ fontSize: 13, color: '#65676B' }}>{formatSize(doc.file_size)}</div>
              <div style={{ fontSize: 13, color: '#65676B' }}>{fmt(doc.created_at)}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button onClick={() => downloadDoc(doc)} className="fb-btn fb-btn-secondary fb-btn-sm">↓</button>
                {userId === doc.user_id && (
                  <button onClick={() => deleteDoc(doc.id, doc.title)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#BEC3C9', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FEE2E2'; e.currentTarget.style.color = '#E41E3F' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#BEC3C9' }}>
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div className="fb-modal-overlay">
          <div className="fb-modal">
            <div className="fb-modal-header">
              <h2 className="fb-modal-title">Bestand uploaden</h2>
              <button className="fb-modal-close" onClick={() => { setShowUpload(false); setUploadErr('') }}>×</button>
            </div>
            <div className="fb-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input className="fb-input" placeholder="Titel*" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              <select className="fb-input" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <textarea className="fb-input" placeholder="Beschrijving (optioneel)" value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={{ height: 72, resize: 'none' }} />
              <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" style={{ fontSize: 14, color: '#1C1E21' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', background: form.is_private ? '#E7F3FF' : '#F0F2F5', border: `1px solid ${form.is_private ? '#1877F2' : 'transparent'}`, borderRadius: 8 }}>
                <input type="checkbox" checked={form.is_private} onChange={e => setForm({...form, is_private: e.target.checked})} style={{ width: 16, height: 16, accentColor: '#1877F2' }} />
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#1C1E21', margin: 0 }}>🔒 Privébestand</p>
                  <p style={{ fontSize: 12, color: '#65676B', margin: 0 }}>Alleen zichtbaar voor jou · {privateCount}/{MAX_PRIVATE} gebruikt</p>
                </div>
              </label>
              <p style={{ fontSize: 12, color: '#65676B', margin: 0 }}>Max 50 MB · PDF, Word, PowerPoint, Excel, afbeeldingen</p>
              {uploadErr && <p style={{ fontSize: 13, color: '#E41E3F', margin: 0 }}>⚠️ {uploadErr}</p>}
            </div>
            <div className="fb-modal-footer">
              <button className="fb-btn fb-btn-secondary" onClick={() => { setShowUpload(false); setUploadErr('') }}>Annuleren</button>
              <button className="fb-btn fb-btn-primary" onClick={uploadDoc} disabled={uploading || !form.title} style={{ opacity: uploading || !form.title ? 0.5 : 1 }}>
                {uploading ? 'Uploaden…' : 'Uploaden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fb-toast">✓ {toast}</div>}
    </div>
  )
}
