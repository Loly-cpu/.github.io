'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Group {
  id: string; name: string; description: string; subject: string
  icon: string; created_by: string; created_at: string
  member_count?: number; is_member?: boolean
}

export default function GroepenPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', description: '', subject: '', icon: '💬' })
  const [saving, setSaving] = useState(false)

  const ICONS = ['💬', '📚', '🌍', '📝', '🔬', '📐', '💼', '🇫🇷', '🇬🇧', '🏛️', '❓', '💡']

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null
      setUserId(uid)
      await loadGroups(uid)
    })
  }, [])

  async function loadGroups(uid: string | null) {
    setLoading(true)
    const { data: grps } = await supabase.from('groups').select('*').order('created_at', { ascending: false })
    if (!grps) { setLoading(false); return }

    const enriched: Group[] = await Promise.all(grps.map(async (g) => {
      const { count } = await supabase.from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', g.id)
      let is_member = false
      if (uid) {
        const { data: mem } = await supabase.from('group_members').select('user_id').eq('group_id', g.id).eq('user_id', uid).single()
        is_member = !!mem
      }
      return { ...g, member_count: count ?? 0, is_member }
    }))
    setGroups(enriched)
    setLoading(false)
  }

  async function toggleMember(groupId: string, isMember: boolean) {
    if (!userId) return
    if (isMember) {
      await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)
    } else {
      await supabase.from('group_members').insert({ group_id: groupId, user_id: userId })
    }
    await loadGroups(userId)
  }

  async function createGroup() {
    if (!userId || !form.name) return
    setSaving(true)
    const { data } = await supabase.from('groups').insert({
      name: form.name, description: form.description,
      subject: form.subject, icon: form.icon, created_by: userId,
    }).select().single()
    if (data) {
      await supabase.from('group_members').insert({ group_id: data.id, user_id: userId, role: 'admin' })
    }
    setForm({ name: '', description: '', subject: '', icon: '💬' })
    setShowCreate(false)
    setSaving(false)
    await loadGroups(userId)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">💬 Berichten & Groepen</h1>
          <p className="text-gray-500 text-sm mt-0.5">Sluit je aan bij een groep om vragen te stellen en samen te leren.</p>
        </div>
        {userId && (
          <button onClick={() => setShowCreate(true)} className="btn-primary text-sm px-4 py-2">+ Groep</button>
        )}
      </div>

      {loading && <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" /></div>}

      {!loading && groups.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">💬</p>
          <p className="font-semibold">Nog geen groepen</p>
          <p className="text-sm">Maak de eerste groep aan!</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {groups.map((g) => (
          <div key={g.id} className="bg-white border-2 border-warm-gray rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
            <Link href={`/platform/groepen/${g.id}`} className="block px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="text-3xl flex-shrink-0">{g.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 truncate">{g.name}</h3>
                  {g.subject && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">{g.subject}</span>}
                  {g.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{g.description}</p>}
                  <p className="text-xs text-gray-400 mt-2">{g.member_count} leden</p>
                </div>
              </div>
            </Link>
            {userId && (
              <div className="border-t border-warm-gray px-5 py-2.5">
                <button
                  onClick={() => toggleMember(g.id, g.is_member ?? false)}
                  className={`text-sm font-semibold transition-colors ${
                    g.is_member
                      ? 'text-red-500 hover:text-red-700'
                      : 'text-primary-600 hover:text-primary-800'
                  }`}
                >
                  {g.is_member ? 'Verlaten' : '+ Aansluiten'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Nieuwe groep</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Icoon</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map((ic) => (
                    <button key={ic} onClick={() => setForm({ ...form, icon: ic })}
                      className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-colors ${form.icon === ic ? 'bg-primary-100 ring-2 ring-primary-400' : 'bg-gray-100 hover:bg-gray-200'}`}>
                      {ic}
                    </button>
                  ))}
                </div>
              </div>
              <input className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
                placeholder="Groepsnaam*" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm"
                placeholder="Vak / onderwerp (bijv. Aardrijkskunde)" value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              <textarea className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm resize-none h-20"
                placeholder="Beschrijving (optioneel)" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="btn-ghost text-sm px-4 py-2">Annuleren</button>
              <button onClick={createGroup} disabled={saving || !form.name}
                className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                {saving ? 'Aanmaken...' : 'Aanmaken'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
