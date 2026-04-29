'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Group {
  id: string; name: string; description: string; subject: string
  icon: string; grade: string | null; finaliteit: string | null
  is_system: boolean; member_count: number; is_member: boolean
}

const GRADE_ORDER = ['1e graad', '2e graad', '3e graad', null]
const FINALITEIT_ORDER = ['A-stroom', 'B-stroom', 'Doorstroomfinaliteit', 'Dubbele finaliteit', 'Arbeidsmarktfinaliteit', null]

const FINALITEIT_LABELS: Record<string, string> = {
  'A-stroom': 'A-stroom',
  'B-stroom': 'B-stroom',
  'Doorstroomfinaliteit': 'Doorstroomfinaliteit → Universiteit/Hogeschool',
  'Dubbele finaliteit': 'Dubbele finaliteit → Studeren + Praktijk',
  'Arbeidsmarktfinaliteit': 'Arbeidsmarktfinaliteit → Werkveld',
}

export default function GroepenPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('Alle')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null
      setUserId(uid)
      await loadGroups(uid)
    })
  }, [])

  async function loadGroups(uid: string | null) {
    setLoading(true)
    const { data: grps } = await supabase
      .from('groups')
      .select('*')
      .order('grade', { ascending: true, nullsFirst: false })
    if (!grps) { setLoading(false); return }

    const enriched: Group[] = await Promise.all(grps.map(async (g) => {
      const { count } = await supabase
        .from('group_members').select('*', { count: 'exact', head: true }).eq('group_id', g.id)
      let is_member = false
      if (uid) {
        const { data: mem } = await supabase
          .from('group_members').select('user_id').eq('group_id', g.id).eq('user_id', uid).single()
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
    setGroups(prev => prev.map(g => g.id === groupId
      ? { ...g, is_member: !isMember, member_count: g.member_count + (isMember ? -1 : 1) }
      : g
    ))
  }

  const grades = ['1e graad', '2e graad', '3e graad', 'Algemeen']

  // Group by grade
  function groupsByGrade(grade: string) {
    if (grade === 'Algemeen') return groups.filter(g => !g.grade)
    return groups.filter(g => g.grade === grade)
  }

  function groupsByFinaliteit(gradeGroups: Group[]) {
    const result: Record<string, Group[]> = {}
    for (const g of gradeGroups) {
      const key = g.finaliteit ?? 'Algemeen'
      if (!result[key]) result[key] = []
      result[key].push(g)
    }
    return result
  }

  const myGroups = groups.filter(g => g.is_member)
  const filteredGrades = filter === 'Mijn groepen' ? [] : filter === 'Alle' ? grades : [filter]

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">💬 Berichten & Groepen</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Sluit je aan bij de groep van jouw graad en richting om samen te leren en vragen te stellen.
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {['Alle', 'Mijn groepen', ...grades].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === f ? 'bg-primary-500 text-white' : 'bg-white border border-warm-gray text-gray-600 hover:bg-gray-50'
            }`}>
            {f}{f === 'Mijn groepen' && myGroups.length > 0 ? ` (${myGroups.length})` : ''}
          </button>
        ))}
      </div>

      {/* My groups shortcut */}
      {filter === 'Mijn groepen' && (
        <div>
          {myGroups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-3xl mb-2">👋</p>
              <p className="font-semibold">Nog geen groepen</p>
              <p className="text-sm">Sluit je aan bij de groep van jouw richting.</p>
              <button onClick={() => setFilter('Alle')} className="mt-3 btn-primary text-sm px-4 py-2">
                Groepen bekijken →
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {myGroups.map(g => <GroupCard key={g.id} group={g} userId={userId} onToggle={toggleMember} />)}
            </div>
          )}
        </div>
      )}

      {/* Grade hierarchy */}
      {filter !== 'Mijn groepen' && filteredGrades.map(grade => {
        const gradeGroups = groupsByGrade(grade)
        if (gradeGroups.length === 0) return null
        const byFinaliteit = grade === 'Algemeen' ? { 'Algemeen': gradeGroups } : groupsByFinaliteit(gradeGroups)

        return (
          <div key={grade} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-gray-900">{grade}</h2>
              <div className="flex-1 h-px bg-warm-gray" />
            </div>

            {Object.entries(byFinaliteit).map(([fin, finGroups]) => (
              <div key={fin} className="mb-5">
                {fin !== 'Algemeen' && grade !== 'Algemeen' && (
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 ml-1">
                    {FINALITEIT_LABELS[fin] ?? fin}
                  </p>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  {finGroups.map(g => <GroupCard key={g.id} group={g} userId={userId} onToggle={toggleMember} />)}
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function GroupCard({ group: g, userId, onToggle }: {
  group: Group; userId: string | null; onToggle: (id: string, isMember: boolean) => void
}) {
  return (
    <div className={`bg-white border-2 rounded-2xl overflow-hidden hover:shadow-md transition-shadow ${
      g.is_member ? 'border-primary-300' : 'border-warm-gray'
    }`}>
      <Link href={`/platform/groepen/${g.id}`} className="block px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{g.icon}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm leading-tight">
              {g.name.includes('—') ? g.name.split('—')[1].trim() : g.name}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{g.member_count} leden</p>
          </div>
          {g.is_member && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">Lid</span>}
        </div>
      </Link>
      {userId && (
        <div className="border-t border-warm-gray px-4 py-2">
          <button
            onClick={() => onToggle(g.id, g.is_member)}
            className={`text-xs font-semibold transition-colors ${
              g.is_member ? 'text-red-500 hover:text-red-700' : 'text-primary-600 hover:text-primary-800'
            }`}
          >
            {g.is_member ? 'Verlaten' : '+ Aansluiten'}
          </button>
        </div>
      )}
    </div>
  )
}
