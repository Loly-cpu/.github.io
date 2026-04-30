'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface Event { id: string; title: string; start_at: string; type: string }
interface Doc   { id: string; title: string; subject?: string; file_name: string }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Post = any

const FB = '#1877F2'

function daysUntil(iso: string) { return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000) }
function fmt(iso: string) { return new Date(iso).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' }) }
function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'zojuist'; if (m < 60) return `${m} min geleden`
  if (m < 1440) return `${Math.floor(m/60)} uur geleden`
  return `${Math.floor(m/1440)} dag${Math.floor(m/1440) !== 1 ? 'en' : ''} geleden`
}

const EVENT_LABEL: Record<string, string> = { exam: 'Examen', school: 'School', study: 'Studie', personal: 'Persoonlijk', busy: 'Bezet' }
const EVENT_COLOR: Record<string, string> = { exam: '#E41E3F', school: FB, study: '#22c55e', personal: '#8B5CF6', busy: '#9ca3af' }

/* ── Exact Facebook reaction/action icons ── */
function ThumbUp() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#65676B"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
}
function CommentBubble() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#65676B"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
}
function ShareArrow() {
  return <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="#65676B"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
}
function GlobeIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="#65676B"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
}
function DotsIcon() {
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="#65676B"><circle cx="10" cy="4" r="2"/><circle cx="10" cy="10" r="2"/><circle cx="10" cy="16" r="2"/></svg>
}

export default function PlatformHome() {
  const [name, setName]               = useState('')
  const [initials, setInitials]       = useState('?')
  const [unread, setUnread]           = useState(0)
  const [nextExam, setNextExam]       = useState<Event | null>(null)
  const [todayEvents, setTodayEvents] = useState<Event[]>([])
  const [upcoming, setUpcoming]       = useState<Event[]>([])
  const [recentDocs, setRecentDocs]   = useState<Doc[]>([])
  const [recentPosts, setRecentPosts] = useState<Post[]>([])
  const [avatarBg, setAvatarBg]       = useState(FB)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      const uid = data.session.user.id
      const now = new Date().toISOString()
      const todayStart = new Date(); todayStart.setHours(0,0,0,0)
      const tomorrowEnd = new Date(); tomorrowEnd.setHours(23,59,59,999); tomorrowEnd.setDate(tomorrowEnd.getDate() + 1)

      const [profRes, evRes, todayRes, docsRes, postsRes, totalRes, readRes, upRes] = await Promise.all([
        supabase.from('profiles').select('display_name, is_admin, is_superadmin').eq('id', uid).single(),
        supabase.from('events').select('*').eq('user_id', uid).eq('type', 'exam').gte('start_at', now).order('start_at').limit(1),
        supabase.from('events').select('*').eq('user_id', uid).gte('start_at', todayStart.toISOString()).lte('start_at', tomorrowEnd.toISOString()).order('start_at').limit(5),
        supabase.from('documents').select('id,title,subject,file_name').order('created_at', { ascending: false }).limit(5),
        supabase.from('group_posts').select('id,content,created_at,group_id,profiles!group_posts_user_id_profiles_fkey(display_name,is_admin,is_superadmin),groups(name,icon)').order('created_at', { ascending: false }).limit(8),
        supabase.from('notifications').select('*', { count: 'exact', head: true }),
        supabase.from('notification_reads').select('*', { count: 'exact', head: true }).eq('user_id', uid),
        supabase.from('events').select('*').eq('user_id', uid).gte('start_at', now).order('start_at').limit(5),
      ])

      const p = profRes.data
      const n = p?.display_name ?? data.session.user.email?.split('@')[0] ?? ''
      setName(n); setInitials(n[0]?.toUpperCase() ?? '?')
      setAvatarBg(p?.is_superadmin ? '#9333ea' : p?.is_admin ? '#16a34a' : FB)
      setNextExam(evRes.data?.[0] ?? null)
      setTodayEvents((todayRes.data ?? []) as Event[])
      setRecentDocs((docsRes.data ?? []) as Doc[])
      setRecentPosts((postsRes.data ?? []) as Post[])
      setUnread(Math.max(0, (totalRes.count ?? 0) - (readRes.count ?? 0)))
      setUpcoming((upRes.data ?? []) as Event[])
    })
  }, [])

  const examDays = nextExam ? daysUntil(nextExam.start_at) : null

  return (
    <div className="platform-home-grid" style={{
      display: 'flex', gap: 26, maxWidth: 1120, margin: '0 auto',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      alignItems: 'flex-start',
    }}>

      {/* ══════════════════════════════════════════════════════
          FEED — midden (exact Facebook)
      ══════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, minWidth: 0, maxWidth: 590, width: '100%' }}>

        {/* ── Create Post box — EXACT Facebook ── */}
        <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,.1)', marginBottom: 16, padding: '12px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: avatarBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, flexShrink: 0 }}>{initials}</div>
            <Link href="/platform/berichten" style={{ flex: 1, textDecoration: 'none' }}>
              <div style={{ background: '#F0F2F5', borderRadius: 20, padding: '0 16px', height: 40, display: 'flex', alignItems: 'center', color: '#65676B', fontSize: 16, cursor: 'pointer', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#E4E6EB')}
                onMouseLeave={e => (e.currentTarget.style.background = '#F0F2F5')}>
                Stel een vraag, {name}…
              </div>
            </Link>
          </div>

          <div style={{ height: 1, background: '#E4E6EB', margin: '0 -16px 10px' }} />

          <div style={{ display: 'flex' }}>
            {[
              { href: '/platform/berichten', emoji: '💬', label: 'Berichten', color: '#45BD62' },
              { href: '/platform/agenda',    emoji: '📅', label: 'Agenda',    color: '#F3425F' },
              { href: '/platform/documenten',emoji: '📁', label: 'Documenten',color: '#F7B928' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 4px', borderRadius: 8, textDecoration: 'none', color: '#65676B', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F2F2F2')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span style={{ fontSize: 18 }}>{a.emoji}</span>
                <span className="hidden sm:inline">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Examen alarm als post ── */}
        {nextExam && examDays !== null && examDays <= 7 && (
          <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,.1)', marginBottom: 16, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: examDays <= 2 ? '#fef2f2' : '#E7F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🎓</div>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#1C1E21' }}>Examen herinnering</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <p style={{ margin: 0, fontSize: 13, color: '#65676B' }}>{fmt(nextExam.start_at)}</p>
                  <span style={{ color: '#65676B', fontSize: 13 }}>·</span>
                  <GlobeIcon />
                </div>
              </div>
              <button style={{ width: 32, height: 32, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F2F2F2')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <DotsIcon />
              </button>
            </div>
            <div style={{ padding: '0 16px 12px', fontSize: 15, color: '#1C1E21' }}>
              <span style={{ display: 'inline-block', background: examDays <= 2 ? '#E41E3F' : FB, color: '#fff', borderRadius: 20, padding: '2px 12px', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                {examDays === 0 ? 'Vandaag!' : examDays === 1 ? 'Morgen!' : `Nog ${examDays} dagen`}
              </span>
              <br />
              <strong>{nextExam.title}</strong>
            </div>
            <div style={{ height: 1, background: '#E4E6EB', margin: '0 16px' }} />
            <div style={{ display: 'flex', padding: '4px 8px' }}>
              <Link href="/examenboard" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px', borderRadius: 8, fontSize: 15, fontWeight: 700, color: '#65676B', textDecoration: 'none', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F2F2F2')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                🎓 Examenboard openen
              </Link>
            </div>
          </div>
        )}

        {/* ── Posts (exact Facebook card structuur) ── */}
        {recentPosts.map((post: Post) => {
          const poster = post.profiles
          const group  = post.groups
          const isSA   = poster?.is_superadmin
          const isA    = poster?.is_admin
          const pAvatar = isSA ? '#9333ea' : isA ? '#16a34a' : FB
          const pInitial = (poster?.display_name ?? 'A')[0].toUpperCase()

          return (
            <div key={post.id} style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,.1)', marginBottom: 16 }}>

              {/* Post header — exact Facebook */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px 0' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: pAvatar, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 17, flexShrink: 0 }}>
                  {pInitial}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 15, color: '#1C1E21' }}>{poster?.display_name ?? 'Anoniem'}</span>
                    {group && <><span style={{ color: '#65676B', fontSize: 14 }}>plaatste in</span><span style={{ fontWeight: 700, fontSize: 15, color: '#1C1E21' }}>{group.icon} {group.name}</span></>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 13, color: '#65676B' }}>{timeAgo(post.created_at)}</span>
                    <span style={{ color: '#65676B', fontSize: 13 }}>·</span>
                    <GlobeIcon />
                  </div>
                </div>
                <button style={{ width: 36, height: 36, borderRadius: '50%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background .1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F2F2F2')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <DotsIcon />
                </button>
              </div>

              {/* Content */}
              <div style={{ padding: '8px 16px 12px', fontSize: 15, color: '#1C1E21', lineHeight: 1.5 }}>
                {String(post.content).length > 280
                  ? <>{String(post.content).slice(0,280)}<span style={{ color: FB, fontWeight: 600, cursor: 'pointer' }}> …meer</span></>
                  : String(post.content)
                }
              </div>

              {/* Like / comment counts */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px 8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: FB, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#fff"><path d="M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z"/></svg>
                  </div>
                  <span style={{ fontSize: 15, color: '#65676B' }}>0</span>
                </div>
                <span style={{ fontSize: 15, color: '#65676B', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                  onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                  0 reacties
                </span>
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: '#E4E6EB', margin: '0 16px' }} />

              {/* Action buttons — EXACT Facebook */}
              <div style={{ display: 'flex', padding: '4px 8px' }}>
                {[
                  { icon: <ThumbUp />, label: 'Vind ik leuk' },
                  { icon: <CommentBubble />, label: 'Reageren', href: `/platform/berichten/${post.group_id}` },
                  { icon: <ShareArrow />, label: 'Delen' },
                ].map(a => (
                  a.href ? (
                    <Link key={a.label} href={a.href} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 4px', borderRadius: 8, fontSize: 15, fontWeight: 700, color: '#65676B', textDecoration: 'none', transition: 'background .1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F2F2F2')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {a.icon} {a.label}
                    </Link>
                  ) : (
                    <button key={a.label} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 4px', borderRadius: 8, fontSize: 15, fontWeight: 700, color: '#65676B', background: 'none', border: 'none', cursor: 'pointer', transition: 'background .1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#F2F2F2')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {a.icon} {a.label}
                    </button>
                  )
                ))}
              </div>
            </div>
          )
        })}

        {recentPosts.length === 0 && (
          <div style={{ background: '#fff', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,.1)', padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <p style={{ fontWeight: 700, fontSize: 17, color: '#1C1E21', margin: '0 0 6px' }}>Nog geen berichten in jouw feed</p>
            <p style={{ color: '#65676B', fontSize: 15, margin: '0 0 16px' }}>Sluit je aan bij een groep om berichten te zien.</p>
            <Link href="/platform/berichten"
              style={{ display: 'inline-block', background: FB, color: '#fff', borderRadius: 6, padding: '10px 20px', fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
              Groepen ontdekken
            </Link>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          RECHTERKOLOM — widgets (exact Facebook)
      ══════════════════════════════════════════════════════ */}
      <div className="platform-home-sidebar" style={{ width: 360, flexShrink: 0 }}>

        {/* ── Shortcuts (Facebook "Shortcuts" widget) ── */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontWeight: 700, fontSize: 17, color: '#1C1E21', margin: '0 0 4px 4px' }}>Snelkoppelingen</p>
          {[
            { href: '/examenboard',          icon: '🎓', label: 'Examenboard',   sub: 'Studieplan & planning' },
            { href: '/platform/cijfers',     icon: '📊', label: 'Mijn cijfers',  sub: 'Canvas · ' + (unread > 0 ? `${unread} nieuw` : 'up to date') },
            { href: '/dashboard',            icon: '🌐', label: 'Taalplatform',  sub: 'Frans & Engels oefenen' },
            { href: '/platform/meldingen',   icon: '🔔', label: 'Meldingen',     sub: unread > 0 ? `${unread} ongelezen` : 'Alles gelezen' },
          ].map(a => (
            <Link key={a.href} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8, textDecoration: 'none', transition: 'background .1s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#E4E6EB')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div style={{ width: 52, height: 52, borderRadius: 8, background: '#E4E6EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>{a.icon}</div>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#1C1E21' }}>{a.label}</p>
                <p style={{ margin: 0, fontSize: 13, color: '#65676B' }}>{a.sub}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Aankomende events (Facebook "Events" widget) ── */}
        {upcoming.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: 4 }}>
              <p style={{ fontWeight: 700, fontSize: 17, color: '#1C1E21', margin: 0 }}>Aankomend</p>
              <Link href="/platform/agenda" style={{ fontSize: 14, fontWeight: 600, color: FB, textDecoration: 'none', padding: '4px 8px', borderRadius: 6 }}
                onMouseEnter={e => (e.currentTarget.style.background = '#E7F3FF')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                Alles zien
              </Link>
            </div>
            {upcoming.slice(0, 3).map(e => (
              <Link key={e.id} href="/platform/agenda" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8, textDecoration: 'none', transition: 'background .1s' }}
                onMouseEnter={el => (el.currentTarget.style.background = '#E4E6EB')}
                onMouseLeave={el => (el.currentTarget.style.background = 'transparent')}>
                <div style={{ width: 52, height: 52, borderRadius: 8, background: (EVENT_COLOR[e.type] ?? FB) + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, flexDirection: 'column', border: `1px solid ${EVENT_COLOR[e.type] ?? FB}44` }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: EVENT_COLOR[e.type] ?? FB, lineHeight: 1.2 }}>
                    {new Date(e.start_at).toLocaleDateString('nl-BE', { month: 'short' }).toUpperCase()}
                  </span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: EVENT_COLOR[e.type] ?? FB, lineHeight: 1 }}>
                    {new Date(e.start_at).getDate()}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#1C1E21', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#65676B' }}>{EVENT_LABEL[e.type] ?? e.type} · {fmt(e.start_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* ── Recente documenten ── */}
        {recentDocs.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: 4 }}>
              <p style={{ fontWeight: 700, fontSize: 17, color: '#1C1E21', margin: 0 }}>Documenten</p>
              <Link href="/platform/documenten" style={{ fontSize: 14, fontWeight: 600, color: FB, textDecoration: 'none', padding: '4px 8px', borderRadius: 6 }}>Alles zien</Link>
            </div>
            {recentDocs.slice(0, 3).map(d => (
              <Link key={d.id} href="/platform/documenten" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 8, textDecoration: 'none', transition: 'background .1s' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#E4E6EB')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <div style={{ width: 52, height: 52, borderRadius: 8, background: '#E4E6EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                  {d.file_name?.endsWith('.pdf') ? '📕' : d.file_name?.match(/\.(docx?)$/) ? '📄' : d.file_name?.match(/\.(pptx?)$/) ? '📊' : '📎'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 15, color: '#1C1E21', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.title}</p>
                  {d.subject && <p style={{ margin: 0, fontSize: 13, color: '#65676B' }}>{d.subject}</p>}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Footer links — exact Facebook */}
        <div style={{ padding: '4px 8px' }}>
          <p style={{ margin: 0, fontSize: 12, color: '#65676B', lineHeight: 1.8 }}>
            Privacy · Voorwaarden · Adverteren · Cookies · Meer · <strong>Schoolplatform © 2025</strong>
          </p>
        </div>
      </div>
    </div>
  )
}
