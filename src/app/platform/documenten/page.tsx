'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

interface Doc {
  id: string; title: string; description?: string; subject?: string
  file_url: string; file_name: string; file_size?: number
  downloads: number; created_at: string
  profiles?: { display_name: string }
}

const SUBJECTS = ['Alle vakken', 'Aardrijkskunde', 'Nederlands', 'Frans', 'Engels', 'Wiskunde', 'Economie', 'Overig']

function formatSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(0)} KB`
  return `${(bytes/1024/1024).toFixed(1)} MB`
}

export default function DocumentenPage() {
  const [docs, setDocs] = useState<Doc[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [filter, setFilter] = useState('Alle vakken')
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [form, setForm] = useState({ title: '', description: '', subject: 'Overig' })
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setUserId(data.session?.user?.id ?? null)
      await loadDocs()
    })
  }, [])

  async function loadDocs() {
    const { data } = await supabase
      .from('documents')
      .select('*, profiles(display_name)')
      .order('created_at', { ascending: false })
    if (data) setDocs(data as Doc[])
  }

  async function uploadDoc() {
    const file = fileRef.current?.files?.[0]
    if (!file || !userId || !form.title) return
    setUploading(true); setUploadErr('')
    try {
      const path = `${userId}/${Date.now()}_${file.name}`
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
      await supabase.from('documents').insert({
        user_id: userId, title: form.title, description: form.description,
        subject: form.subject, file_url: urlData.publicUrl,
        file_name: file.name, file_size: file.size,
      })
      setForm({ title: '', description: '', subject: 'Overig' })
      setShowUpload(false)
      if (fileRef.current) fileRef.current.value = ''
      await loadDocs()
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : 'Upload mislukt. Probeer opnieuw.')
    } finally {
      setUploading(false)
    }
  }

  async function downloadDoc(doc: Doc) {
    await supabase.from('documents').update({ downloads: doc.downloads + 1 }).eq('id', doc.id)
    window.open(doc.file_url, '_blank')
  }

  async function deleteDoc(id: string) {
    await supabase.from('documents').delete().eq('id', id)
    setDocs((prev) => prev.filter((d) => d.id !== id))
  }

  const filtered = filter === 'Alle vakken' ? docs : docs.filter((d) => d.subject === filter)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📁 Documenten</h1>
          <p className="text-gray-500 text-sm mt-0.5">Deel samenvattingen en notities met andere studenten.</p>
        </div>
        {userId && (
          <button onClick={() => setShowUpload(true)} className="btn-primary text-sm px-4 py-2">+ Upload</button>
        )}
      </div>

      {/* Subject filter */}
      <div className="flex gap-2 flex-wrap mb-6">
        {SUBJECTS.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === s ? 'bg-primary-500 text-white' : 'bg-white border border-warm-gray text-gray-600 hover:bg-gray-50'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* Document list */}
      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">📁</p>
          <p className="font-semibold">Nog geen documenten{filter !== 'Alle vakken' ? ` voor ${filter}` : ''}</p>
          {userId && <p className="text-sm mt-1">Upload als eerste een samenvatting!</p>}
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((doc) => (
          <div key={doc.id} className="bg-white border border-warm-gray rounded-2xl px-5 py-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-2xl flex-shrink-0">
              {doc.file_name.endsWith('.pdf') ? '📕' :
               doc.file_name.match(/\.(docx?|txt)$/) ? '📄' :
               doc.file_name.match(/\.(pptx?|key)$/) ? '📊' : '📎'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900 truncate">{doc.title}</p>
                {doc.subject && (
                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{doc.subject}</span>
                )}
              </div>
              {doc.description && <p className="text-sm text-gray-500 truncate">{doc.description}</p>}
              <p className="text-xs text-gray-400 mt-0.5">
                {doc.profiles?.display_name ?? 'Anoniem'} · {formatSize(doc.file_size)} · {doc.downloads} downloads ·{' '}
                {new Date(doc.created_at).toLocaleDateString('nl-BE')}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => downloadDoc(doc)}
                className="text-sm text-primary-600 hover:text-primary-800 font-medium px-3 py-1.5 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors">
                ↓ Download
              </button>
              {userId === (doc as { user_id?: string }).user_id && (
                <button onClick={() => deleteDoc(doc.id)} className="text-gray-300 hover:text-red-400 text-lg leading-none px-1">🗑</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Document uploaden</h2>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="space-y-3">
              <input className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
                placeholder="Titel*" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <select className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
                value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })}>
                {SUBJECTS.filter(s => s !== 'Alle vakken').map((s) => <option key={s}>{s}</option>)}
              </select>
              <textarea className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm resize-none h-16"
                placeholder="Beschrijving (optioneel)" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Bestand*</label>
                <input ref={fileRef} type="file"
                  accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.png,.jpg"
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-primary-100 file:text-primary-700 file:font-medium file:text-sm hover:file:bg-primary-200" />
              </div>
              {uploadErr && <p className="text-sm text-red-600">{uploadErr}</p>}
              <p className="text-xs text-gray-400">Max 50MB. PDF, Word, PowerPoint, afbeeldingen.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowUpload(false)} className="btn-ghost text-sm px-4 py-2">Annuleren</button>
              <button onClick={uploadDoc} disabled={uploading || !form.title}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                {uploading ? 'Uploaden...' : 'Uploaden'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
