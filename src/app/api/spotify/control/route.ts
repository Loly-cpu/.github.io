import { NextRequest, NextResponse } from 'next/server'

const getAdmin = () => {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

async function refreshIfNeeded(userId: string, token: { access_token: string; refresh_token: string; expires_at: string }) {
  if (new Date(token.expires_at) > new Date(Date.now() + 30000)) return token.access_token
  const clientId = process.env.SPOTIFY_CLIENT_ID!
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: token.refresh_token }),
  })
  if (!res.ok) return token.access_token
  const data = await res.json()
  await getAdmin().from('spotify_tokens').update({
    access_token: data.access_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
  }).eq('user_id', userId)
  return data.access_token as string
}

// POST /api/spotify/control  body: { user_id, action: 'play'|'pause'|'next'|'previous' }
export async function POST(req: NextRequest) {
  const { user_id, action } = await req.json()
  if (!user_id || !action) return NextResponse.json({ error: 'missing params' }, { status: 400 })

  const { data: tokenRow } = await getAdmin()
    .from('spotify_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', user_id)
    .maybeSingle()

  if (!tokenRow?.refresh_token || tokenRow.refresh_token === '') {
    return NextResponse.json({ error: 'not_connected' }, { status: 403 })
  }

  const accessToken = await refreshIfNeeded(user_id, tokenRow)

  const ENDPOINTS: Record<string, { method: string; path: string }> = {
    play:     { method: 'PUT',  path: '/me/player/play' },
    pause:    { method: 'PUT',  path: '/me/player/pause' },
    next:     { method: 'POST', path: '/me/player/next' },
    previous: { method: 'POST', path: '/me/player/previous' },
  }

  const ep = ENDPOINTS[action]
  if (!ep) return NextResponse.json({ error: 'invalid action' }, { status: 400 })

  const res = await fetch(`https://api.spotify.com/v1${ep.path}`, {
    method: ep.method,
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  // 204 = success (no content), 403/404 = no active device
  if (res.status === 204 || res.ok) return NextResponse.json({ ok: true })
  const body = await res.text()
  return NextResponse.json({ error: body }, { status: res.status })
}
