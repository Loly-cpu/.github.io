'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Group {
  id: string; name: string; description: string; subject: string
  icon: string; grade: string | null; finaliteit: string | null
  is_system: boolean; member_count: number; is_member: boolean
}

const FB = '#1877F2'
const GRADES = ['1e graad', '2e graad', '3e graad', 'Algemeen']
const FINALITEIT_LABELS: Record<string, string> = {
  'Doorstroomfinaliteit': 'Doorstroomfinaliteit → Universiteit/Hogeschool',
  'Dubbele finaliteit':   'Dubbele finaliteit → Studeren + Praktijk',
  'Arbeidsmarktfinaliteit': 'Arbeidsmarktfinaliteit → Werkveld',
}

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
    if (isMember) await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId)
    else await supabase.from('group_members').insert({ group_id: groupId, user_id: userId })
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, is_member: !isMember, member_count: g.member_count + (isMember ? -1 : 1) } : g))
  }

  const myGroups = groups.filter(g => g.is_member)
  const filteredGrades = filter === 'Mijn groepen' ? [] : filter === 'Alle' ? GRADES : [filter]

  function groupsByGrade(grade: string) {
    return grade === 'Algemeen' ? groups.filter(g => !g.grade) : groups.filter(g => g.grade === grade)
  }
  function groupsByFinaliteit(gradeGroups: Group[]) {
    const result: Record<string, Group[]> = {}
    for (const g of gradeGroups) { const key = g.finaliteit ?? 'Algemeen'; if (!result[key]) result[key] = []; result[key].push(g) }
    return result
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
      <div style={{ width: 32, height: 32, border: `4px solid ${FB}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', fontFamily: 'var(--fb-font)' }}>

      {/* FB Groups-style header */}
      <div className="fb-card" style={{ marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ height: 100, background: 'linear-gradient(135deg, #00C6FF, #0072FF)' }} />
        <div style={{ padding: '0 20px 16px', display: 'flex', alignItems: 'flex-end', gap: 16, marginTop: -28 }}>
          <div style={{ width: 68, height: 68, borderRadius: 8, background: '#fff', border: '4px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, boxShadow: '0 2px 8px rgba(0,0,0,.15)', flexShrink: 0 }}>💬</div>
          <div style={{ flex: 1, paddingBottom: 4 }}>
            <h1 style={{ margin: '0 0 2px', fontSize: 20, fontWeight: 800, color: '#1C1E21' }}>Berichten & Groepen</h1>
            <p style={{ margin: 0, fontSize: 13, color: '#65676B' }}>{groups.length} groepen · {myGroups.length} lid van</p>
          </div>
        </div>

        {/* Filter tabs — FB style */}
        <div style={{ display: 'flex', gap: 4, padding: '0 12px 12px', borderTop: '1px solid #E4E6EB', paddingTop: 10, flexWrap: 'wrap' }}>
          {['Mijn groepen', 'Alle', ...GRADES].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{
                padding: '8px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 14, transition: 'background .12s',
                background: filter === f ? FB : '#E4E6EB',
                color: filter === f ? '#fff' : '#1C1E21',
              }}>
              {f}{f === 'Mijn groepen' && myGroups.length > 0 ? ` (${myGroups.length})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Mijn groepen */}
      {filter === 'Mijn groepen' && (
        myGroups.length === 0 ? (
          <div className="fb-card" style={{ padding: '48px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>👥</div>
            <p style={{ fontWeight: 800, fontSize: 18, color: '#1C1E21', margin: '0 0 8px' }}>Nog geen groepen</p>
            <p style={{ fontSize: 15, color: '#65676B', margin: '0 0 20px' }}>Sluit je aan bij de groep van jouw richting.</p>
            <button onClick={() => setFilter('Alle')}
              style={{ background: FB, color: '#fff', border: 'none', borderRadius: 6, padding: '10px 24px', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              Alle groepen ontdekken
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#1C1E21', marginBottom: 12 }}>Jouw groepen</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {myGroups.map(g => <GroupCard key={g.id} group={g} userId={userId} onToggle={toggleMember} />)}
            </div>
          </>
        )
      )}

      {/* Alle groepen per graad */}
      {filter !== 'Mijn groepen' && filteredGrades.map(grade => {
        const gradeGroups = groupsByGrade(grade)
        if (gradeGroups.length === 0) return null
        const byFinaliteit = grade === 'Algemeen' ? { 'Algemeen': gradeGroups } : groupsByFinaliteit(gradeGroups)

        return (
          <div key={grade} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1C1E21', margin: 0 }}>{grade}</h2>
              <div style={{ flex: 1, height: 1, background: '#E4E6EB' }} />
            </div>
            {Object.entries(byFinaliteit).map(([fin, finGroups]) => (
              <div key={fin} style={{ marginBottom: 16 }}>
                {fin !== 'Algemeen' && grade !== 'Algemeen' && (
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#65676B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                    {FINALITEIT_LABELS[fin] ?? fin}
                  </p>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
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
  const FB = '#1877F2'
  const name = g.name.includes('—') ? g.name.split('—')[1].trim() : g.name

  return (
    <div className="fb-card" style={{
      margin: 0, overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow .15s',
      border: g.is_member ? `2px solid ${FB}` : '2px solid transparent',
    }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.15)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,.1)')}>

      {/* Group cover */}
      <div style={{ height: 80, background: 'linear-gradient(135deg, #E3F2FD, #BBDEFB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
        {g.icon}
      </div>

      {/* Info */}
      <Link href={`/platform/berichten/${g.id}`} style={{ display: 'block', padding: '12px 14px 8px', textDecoration: 'none' }}>
        <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 700, color: '#1C1E21', lineHeight: 1.3 }}>{name}</p>
        <p style={{ margin: '0 0 4px', fontSize: 13, color: '#65676B' }}>{g.member_count} leden</p>
        {g.description && <p style={{ margin: 0, fontSize: 13, color: '#65676B', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{g.description}</p>}
      </Link>

      {/* Action */}
      {userId && (
        <div style={{ padding: '8px 14px 12px' }}>
          <button onClick={() => onToggle(g.id, g.is_member)}
            style={{
              width: '100%', border: 'none', borderRadius: 6, padding: '8px 12px',
              fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'background .12s',
              background: g.is_member ? '#E4E6EB' : FB,
              color: g.is_member ? '#1C1E21' : '#fff',
            }}>
            {g.is_member ? '✓ Lid' : '+ Aansluiten'}
          </button>
        </div>
      )}
    </div>
  )
}
