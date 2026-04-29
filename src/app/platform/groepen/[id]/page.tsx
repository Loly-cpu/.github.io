'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { use } from 'react'

interface Profile { display_name: string; is_admin?: boolean; is_superadmin?: boolean }
interface Reply {
  id: string; content: string; created_at: string; user_id: string
  profiles?: Profile
}
interface Post {
  id: string; content: string; created_at: string; user_id: string
  profiles?: Profile
  group_post_replies?: Reply[]
}
interface Group { id: string; name: string; description: string; icon: string; subject: string }

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'zojuist'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}u`
  return `${Math.floor(h / 24)}d`
}

function RoleBadge({ profile }: { profile?: Profile }) {
  if (profile?.is_superadmin) return (
    <span style={{ fontSize: 10, background: '#f3e8ff', color: '#7e22ce', borderRadius: 6, padding: '1px 5px', fontWeight: 700 }}>Superadmin</span>
  )
  if (profile?.is_admin) return (
    <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', borderRadius: 6, padding: '1px 5px', fontWeight: 700 }}>Admin</span>
  )
  return null
}

export default function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [group, setGroup]       = useState<Group | null>(null)
  const [posts, setPosts]       = useState<Post[]>([])
  const [userId, setUserId]     = useState<string | null>(null)
  const [isAdmin, setIsAdmin]       = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [displayName, setDisplayName]   = useState('')
  const [isMember, setIsMember] = useState(false)
  const [newPost, setNewPost]   = useState('')
  const [replyTo, setReplyTo]   = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [posting, setPosting]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null
      setUserId(uid)
      if (uid) {
        const { data: p } = await supabase
          .from('profiles')
          .select('display_name, is_admin, is_superadmin')
          .eq('id', uid).single()
        setDisplayName(p?.display_name ?? uid.slice(0, 8))
        setIsSuperAdmin(p?.is_superadmin ?? false)
        setIsAdmin((p?.is_admin || p?.is_superadmin) ?? false)
        const { data: mem } = await supabase.from('group_members').select('user_id').eq('group_id', id).eq('user_id', uid).single()
        setIsMember(!!mem)
      }
      const { data: g } = await supabase.from('groups').select('*').eq('id', id).single()
      setGroup(g)
      await loadPosts()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadPosts() {
    const { data } = await supabase
      .from('group_posts')
      .select('*, profiles(display_name, is_admin, is_superadmin), group_post_replies(*, profiles(display_name, is_admin, is_superadmin))')
      .eq('group_id', id)
      .order('created_at', { ascending: true })
    if (data) setPosts(data as Post[])
  }

  async function submitPost() {
    if (!userId || !newPost.trim()) return
    setPosting(true)
    await supabase.from('group_posts').insert({ group_id: id, user_id: userId, content: newPost.trim() })
    setNewPost('')
    await loadPosts()
    setPosting(false)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  async function submitReply() {
    if (!userId || !replyText.trim() || !replyTo) return
    await supabase.from('group_post_replies').insert({ post_id: replyTo, user_id: userId, content: replyText.trim() })
    setReplyText(''); setReplyTo(null)
    await loadPosts()
  }

  async function deletePost(postId: string) {
    const { error } = await supabase.from('group_posts').delete().eq('id', postId)
    if (!error) setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  async function deleteReply(replyId: string, postId: string) {
    const { error } = await supabase.from('group_post_replies').delete().eq('id', replyId)
    if (!error) {
      setPosts((prev) => prev.map((p) =>
        p.id === postId
          ? { ...p, group_post_replies: p.group_post_replies?.filter((r) => r.id !== replyId) }
          : p
      ))
    }
  }

  if (!group) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-[#ff520e] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Link href="/platform/groepen" style={{ color: '#5b5b5b', fontSize: 13, marginTop: 2 }}>← Terug</Link>
        <div className="flex items-center gap-3 flex-1">
          <span style={{ fontSize: 28 }}>{group.icon}</span>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#242424', margin: 0 }}>{group.name}</h1>
            {group.subject && (
              <span style={{ fontSize: 11, background: '#fff3ef', color: '#ff520e', padding: '1px 8px', borderRadius: 8, fontWeight: 600 }}>
                {group.subject}
              </span>
            )}
            {group.description && <p style={{ fontSize: 13, color: '#5b5b5b', margin: '2px 0 0' }}>{group.description}</p>}
          </div>
        </div>
        {isMember && (
          <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '2px 10px', borderRadius: 8, fontWeight: 600 }}>Lid</span>
        )}
      </div>

      {/* Posts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#5b5b5b' }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>💬</p>
            <p>Nog geen berichten. Wees de eerste!</p>
          </div>
        )}
        {posts.map((post) => {
          const replies = post.group_post_replies ?? []
          const canDelete = userId === post.user_id || isAdmin
          return (
            <div key={post.id} className="smsc-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: post.profiles?.is_superadmin ? '#9333ea' : post.profiles?.is_admin ? '#16a34a' : '#ff520e',
                      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, fontSize: 12, flexShrink: 0,
                    }}>
                      {(post.profiles?.display_name ?? '?')[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#242424' }}>
                      {post.profiles?.display_name ?? 'Anoniem'}
                    </span>
                    <RoleBadge profile={post.profiles} />
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>{timeAgo(post.created_at)}</span>
                  </div>
                  {canDelete && (
                    <button onClick={() => deletePost(post.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 16 }}
                      title="Verwijderen"
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
                    >🗑</button>
                  )}
                </div>
                <p style={{ fontSize: 14, color: '#242424', whiteSpace: 'pre-wrap', margin: 0 }}>{post.content}</p>
                <button
                  onClick={() => setReplyTo(replyTo === post.id ? null : post.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#ff520e', marginTop: 8, padding: 0, fontWeight: 500 }}
                >
                  {replyTo === post.id ? 'Annuleren' : `💬 Reageren${replies.length > 0 ? ` (${replies.length})` : ''}`}
                </button>
              </div>

              {/* Replies */}
              {replies.length > 0 && (
                <div style={{ borderTop: '1px solid #f4f4f4', background: '#fafafa' }}>
                  {replies.map((r) => (
                    <div key={r.id} style={{ padding: '10px 16px 10px 24px', borderBottom: '1px solid #f4f4f4', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: r.profiles?.is_superadmin ? '#9333ea' : r.profiles?.is_admin ? '#16a34a' : '#e5e7eb',
                        color: r.profiles?.is_admin || r.profiles?.is_superadmin ? '#fff' : '#374151',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 10, flexShrink: 0,
                      }}>
                        {(r.profiles?.display_name ?? '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{r.profiles?.display_name ?? 'Anoniem'}</span>
                          <RoleBadge profile={r.profiles} />
                          <span style={{ fontSize: 11, color: '#9ca3af' }}>{timeAgo(r.created_at)}</span>
                          {(userId === r.user_id || isAdmin) && (
                            <button onClick={() => deleteReply(r.id, post.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', fontSize: 13, marginLeft: 'auto' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#d1d5db')}
                            >🗑</button>
                          )}
                        </div>
                        <p style={{ fontSize: 13, color: '#374151', margin: '2px 0 0' }}>{r.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply form */}
              {replyTo === post.id && userId && (
                <div style={{ borderTop: '1px solid #f4f4f4', padding: '10px 16px', background: '#fafafa', display: 'flex', gap: 8 }}>
                  <input
                    style={{ flex: 1, border: '1px solid #e8e8e8', borderRadius: 8, padding: '6px 12px', fontSize: 13, background: '#fff' }}
                    placeholder="Schrijf een reactie..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply() } }}
                    autoFocus
                  />
                  <button onClick={submitReply} disabled={!replyText.trim()}
                    style={{ background: '#ff520e', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
                  >→</button>
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* New post */}
      {userId ? (
        <div style={{ position: 'sticky', bottom: 16, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 10, padding: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: isSuperAdmin ? '#9333ea' : isAdmin ? '#16a34a' : '#ff520e',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 13, flexShrink: 0,
            }}>
              {displayName[0]?.toUpperCase() ?? '?'}
            </div>
            <div style={{ flex: 1 }}>
              <textarea
                style={{ width: '100%', border: '1px solid #e8e8e8', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'none', height: 72, fontFamily: 'Roboto, system-ui, sans-serif' }}
                placeholder="Stel een vraag of deel iets met de groep..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <button onClick={submitPost} disabled={posting || !newPost.trim()}
                  style={{ background: '#ff520e', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 18px', fontSize: 13, cursor: 'pointer', fontWeight: 500, opacity: (posting || !newPost.trim()) ? 0.5 : 1 }}>
                  {posting ? 'Posten...' : 'Posten →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ background: '#fff8f0', border: '1px solid #fed7aa', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: '#92400e', textAlign: 'center' }}>
          <Link href="/auth/login" style={{ color: '#ff520e', fontWeight: 600 }}>Inloggen</Link> om te reageren.
        </div>
      )}
    </div>
  )
}

