'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { use } from 'react'
import { ArrowLeftIcon, SendIcon, ReplyIcon, Trash2Icon } from 'lucide-react'

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
  if (profile?.is_superadmin) return <span style={{ fontSize: 9, background: 'rgba(147,51,234,0.3)', color: '#d8b4fe', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>SA</span>
  if (profile?.is_admin)      return <span style={{ fontSize: 9, background: 'rgba(22,163,74,0.3)', color: '#86efac', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>A</span>
  return null
}

function Avatar({ profile, size = 32 }: { profile?: Profile; size?: number }) {
  const isSA = profile?.is_superadmin
  const isA  = profile?.is_admin
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: isSA ? 'rgba(147,51,234,0.6)' : isA ? 'rgba(22,163,74,0.6)' : 'rgba(255,82,14,0.6)',
      border: `1px solid ${isSA ? 'rgba(216,180,254,0.4)' : isA ? 'rgba(134,239,172,0.4)' : 'rgba(255,82,14,0.4)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontWeight: 700, fontSize: size * 0.38,
      backdropFilter: 'blur(4px)',
    }}>
      {(profile?.display_name ?? '?')[0].toUpperCase()}
    </div>
  )
}

export default function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [group, setGroup]           = useState<Group | null>(null)
  const [posts, setPosts]           = useState<Post[]>([])
  const [userId, setUserId]         = useState<string | null>(null)
  const [isAdmin, setIsAdmin]       = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [myProfile, setMyProfile]   = useState<Profile | undefined>()
  const [isMember, setIsMember]     = useState(false)
  const [newPost, setNewPost]       = useState('')
  const [replyTo, setReplyTo]       = useState<string | null>(null)
  const [replyText, setReplyText]   = useState('')
  const [posting, setPosting]       = useState(false)
  const [undoToast, setUndoToast]   = useState<{ id: string; type: 'post'|'reply'; postId?: string; timer: ReturnType<typeof setTimeout> } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null
      setUserId(uid)
      if (uid) {
        const { data: p } = await supabase.from('profiles').select('display_name, is_admin, is_superadmin').eq('id', uid).single()
        setDisplayName(p?.display_name ?? uid.slice(0, 8))
        setIsSuperAdmin(p?.is_superadmin ?? false)
        setIsAdmin((p?.is_admin || p?.is_superadmin) ?? false)
        setMyProfile(p ?? undefined)
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
    const { data, error } = await supabase
      .from('group_posts')
      .select('*, profiles!group_posts_user_id_profiles_fkey(display_name, is_admin, is_superadmin), group_post_replies(*, profiles!group_post_replies_user_id_profiles_fkey(display_name, is_admin, is_superadmin))')
      .eq('group_id', id)
      .order('created_at', { ascending: true })
    if (!error && data) setPosts(data as Post[])
  }

  async function submitPost() {
    if (!userId || !newPost.trim()) return
    setPosting(true)
    await supabase.from('group_posts').insert({ group_id: id, user_id: userId, content: newPost.trim() })
    setNewPost('')
    if (textareaRef.current) textareaRef.current.style.height = '48px'
    await loadPosts()
    setPosting(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  async function submitReply() {
    if (!userId || !replyText.trim() || !replyTo) return
    await supabase.from('group_post_replies').insert({ post_id: replyTo, user_id: userId, content: replyText.trim() })
    setReplyText(''); setReplyTo(null)
    await loadPosts()
  }

  async function deletePost(postId: string) {
    const { error } = await supabase.from('group_posts').update({ deleted_at: new Date().toISOString() }).eq('id', postId)
    if (error) { console.error('Delete failed:', error); return }
    setPosts(prev => prev.filter(p => p.id !== postId))
    if (undoToast) clearTimeout(undoToast.timer)
    const timer = setTimeout(() => setUndoToast(null), 8000)
    setUndoToast({ id: postId, type: 'post', timer })
  }

  async function undoDelete() {
    if (!undoToast) return
    clearTimeout(undoToast.timer)
    if (undoToast.type === 'post') {
      await supabase.from('group_posts').update({ deleted_at: null }).eq('id', undoToast.id)
    } else {
      await supabase.from('group_post_replies').update({ deleted_at: null }).eq('id', undoToast.id)
    }
    setUndoToast(null)
    await loadPosts()
  }

  async function deleteReply(replyId: string, postId: string) {
    const { error } = await supabase.from('group_post_replies').update({ deleted_at: new Date().toISOString() }).eq('id', replyId)
    if (error) { console.error('Delete reply failed:', error); return }
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, group_post_replies: p.group_post_replies?.filter(r => r.id !== replyId) }
        : p
    ))
    if (undoToast) clearTimeout(undoToast.timer)
    const timer = setTimeout(() => setUndoToast(null), 8000)
    setUndoToast({ id: replyId, type: 'reply', postId, timer })
  }

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = '48px'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  if (!group) return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#ff520e', borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
      display: 'flex', flexDirection: 'column',
      paddingBottom: 0,
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <Link href="/platform/berichten"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', textDecoration: 'none', flexShrink: 0, transition: 'background 0.15s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}>
          <ArrowLeftIcon size={16} />
        </Link>
        <span style={{ fontSize: 26 }}>{group.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.name}</h1>
          {group.description && <p style={{ margin: 0, fontSize: 12, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.description}</p>}
        </div>
        {isMember && <span style={{ fontSize: 11, background: 'rgba(255,82,14,0.2)', color: '#fb923c', borderRadius: 20, padding: '3px 10px', fontWeight: 600, border: '1px solid rgba(255,82,14,0.3)', flexShrink: 0 }}>Lid</span>}
      </div>

      {/* Posts */}
      <div style={{ flex: 1, padding: '20px', maxWidth: 760, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 120 }}>
        {posts.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#475569' }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>💬</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Nog geen berichten</p>
            <p style={{ fontSize: 13, color: '#475569' }}>Wees de eerste om iets te delen.</p>
          </div>
        )}

        {posts.map(post => {
          const isOwn     = userId === post.user_id
          const canDelete = isOwn || isAdmin
          const replies   = post.group_post_replies ?? []

          return (
            <div key={post.id} style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16, overflow: 'hidden',
              backdropFilter: 'blur(12px)',
              transition: 'border-color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)')}>

              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <Avatar profile={post.profiles} size={30} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{post.profiles?.display_name ?? 'Anoniem'}</span>
                    <RoleBadge profile={post.profiles} />
                    <span style={{ fontSize: 11, color: '#475569' }}>{timeAgo(post.created_at)}</span>
                  </div>
                  {canDelete && (
                    <button onClick={() => deletePost(post.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', padding: 4, borderRadius: 6, display: 'flex', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}>
                      <Trash2Icon size={14} />
                    </button>
                  )}
                </div>
                <p style={{ fontSize: 14, color: '#cbd5e1', whiteSpace: 'pre-wrap', margin: '0 0 10px', lineHeight: 1.6 }}>{post.content}</p>
                <button onClick={() => setReplyTo(replyTo === post.id ? null : post.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: replyTo === post.id ? '#fb923c' : '#64748b', padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500, transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#fb923c')}
                  onMouseLeave={e => (e.currentTarget.style.color = replyTo === post.id ? '#fb923c' : '#64748b')}>
                  <ReplyIcon size={12} />
                  {replyTo === post.id ? 'Annuleren' : `Reageren${replies.length > 0 ? ` (${replies.length})` : ''}`}
                </button>
              </div>

              {/* Replies */}
              {replies.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                  {replies.map(r => (
                    <div key={r.id} style={{ padding: '10px 16px 10px 28px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <Avatar profile={r.profiles} size={22} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>{r.profiles?.display_name ?? 'Anoniem'}</span>
                          <RoleBadge profile={r.profiles} />
                          <span style={{ fontSize: 11, color: '#475569' }}>{timeAgo(r.created_at)}</span>
                          {(userId === r.user_id || isAdmin) && (
                            <button onClick={() => deleteReply(r.id, post.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.15)', marginLeft: 'auto', padding: 2, display: 'flex', transition: 'color 0.15s' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.15)')}>
                              <Trash2Icon size={12} />
                            </button>
                          )}
                        </div>
                        <p style={{ fontSize: 13, color: '#94a3b8', margin: '3px 0 0' }}>{r.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply form */}
              {replyTo === post.id && userId && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '10px 16px', background: 'rgba(0,0,0,0.15)', display: 'flex', gap: 8 }}>
                  <input
                    style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', fontSize: 13, color: '#e2e8f0', outline: 'none' }}
                    placeholder="Schrijf een reactie..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply() } }}
                    autoFocus
                  />
                  <button onClick={submitReply} disabled={!replyText.trim()}
                    style={{ background: 'rgba(255,82,14,0.8)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', opacity: !replyText.trim() ? 0.4 : 1 }}>
                    <SendIcon size={14} />
                  </button>
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Undo toast */}
      {undoToast && (
        <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: 'rgba(15,23,42,0.95)', backdropFilter: 'blur(12px)', color: '#f1f5f9', borderRadius: 12, padding: '10px 16px', fontSize: 13, fontWeight: 500, zIndex: 200, boxShadow: '0 4px 24px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ color: '#94a3b8' }}>Verwijderd — herstelbaar tot 12u</span>
          <button onClick={undoDelete}
            style={{ background: 'rgba(255,82,14,0.8)', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Ongedaan maken
          </button>
        </div>
      )}

      {/* Input — sticky onderaan */}
      <div style={{
        position: 'sticky', bottom: 0, zIndex: 10,
        padding: '12px 20px',
        background: 'rgba(15,23,42,0.90)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {userId ? (
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, overflow: 'hidden', backdropFilter: 'blur(12px)', transition: 'border-color 0.2s' }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(255,82,14,0.5)')}
              onBlurCapture={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px 0' }}>
                <Avatar profile={myProfile} size={28} />
                <textarea
                  ref={textareaRef}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                    fontSize: 14, color: '#e2e8f0', fontFamily: 'Roboto, system-ui',
                    minHeight: 48, maxHeight: 160, lineHeight: 1.5,
                    paddingTop: 6,
                  }}
                  placeholder="Stel een vraag of deel iets met de groep..."
                  value={newPost}
                  onChange={e => { setNewPost(e.target.value); autoResize(e.target) }}
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); submitPost() } }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px' }}>
                <span style={{ fontSize: 11, color: '#475569' }}>Ctrl+Enter om te posten</span>
                <button onClick={submitPost} disabled={posting || !newPost.trim()}
                  style={{
                    background: posting || !newPost.trim() ? 'rgba(255,255,255,0.08)' : 'rgba(255,82,14,0.85)',
                    color: posting || !newPost.trim() ? '#475569' : '#fff',
                    border: 'none', borderRadius: 10, padding: '7px 18px',
                    fontSize: 13, cursor: 'pointer', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                  }}>
                  <SendIcon size={14} />
                  {posting ? 'Posten…' : 'Posten'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '14px', textAlign: 'center', fontSize: 13, color: '#64748b' }}>
              <Link href="/auth/login" style={{ color: '#fb923c', fontWeight: 600 }}>Inloggen</Link> om te reageren.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
