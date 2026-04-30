'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

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
    const { data, error } = await supabase
      .from('documents')
      .select('*, profiles(display_name)')
      .order('created_at', { ascending: false })
    if (error) console.error('Documenten laden:', error)
    if (data) {
      setDocs(data as Doc[])
      if (uid) setPrivateCount(data.filter(d => d.is_private && d.user_id === uid).length)
    }
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

  async function deleteDoc(id: string) {
    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (!error) {
      setDocs(prev => prev.filter(d => d.id !== id))
      showToast('Verwijderd')
    }
  }

  const publicDocs  = docs.filter(d => !d.is_private)
  const privateDocs = docs.filter(d => d.is_private && d.user_id === userId)

  const visibleDocs = (tab === 'gedeeld' ? publicDocs : privateDocs)
    .filter(d => filter === 'Alle vakken' || d.subject === filter)

  const SUBJECTS_ALL = ['Alle vakken', ...SUBJECTS]

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: 0 }}>📁 Documenten</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '2px 0 0' }}>Deel samenvattingen en notities.</p>
        </div>
        {userId && (
          <button onClick={() => setShowUpload(true)}
            style={{ background: '#ff520e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Upload
          </button>
        )}
      </div>

      {/* Tabs: Gedeeld / Privé */}
      {userId && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 16, border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', width: 'fit-content' }}>
          {([['gedeeld','🌐 Gedeeld'],['privé',`🔒 Privé (${privateCount}/${MAX_PRIVATE})`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ padding: '7px 20px', fontSize: 13, fontWeight: tab === k ? 600 : 400, border: 'none', cursor: 'pointer', background: tab === k ? '#ff520e' : '#fff', color: tab === k ? '#fff' : '#374151', transition: 'background 0.1s' }}>
              {l}
            </button>
          ))}
        </div>
      )}

      {/* Subject filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {SUBJECTS_ALL.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ fontSize: 11, padding: '4px 12px', borderRadius: 20, border: 'none', fontWeight: 500, cursor: 'pointer', background: filter === s ? '#111827' : '#f3f4f6', color: filter === s ? '#fff' : '#374151' }}>
            {s}
          </button>
        ))}
      </div>

      {/* Document table */}
      {visibleDocs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
          <p style={{ fontWeight: 600, fontSize: 15, color: '#374151', marginBottom: 4 }}>
            {tab === 'privé' ? 'Geen privédocumenten' : 'Nog geen documenten'}
          </p>
          <p style={{ fontSize: 13 }}>
            {tab === 'privé' ? `Upload tot ${MAX_PRIVATE} persoonlijke bestanden.` : 'Upload als eerste een samenvatting!'}
          </p>
          {userId && <button onClick={() => setShowUpload(true)}
            style={{ marginTop: 14, background: '#ff520e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            ↑ Eerste document uploaden
          </button>}
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 90px 90px 80px', gap: 0, padding: '10px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <div />
            <div>Naam</div>
            <div>Vak</div>
            <div>Grootte</div>
            <div>Geüpload</div>
            <div style={{ textAlign: 'right' }}>Acties</div>
          </div>
          {visibleDocs.map((doc, i) => (
            <div key={doc.id} style={{ display: 'grid', gridTemplateColumns: '40px 1fr 100px 90px 90px 80px', gap: 0, padding: '12px 16px', borderBottom: i < visibleDocs.length - 1 ? '1px solid #f3f4f6' : 'none', alignItems: 'center', transition: 'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ fontSize: 20 }}>{fileIcon(doc.file_name)}</div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.title}</p>
                {doc.description && <p style={{ fontSize: 11, color: '#9ca3af', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.description}</p>}
                <p style={{ fontSize: 11, color: '#d1d5db', margin: '1px 0 0' }}>door {doc.profiles?.display_name ?? 'Anoniem'}</p>
              </div>
              <div>
                {doc.subject && <span style={{ fontSize: 11, background: '#f3f4f6', color: '#374151', borderRadius: 6, padding: '2px 7px', fontWeight: 500 }}>{doc.subject}</span>}
              </div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{formatSize(doc.file_size)}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{fmt(doc.created_at)}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                <button onClick={() => downloadDoc(doc)}
                  style={{ background: '#f3f4f6', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 12, cursor: 'pointer', color: '#374151', fontWeight: 500 }}>
                  ↓
                </button>
                {userId === doc.user_id && (
                  <button onClick={() => deleteDoc(doc.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#d1d5db' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}>
                    🗑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 24, maxWidth: 440, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Document uploaden</p>
              <button onClick={() => { setShowUpload(false); setUploadErr('') }} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
                placeholder="Titel*" value={form.title}
                onChange={e => setForm({...form, title: e.target.value})} />
              <select style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}
                value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}>
                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
              </select>
              <textarea style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'none', height: 60 }}
                placeholder="Beschrijving (optioneel)" value={form.description}
                onChange={e => setForm({...form, description: e.target.value})} />
              <input ref={fileRef} type="file"
                accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                style={{ fontSize: 13, color: '#374151' }} />

              {/* Privacy toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 12px', background: form.is_private ? '#fff7ed' : '#f9fafb', border: `1px solid ${form.is_private ? '#fed7aa' : '#e5e7eb'}`, borderRadius: 8 }}>
                <input type="checkbox" checked={form.is_private}
                  onChange={e => setForm({...form, is_private: e.target.checked})}
                  style={{ width: 16, height: 16, accentColor: '#ff520e' }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0 }}>🔒 Privédocument</p>
                  <p style={{ fontSize: 11, color: '#6b7280', margin: 0 }}>Alleen zichtbaar voor jou · {privateCount}/{MAX_PRIVATE} gebruikt</p>
                </div>
              </label>

              <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Max 50 MB · PDF, Word, PowerPoint, Excel, afbeeldingen</p>
              {uploadErr && <p style={{ fontSize: 12, color: '#dc2626' }}>⚠️ {uploadErr}</p>}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => { setShowUpload(false); setUploadErr('') }}
                style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', color: '#374151' }}>
                Annuleren
              </button>
              <button onClick={uploadDoc} disabled={uploading || !form.title}
                style={{ background: '#ff520e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: uploading || !form.title ? 0.5 : 1 }}>
                {uploading ? 'Uploaden…' : 'Uploaden'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#111827', color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 500, zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
          ✓ {toast}
        </div>
      )}
    </div>
  )
}
