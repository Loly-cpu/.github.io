'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Event { id: string; title: string; start_at: string; type: string; color: string }
interface Doc   { id: string; title: string; subject?: string; file_name: string; created_at: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Post = any

const FB = '#1877F2'

function daysUntil(iso: string) { return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000) }
function fmt(iso: string) { return new Date(iso).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' }) }
function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'zojuist'; if (m < 60) return `${m}m`
  if (m < 1440) return `${Math.floor(m/60)}u`; return `${Math.floor(m/1440)}d`
}

const EVENT_COLOR: Record<string, string> = { exam: '#E41E3F', school: FB, study: '#22c55e', personal: '#8B5CF6', busy: '#9ca3af' }
const EVENT_LABEL: Record<string, string> = { exam: 'Examen', school: 'School', study: 'Studie', personal: 'Persoonlijk', busy: 'Bezet' }

export default function PlatformHome() {
  const [name, setName]               = useState('')
  const [initials, setInitials]       = useState('?')
  const [unread, setUnread]           = useState(0)
  const [nextExam, setNextExam]       = useState<Event | null>(null)
  const [todayEvents, setTodayEvents] = useState<Event[]>([])
  const [upcoming, setUpcoming]       = useState<Event[]>([])
  const [recentDocs, setRecentDocs]   = useState<Doc[]>([])
  const [recentPosts, setRecentPosts] = useState<Post[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const uid = data.session.user.id
      const now = new Date().toISOString()
      const todayStart = new Date(); todayStart.setHours(0,0,0,0)
      const tomorrowEnd = new Date(); tomorrowEnd.setHours(23,59,59,999); tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)

      const [profRes, evRes, todayRes, docsRes, postsRes, totalRes, readRes] = await Promise.all([
        supabase.from('profiles').select('display_name').eq('id', uid).single(),
        supabase.from('events').select('*').eq('user_id', uid).eq('type', 'exam').gte('start_at', now).order('start_at').limit(1),
        supabase.from('events').select('*').eq('user_id', uid).gte('start_at', todayStart.toISOString()).lte('start_at', tomorrowEnd.toISOString()).order('start_at').limit(5),
        supabase.from('documents').select('id,title,subject,file_name,created_at').order('created_at', { ascending: false }).limit(5),
        supabase.from('group_posts').select('id,content,created_at,group_id,profiles!group_posts_user_id_profiles_fkey(display_name),groups(name,icon)').order('created_at', { ascending: false }).limit(6),
        supabase.from('notifications').select('*', { count: 'exact', head: true }),
        supabase.from('notification_reads').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      ])

      const n = profRes.data?.display_name ?? data.session.user.email?.split('@')[0] ?? ''
      setName(n); setInitials(n[0]?.toUpperCase() ?? '?')
      setNextExam(evRes.data?.[0] ?? null)
      setTodayEvents((todayRes.data ?? []) as Event[])
      setRecentDocs((docsRes.data ?? []) as Doc[])
      setRecentPosts((postsRes.data ?? []) as Post[])
      setUnread(Math.max(0, (totalRes.count ?? 0) - (readRes.count ?? 0)))

      const { data: up } = await supabase.from('events').select('*').eq('user_id', uid).gte('start_at', now).order('start_at').limit(5)
      setUpcoming((up ?? []) as Event[])
    })
  }, [])

  const examDays = nextExam ? daysUntil(nextExam.start_at) : null

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start', fontFamily: 'var(--fb-font)' }}>

      {/* ── Hoofdkolom (feed) ───────────────────────────────────────── */}
      <div>

        {/* Maak een bericht — FB "What's on your mind?" */}
        <div className="fb-card" style={{ padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Link href="/platform/berichten">
              <div className="fb-avatar" style={{ width: 40, height: 40, fontSize: 18 }}>{initials}</div>
            </Link>
            <Link href="/platform/berichten" style={{ flex: 1, textDecoration: 'none' }}>
              <div style={{ background: '#F0F2F5', borderRadius: 20, padding: '10px 16px', fontSize: 15, color: '#65676B', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#E4E6EB')}
                onMouseLeave={e => (e.currentTarget.style.background = '#F0F2F5')}>
                Stel een vraag of deel iets, {name}…
              </div>
            </Link>
          </div>
          <div style={{ height: 1, background: '#E4E6EB', margin: '0 -12px 10px' }} />
          <div style={{ display: 'flex', gap: 0 }}>
            {[
              { href: '/platform/berichten', icon: '💬', label: 'Berichten' },
              { href: '/platform/agenda',    icon: '📅', label: 'Agenda' },
              { href: '/platform/documenten',icon: '📁', label: 'Documenten' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 4px', borderRadius: 8, textDecoration: 'none', color: '#65676B', fontSize: 14, fontWeight: 600, transition: 'background .12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F0F2F5')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span style={{ fontSize: 18 }}>{a.icon}</span> {a.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Examen alarm */}
        {nextExam && examDays !== null && examDays <= 7 && (
          <div className="fb-card" style={{ padding: 16, borderLeft: `4px solid ${examDays <= 2 ? '#E41E3F' : FB}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: examDays <= 2 ? '#fef2f2' : '#E7F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🎓</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1C1E21' }}>{nextExam.title}</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, color: '#65676B' }}>{fmt(nextExam.start_at)}</p>
              </div>
              <span style={{ background: examDays <= 2 ? '#E41E3F' : FB, color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {examDays === 0 ? 'Vandaag!' : examDays === 1 ? 'Morgen!' : `${examDays}d`}
              </span>
            </div>
          </div>
        )}

        {/* Vandaag events */}
        {todayEvents.length > 0 && (
          <div className="fb-card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#1C1E21', marginBottom: 12 }}>Vandaag</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {todayEvents.map(e => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: (EVENT_COLOR[e.type] ?? '#6366f1') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: EVENT_COLOR[e.type] ?? '#6366f1' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#1C1E21' }}>{e.title}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 13, color: '#65676B' }}>{EVENT_LABEL[e.type] ?? e.type} · {fmt(e.start_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recente berichten — als FB posts */}
        {recentPosts.map((p: Post) => (
          <div key={p.id} className="fb-card" style={{ overflow: 'hidden' }}>
            {/* Post header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
              <div className="fb-avatar" style={{ width: 40, height: 40, fontSize: 16 }}>
                {(p.profiles?.display_name ?? 'A')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1C1E21' }}>{p.profiles?.display_name ?? 'Anoniem'}</p>
                <p style={{ margin: '1px 0 0', fontSize: 13, color: '#65676B' }}>
                  {timeAgo(p.created_at)} geleden · {(p.groups as { icon?: string; name?: string })?.icon} {(p.groups as { name?: string })?.name}
                </p>
              </div>
              <Link href={`/platform/berichten/${p.group_id}`}
                style={{ fontSize: 14, fontWeight: 600, color: FB, textDecoration: 'none', background: '#E7F3FF', borderRadius: 6, padding: '6px 12px' }}>
                Openen
              </Link>
            </div>
            {/* Post content */}
            <div style={{ padding: '0 16px 12px', fontSize: 15, color: '#1C1E21', lineHeight: 1.5 }}>
              {String(p.content).slice(0, 240)}{p.content.length > 240 ? '…' : ''}
            </div>
            {/* Actions */}
            <div style={{ height: 1, background: '#E4E6EB', margin: '0 16px' }} />
            <div style={{ display: 'flex', padding: '4px 8px' }}>
              <Link href={`/platform/berichten/${p.group_id}`}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 8, fontSize: 14, fontWeight: 700, color: '#65676B', textDecoration: 'none', transition: 'background .12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F0F2F5')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                💬 Reageren
              </Link>
            </div>
          </div>
        ))}

        {recentPosts.length === 0 && (
          <div className="fb-card" style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <p style={{ fontWeight: 700, fontSize: 16, color: '#1C1E21', margin: '0 0 6px' }}>Nog geen activiteit</p>
            <p style={{ color: '#65676B', fontSize: 14, margin: '0 0 16px' }}>Sluit je aan bij een groep om berichten te zien.</p>
            <Link href="/platform/berichten" className="fb-btn fb-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 6, background: FB, color: '#fff', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
              Groepen bekijken
            </Link>
          </div>
        )}
      </div>

      {/* ── Rechterkolom (widgets) ──────────────────────────────────── */}
      <div style={{ position: 'sticky', top: 72 }}>

        {/* Snel navigeren */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontWeight: 700, fontSize: 17, color: '#1C1E21', margin: '0 0 8px' }}>Shortcuts</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              { href: '/examenboard',          icon: '🎓', label: 'Examenboard',   sub: 'Studieplan & planning' },
              { href: '/platform/cijfers',     icon: '📊', label: 'Mijn cijfers',  sub: 'Canvas-overzicht' },
              { href: '/dashboard',            icon: '🌐', label: 'Taalplatform',  sub: 'Frans & Engels' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 8, textDecoration: 'none', transition: 'background .12s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#E4E6EB')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#E4E6EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{a.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#1C1E21' }}>{a.label}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#65676B' }}>{a.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Meldingen badge */}
        {unread > 0 && (
          <Link href="/platform/meldingen" style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,.1)', padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#E41E3F', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>🔔</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1C1E21' }}>{unread} ongelezen melding{unread !== 1 ? 'en' : ''}</p>
                <p style={{ margin: '1px 0 0', fontSize: 13, color: FB }}>Bekijken →</p>
              </div>
            </div>
          </Link>
        )}

        {/* Aankomende events */}
        {upcoming.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontWeight: 700, fontSize: 17, color: '#1C1E21', margin: 0 }}>Aankomend</p>
              <Link href="/platform/agenda" style={{ fontSize: 14, fontWeight: 600, color: FB, textDecoration: 'none' }}>Alles zien</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {upcoming.map(e => (
                <Link key={e.id} href="/platform/agenda" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 8, textDecoration: 'none', transition: 'background .12s' }}
                  onMouseEnter={el => (el.currentTarget.style.background = '#E4E6EB')}
                  onMouseLeave={el => (el.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: (EVENT_COLOR[e.type] ?? '#6366f1') + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'column' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: EVENT_COLOR[e.type] ?? '#6366f1', lineHeight: 1 }}>{new Date(e.start_at).toLocaleDateString('nl-BE', { month: 'short' }).toUpperCase()}</span>
                    <span style={{ fontSize: 17, fontWeight: 800, color: EVENT_COLOR[e.type] ?? '#6366f1', lineHeight: 1 }}>{new Date(e.start_at).getDate()}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#1C1E21', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#65676B' }}>{EVENT_LABEL[e.type] ?? e.type}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Recente documenten */}
        {recentDocs.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p style={{ fontWeight: 700, fontSize: 17, color: '#1C1E21', margin: 0 }}>Documenten</p>
              <Link href="/platform/documenten" style={{ fontSize: 14, fontWeight: 600, color: FB, textDecoration: 'none' }}>Alles zien</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {recentDocs.map(d => (
                <Link key={d.id} href="/platform/documenten" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', borderRadius: 8, textDecoration: 'none', transition: 'background .12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#E4E6EB')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: '#E4E6EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    {d.file_name?.endsWith('.pdf') ? '📕' : d.file_name?.match(/\.(docx?)$/) ? '📄' : d.file_name?.match(/\.(pptx?)$/) ? '📊' : '📎'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#1C1E21', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</p>
                    {d.subject && <p style={{ margin: 0, fontSize: 12, color: '#65676B' }}>{d.subject}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
