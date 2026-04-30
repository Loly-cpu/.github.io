'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Group {
  id: string; name: string; description: string; subject: string
  icon: string; grade: string | null; finaliteit: string | null
  is_system: boolean; member_count: number; is_member: boolean
}

const FINALITEIT_LABELS: Record<string, string> = {
  'A-stroom': 'A-stroom',
  'B-stroom': 'B-stroom',
  'Doorstroomfinaliteit': 'Doorstroomfinaliteit → Universiteit/Hogeschool',
  'Dubbele finaliteit': 'Dubbele finaliteit → Studeren + Praktijk',
  'Arbeidsmarktfinaliteit': 'Arbeidsmarktfinaliteit → Werkveld',
}

const GRADES = ['1e graad', '2e graad', '3e graad', 'Algemeen']

export default function BerichtenPage() {
  const [groups, setGroups]   = useState<Group[]>([])
  const [userId, setUserId]   = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<string>('Mijn groepen')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null
      setUserId(uid)
      await loadGroups(uid)
    })
  }, [])

  async function loadGroups(uid: string | null) {
    setLoading(true)
    const { data: grps } = await supabase.from('groups').select('*').order('grade', { ascending: true, nullsFirst: false })
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
    setGroups(prev => prev.map(g => g.id === groupId
      ? { ...g, is_member: !isMember, member_count: g.member_count + (isMember ? -1 : 1) }
      : g
    ))
  }

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

  const myGroups       = groups.filter(g => g.is_member)
  const filteredGrades = filter === 'Mijn groepen' ? [] : filter === 'Alle' ? GRADES : [filter]

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#2563eb', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#242424', margin: '0 0 4px' }}>💬 Berichten</h1>
        <p style={{ fontSize: 13, color: '#5b5b5b', margin: 0 }}>
          Sluit je aan bij jouw groep om samen vragen te stellen en te leren.
        </p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {['Mijn groepen', 'Alle', ...GRADES].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              fontSize: 12, padding: '5px 12px', borderRadius: 20, fontWeight: 500, cursor: 'pointer', border: 'none',
              background: filter === f ? '#2563eb' : '#fff',
              color: filter === f ? '#fff' : '#5b5b5b',
              boxShadow: filter === f ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
            }}>
            {f}{f === 'Mijn groepen' && myGroups.length > 0 ? ` (${myGroups.length})` : ''}
          </button>
        ))}
      </div>

      {/* My groups */}
      {filter === 'Mijn groepen' && (
        myGroups.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', color: '#5b5b5b' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>Je bent nog geen lid van een groep</p>
            <p style={{ fontSize: 13, marginBottom: 16 }}>Sluit je aan bij de groep van jouw richting.</p>
            <button onClick={() => setFilter('Alle')}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              Alle groepen bekijken →
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {myGroups.map(g => <GroupCard key={g.id} group={g} userId={userId} onToggle={toggleMember} />)}
          </div>
        )
      )}

      {/* Grade hierarchy */}
      {filter !== 'Mijn groepen' && filteredGrades.map(grade => {
        const gradeGroups = groupsByGrade(grade)
        if (gradeGroups.length === 0) return null
        const byFinaliteit = grade === 'Algemeen' ? { 'Algemeen': gradeGroups } : groupsByFinaliteit(gradeGroups)

        return (
          <div key={grade} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#242424', margin: 0 }}>{grade}</h2>
              <div style={{ flex: 1, height: 1, background: '#e8e8e8' }} />
            </div>
            {Object.entries(byFinaliteit).map(([fin, finGroups]) => (
              <div key={fin} style={{ marginBottom: 20 }}>
                {fin !== 'Algemeen' && grade !== 'Algemeen' && (
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, marginLeft: 2 }}>
                    {FINALITEIT_LABELS[fin] ?? fin}
                  </p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
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
    <div style={{
      background: '#fff', border: `2px solid ${g.is_member ? '#2563eb' : '#e8e8e8'}`,
      borderRadius: 10, overflow: 'hidden',
      transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.10)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
    >
      <Link href={`/platform/berichten/${g.id}`} style={{ display: 'block', padding: '14px 16px', textDecoration: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>{g.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#242424', margin: 0, lineHeight: 1.3 }}>
              {g.name.includes('—') ? g.name.split('—')[1].trim() : g.name}
            </p>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{g.member_count} leden</p>
          </div>
          {g.is_member && (
            <span style={{ fontSize: 10, background: '#eff6ff', color: '#2563eb', borderRadius: 6, padding: '2px 7px', fontWeight: 700, flexShrink: 0 }}>Lid</span>
          )}
        </div>
      </Link>
      {userId && (
        <div style={{ borderTop: '1px solid #f4f4f4', padding: '8px 16px' }}>
          <button onClick={() => onToggle(g.id, g.is_member)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              color: g.is_member ? '#ef4444' : '#2563eb', padding: 0 }}>
            {g.is_member ? 'Groep verlaten' : '+ Aansluiten'}
          </button>
        </div>
      )}
    </div>
  )
}
