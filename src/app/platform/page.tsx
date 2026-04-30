'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Event { id: string; title: string; start_at: string; type: string; color: string }
interface Doc   { id: string; title: string; subject?: string; file_name: string; created_at: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Post = any

function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}
function localIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' })
}
function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'zojuist'
  if (m < 60) return `${m}m geleden`
  if (m < 1440) return `${Math.floor(m/60)}u geleden`
  return `${Math.floor(m/1440)}d geleden`
}

const EVENT_COLOR: Record<string, string> = {
  exam: '#ef4444', school: '#3b82f6', study: '#22c55e', personal: '#6366f1', busy: '#9ca3af',
}
const EVENT_LABEL: Record<string, string> = {
  exam: 'Examen', school: 'School', study: 'Studie', personal: 'Persoonlijk', busy: 'Bezet',
}

export default function PlatformHome() {
  const [name, setName]         = useState('')
  const [unread, setUnread]     = useState(0)
  const [nextExam, setNextExam] = useState<Event | null>(null)
  const [todayEvents, setTodayEvents] = useState<Event[]>([])
  const [upcoming, setUpcoming] = useState<Event[]>([])
  const [recentDocs, setRecentDocs]   = useState<Doc[]>([])
  const [recentPosts, setRecentPosts] = useState<Post[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const uid = data.session.user.id
      const now  = new Date().toISOString()
      const todayStart = new Date(); todayStart.setHours(0,0,0,0)
      const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999)
      const tomorrowEnd = new Date(todayEnd); tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)

      const [profRes, evRes, todayRes, docsRes, postsRes, totalRes, readRes] = await Promise.all([
        supabase.from('profiles').select('display_name').eq('id', uid).single(),
        supabase.from('events').select('*').eq('user_id', uid).eq('type', 'exam').gte('start_at', now).order('start_at').limit(1),
        supabase.from('events').select('*').eq('user_id', uid).gte('start_at', todayStart.toISOString()).lte('start_at', tomorrowEnd.toISOString()).order('start_at').limit(5),
        supabase.from('documents').select('id,title,subject,file_name,created_at').order('created_at', { ascending: false }).limit(4),
        supabase.from('group_posts').select('id,content,created_at,group_id,profiles!group_posts_user_id_profiles_fkey(display_name),groups(name,icon)').order('created_at', { ascending: false }).limit(4),
        supabase.from('notifications').select('*', { count: 'exact', head: true }),
        supabase.from('notification_reads').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      ])

      setName(profRes.data?.display_name ?? data.session.user.email?.split('@')[0] ?? '')
      setNextExam(evRes.data?.[0] ?? null)
      setTodayEvents((todayRes.data ?? []) as Event[])
      setRecentDocs((docsRes.data ?? []) as Doc[])
      setRecentPosts((postsRes.data ?? []) as Post[])
      setUnread(Math.max(0, (totalRes.count ?? 0) - (readRes.count ?? 0)))

      // Upcoming events (next 5, not just today)
      const { data: upcomingData } = await supabase
        .from('events').select('*').eq('user_id', uid).gte('start_at', now)
        .order('start_at').limit(5)
      setUpcoming((upcomingData ?? []) as Event[])
    })
  }, [])

  const today = new Date().toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })
  const examDays = nextExam ? daysUntil(nextExam.start_at) : null

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Welkom ─────────────────────────────────────────────── */}
      <div className="smsc-card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: '#242424', margin: 0 }}>
            Welkom terug{name ? `, ${name}` : ''}
          </h1>
          <p style={{ fontSize: 13, color: '#5b5b5b', margin: '2px 0 0', textTransform: 'capitalize' }}>{today}</p>
        </div>
        {unread > 0 && (
          <Link href="/platform/meldingen" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff3ef', border: '1px solid #ffcba4', borderRadius: 8, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🔔</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#ff520e' }}>{unread} ongelezen melding{unread !== 1 ? 'en' : ''}</span>
            </div>
          </Link>
        )}
      </div>

      {/* ── Vandaag belangrijk ─────────────────────────────────── */}
      {(examDays !== null || todayEvents.length > 0) && (
        <div className="smsc-card" style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#5b5b5b', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 12px' }}>Vandaag & morgen</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {nextExam && examDays !== null && examDays <= 7 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: examDays <= 2 ? '#fef2f2' : '#fff3ef', borderRadius: 8, padding: '10px 14px', border: `1px solid ${examDays <= 2 ? '#fecaca' : '#fed7aa'}` }}>
                <span style={{ fontSize: 20 }}>🎓</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#242424', margin: 0 }}>{nextExam.title}</p>
                  <p style={{ fontSize: 12, color: '#5b5b5b', margin: '1px 0 0' }}>{fmt(nextExam.start_at)}</p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: examDays <= 2 ? '#dc2626' : '#ff520e', flexShrink: 0 }}>
                  {examDays === 0 ? 'Vandaag!' : examDays === 1 ? 'Morgen!' : `${examDays} dagen`}
                </span>
              </div>
            )}
            {todayEvents.map(e => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f9fafb', borderRadius: 8, padding: '10px 14px', border: '1px solid #e8e8e8' }}>
                <div style={{ width: 4, height: 32, borderRadius: 2, background: EVENT_COLOR[e.type] ?? '#6366f1', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#242424', margin: 0 }}>{e.title}</p>
                  <p style={{ fontSize: 11, color: '#5b5b5b', margin: '1px 0 0' }}>{EVENT_LABEL[e.type] ?? e.type} · {fmt(e.start_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Snelle acties ──────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        {[
          { href: '/examenboard', icon: '🎓', label: 'Examenboard', sub: 'Studieplan & aftelling', bg: '#fff3ef', border: '#ffcba4', color: '#ff520e' },
          { href: '/platform/berichten', icon: '💬', label: 'Berichten', sub: 'Groepen & discussies', bg: '#f0f9ff', border: '#bae6fd', color: '#0284c7' },
          { href: '/platform/agenda', icon: '📅', label: 'Agenda', sub: 'Week & maandoverzicht', bg: '#f0fdf4', border: '#bbf7d0', color: '#16a34a' },
        ].map(a => (
          <Link key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: a.bg, border: `1px solid ${a.border}`, borderRadius: 10, padding: '16px 14px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.10)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>{a.icon}</div>
              <p style={{ fontSize: 13, fontWeight: 600, color: a.color, margin: 0 }}>{a.label}</p>
              <p style={{ fontSize: 11, color: '#5b5b5b', margin: '2px 0 0' }}>{a.sub}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Drie-kolom overzicht ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>

        {/* Aankomende events */}
        <div className="smsc-card" style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#242424', margin: 0 }}>📅 Aankomend</p>
            <Link href="/platform/agenda" style={{ fontSize: 12, color: '#ff520e', textDecoration: 'none' }}>Alles →</Link>
          </div>
          {upcoming.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af' }}>
              <p style={{ fontSize: 13 }}>Geen events gepland</p>
              <Link href="/platform/agenda" style={{ fontSize: 12, color: '#ff520e' }}>Event toevoegen →</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcoming.map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 3, height: 36, borderRadius: 2, background: EVENT_COLOR[e.type] ?? '#6366f1', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#242424', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{fmt(e.start_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Laatste documenten */}
        <div className="smsc-card" style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#242424', margin: 0 }}>📁 Documenten</p>
            <Link href="/platform/documenten" style={{ fontSize: 12, color: '#ff520e', textDecoration: 'none' }}>Alles →</Link>
          </div>
          {recentDocs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af' }}>
              <p style={{ fontSize: 13 }}>Nog geen documenten</p>
              <Link href="/platform/documenten" style={{ fontSize: 12, color: '#ff520e' }}>Upload eerste →</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentDocs.map(d => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>
                    {d.file_name?.endsWith('.pdf') ? '📕' : d.file_name?.match(/\.(docx?)$/) ? '📄' : d.file_name?.match(/\.(pptx?)$/) ? '📊' : '📎'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#242424', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</p>
                    {d.subject && <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{d.subject}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recente activiteit */}
        <div className="smsc-card" style={{ margin: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#242424', margin: 0 }}>💬 Activiteit</p>
            <Link href="/platform/berichten" style={{ fontSize: 12, color: '#ff520e', textDecoration: 'none' }}>Alles →</Link>
          </div>
          {recentPosts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#9ca3af' }}>
              <p style={{ fontSize: 13 }}>Nog geen activiteit</p>
              <Link href="/platform/berichten" style={{ fontSize: 12, color: '#ff520e' }}>Ga naar berichten →</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentPosts.map(p => (
                <Link key={p.id} href={`/platform/berichten/${p.group_id}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{(p.groups as { icon?: string })?.icon ?? '💬'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 11, fontWeight: 600, color: '#5b5b5b', margin: 0 }}>{p.profiles?.display_name ?? 'Anoniem'} · {timeAgo(p.created_at)}</p>
                      <p style={{ fontSize: 12, color: '#374151', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.content}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
