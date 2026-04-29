import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function refreshIfNeeded(token: { access_token: string; refresh_token?: string; expires_at?: string }) {
  if (!token.expires_at) return token.access_token
  if (new Date(token.expires_at) > new Date(Date.now() + 60_000)) return token.access_token

  // Token expired — refresh
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CALENDAR_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET!,
      refresh_token: token.refresh_token ?? '',
      grant_type:    'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token as string
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId vereist' }, { status: 400 })

  const { data: tokenRow } = await supabaseAdmin
    .from('calendar_tokens').select('*').eq('user_id', userId).eq('provider', 'google').single()
  if (!tokenRow) return NextResponse.json({ error: 'Geen Google Calendar gekoppeld' }, { status: 404 })

  const accessToken = await refreshIfNeeded(tokenRow)
  const now    = new Date().toISOString()
  const future = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() // 90 days ahead

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${future}&singleEvents=true&orderBy=startTime&maxResults=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const data = await res.json()
  return NextResponse.json({ events: data.items ?? [], connected: true })
}

// POST: create event in Google Calendar
export async function POST(req: Request) {
  const { userId, event } = await req.json()
  if (!userId || !event) return NextResponse.json({ error: 'userId en event vereist' }, { status: 400 })

  const { data: tokenRow } = await supabaseAdmin
    .from('calendar_tokens').select('*').eq('user_id', userId).eq('provider', 'google').single()
  if (!tokenRow) return NextResponse.json({ error: 'Niet verbonden' }, { status: 404 })

  const accessToken = await refreshIfNeeded(tokenRow)
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: event.title,
      description: event.notes ?? '',
      start: { dateTime: event.start_at, timeZone: 'Europe/Brussels' },
      end:   { dateTime: event.end_at,   timeZone: 'Europe/Brussels' },
    }),
  })
  const data = await res.json()
  return NextResponse.json(data)
}
