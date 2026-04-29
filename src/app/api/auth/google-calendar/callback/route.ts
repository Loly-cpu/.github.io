import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CLIENT_ID     = process.env.GOOGLE_CALENDAR_CLIENT_ID!
const CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET!
const REDIRECT_URI  = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`
  : 'http://localhost:3000/api/auth/google-calendar/callback'

// Use service-role key to write tokens server-side
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/platform/agenda?gcal=error`
    )
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri:  REDIRECT_URI,
        grant_type:    'authorization_code',
      }),
    })
    const tokens = await tokenRes.json()
    if (!tokens.access_token) throw new Error('Geen access_token ontvangen')

    // Get user email from Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const profile = await profileRes.json()

    // Match Google email to Supabase user
    const { data: users } = await supabaseAdmin.auth.admin.listUsers()
    const match = users.users.find(u => u.email === profile.email)
    if (!match) throw new Error('Geen Supabase-account gevonden voor dit Google-account')

    // Store tokens
    const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString()
    await supabaseAdmin.from('calendar_tokens').upsert({
      user_id:       match.id,
      provider:      'google',
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at:    expiresAt,
      email:         profile.email,
      updated_at:    new Date().toISOString(),
    })

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/platform/agenda?gcal=success`
    )
  } catch (err) {
    console.error('Google Calendar OAuth error:', err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/platform/agenda?gcal=error`
    )
  }
}
