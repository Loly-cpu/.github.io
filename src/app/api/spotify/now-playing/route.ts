import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const getSupabaseAdmin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function refreshToken(userId: string, refreshToken: string) {
  const clientId     = process.env.SPOTIFY_CLIENT_ID!
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  })

  if (!res.ok) return null
  const data = await res.json()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  await getSupabaseAdmin().from('spotify_tokens').update({
    access_token: data.access_token,
    expires_at: expiresAt,
    ...(data.refresh_token ? { refresh_token: data.refresh_token } : {}),
  }).eq('user_id', userId)
  return data.access_token as string
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('user_id')
  if (!userId) return NextResponse.json({ error: 'missing user_id' }, { status: 400 })

  const { data: token } = await getSupabaseAdmin()
    .from('spotify_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (!token) return NextResponse.json({ connected: false })

  let accessToken = token.access_token
  if (new Date(token.expires_at) < new Date()) {
    accessToken = await refreshToken(userId, token.refresh_token) ?? accessToken
  }

  const npRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (npRes.status === 204 || npRes.status === 404) {
    return NextResponse.json({ connected: true, playing: false })
  }

  if (!npRes.ok) {
    return NextResponse.json({ connected: true, playing: false })
  }

  const np = await npRes.json()
  return NextResponse.json({
    connected: true,
    playing: np.is_playing,
    track: np.item?.name,
    artist: np.item?.artists?.map((a: { name: string }) => a.name).join(', '),
    album_art: np.item?.album?.images?.[0]?.url,
    track_url: np.item?.external_urls?.spotify,
    progress_ms: np.progress_ms,
    duration_ms: np.item?.duration_ms,
  })
}
