'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { use } from 'react'

interface Post {
  id: string; content: string; created_at: string; user_id: string
  profiles?: { display_name: string }
  replies?: Reply[]
}
interface Reply {
  id: string; content: string; created_at: string; user_id: string
  profiles?: { display_name: string }
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

export default function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [group, setGroup] = useState<Group | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [isMember, setIsMember] = useState(false)
  const [newPost, setNewPost] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [posting, setPosting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user?.id ?? null
      setUserId(uid)
      if (uid) {
        const { data: p } = await supabase.from('profiles').select('display_name').eq('id', uid).single()
        setDisplayName(p?.display_name ?? uid.slice(0, 8))
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
      .select('*, profiles(display_name), group_post_replies(*, profiles(display_name))')
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
    await supabase.from('group_posts').delete().eq('id', postId)
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  if (!group) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary-400 border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <Link href="/platform/groepen" className="text-gray-400 hover:text-gray-600 text-sm mt-1">← Terug</Link>
        <div className="flex items-center gap-3 flex-1">
          <span className="text-3xl">{group.icon}</span>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{group.name}</h1>
            {group.subject && <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">{group.subject}</span>}
            {group.description && <p className="text-sm text-gray-500 mt-0.5">{group.description}</p>}
          </div>
        </div>
        {isMember && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">Lid</span>}
      </div>

      {/* Posts */}
      <div className="space-y-4 mb-6">
        {posts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-3xl mb-2">💬</p>
            <p>Nog geen berichten. Wees de eerste!</p>
          </div>
        )}
        {posts.map((post) => (
          <div key={post.id} className="bg-white border border-warm-gray rounded-2xl overflow-hidden">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary-200 flex items-center justify-center text-xs font-bold text-primary-700">
                    {(post.profiles?.display_name ?? '?')[0].toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-gray-800">{post.profiles?.display_name ?? 'Anoniem'}</span>
                  <span className="text-xs text-gray-400">{timeAgo(post.created_at)}</span>
                </div>
                {(userId === post.user_id) && (
                  <button onClick={() => deletePost(post.id)} className="text-gray-300 hover:text-red-400 text-sm">🗑</button>
                )}
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{post.content}</p>
              <button
                onClick={() => setReplyTo(replyTo === post.id ? null : post.id)}
                className="text-xs text-primary-500 hover:text-primary-700 mt-2 font-medium"
              >
                {replyTo === post.id ? 'Annuleren' : `💬 Reageren${(post.replies?.length ?? 0) > 0 ? ` (${post.replies!.length})` : ''}`}
              </button>
            </div>

            {/* Replies */}
            {(post.replies?.length ?? 0) > 0 && (
              <div className="border-t border-warm-gray bg-gray-50 divide-y divide-warm-gray">
                {post.replies!.map((r) => (
                  <div key={r.id} className="px-6 py-2.5 flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 mt-0.5">
                      {(r.profiles?.display_name ?? '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-gray-700">{r.profiles?.display_name ?? 'Anoniem'} </span>
                      <span className="text-xs text-gray-400">{timeAgo(r.created_at)}</span>
                      <p className="text-sm text-gray-700 mt-0.5">{r.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply form */}
            {replyTo === post.id && userId && (
              <div className="border-t border-warm-gray px-4 py-3 bg-gray-50 flex gap-2">
                <input
                  className="flex-1 border border-warm-gray rounded-xl px-3 py-2 text-sm bg-white"
                  placeholder="Schrijf een reactie..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitReply() } }}
                />
                <button onClick={submitReply} disabled={!replyText.trim()}
                  className="btn-primary text-sm px-3 py-2 disabled:opacity-50">→</button>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* New post */}
      {userId ? (
        <div className="sticky bottom-4 bg-white border-2 border-warm-gray rounded-2xl p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-200 flex items-center justify-center text-sm font-bold text-primary-700 flex-shrink-0">
              {displayName[0]?.toUpperCase() ?? '?'}
            </div>
            <div className="flex-1 space-y-2">
              <textarea
                className="w-full border border-warm-gray rounded-xl px-3 py-2 text-sm resize-none h-20"
                placeholder="Stel een vraag of deel iets met de groep..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
              />
              <div className="flex justify-end">
                <button onClick={submitPost} disabled={posting || !newPost.trim()}
                  className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
                  {posting ? 'Posten...' : 'Posten →'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 text-center">
          <Link href="/auth/login" className="underline font-semibold">Inloggen</Link> om te reageren.
        </div>
      )}
    </div>
  )
}
