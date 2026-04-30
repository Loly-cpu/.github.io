import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code   = searchParams.get('code')
  const error  = searchParams.get('error')
  const userId = searchParams.get('state') // passed as state from the authorize step

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://examen.atlasleads.be'

  if (error || !code) {
    return NextResponse.redirect(`${siteUrl}/platform?spotify=error`)
  }

  const clientId     = process.env.SPOTIFY_CLIENT_ID!
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!
  const redirectUri  = process.env.SPOTIFY_REDIRECT_URI ?? `${siteUrl}/api/auth/spotify/callback`

  // Exchange code for tokens
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${siteUrl}/platform?spotify=error`)
  }

  const tokens = await tokenRes.json()

  // Get Spotify user profile
  const profileRes = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const spotifyProfile = profileRes.ok ? await profileRes.json() : null

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  if (userId) {
    await getSupabaseAdmin().from('spotify_tokens').upsert({
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      spotify_user_id: spotifyProfile?.id ?? null,
      display_name: spotifyProfile?.display_name ?? null,
      image_url: spotifyProfile?.images?.[0]?.url ?? null,
    })
  }

  return NextResponse.redirect(`${siteUrl}/platform?spotify=connected`)
}
