import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const clientId    = process.env.SPOTIFY_CLIENT_ID
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI ?? `${process.env.NEXT_PUBLIC_SITE_URL}/api/auth/spotify/callback`

  if (!clientId) {
    return NextResponse.json({ error: 'SPOTIFY_CLIENT_ID not configured' }, { status: 500 })
  }

  // Pass user_id in state so the callback knows who to save tokens for
  const userId = req.nextUrl.searchParams.get('user_id') ?? ''

  const scopes = [
    'user-read-currently-playing',
    'user-read-playback-state',
    'user-read-recently-played',
    'user-top-read',
    'playlist-read-private',
  ].join(' ')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: scopes,
    redirect_uri: redirectUri,
    state: userId,
    show_dialog: 'false',
  })

  return NextResponse.redirect(`https://accounts.spotify.com/authorize?${params}`)
}
