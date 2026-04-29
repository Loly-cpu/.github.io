import { NextResponse } from 'next/server'

const CLIENT_ID     = process.env.GOOGLE_CALENDAR_CLIENT_ID!
const REDIRECT_URI  = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google-calendar/callback`
  : 'http://localhost:3000/api/auth/google-calendar/callback'

export async function GET() {
  if (!CLIENT_ID) {
    return NextResponse.json({ error: 'GOOGLE_CALENDAR_CLIENT_ID niet ingesteld' }, { status: 500 })
  }

  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'openid',
      'email',
    ].join(' '),
    access_type:   'offline',
    prompt:        'consent',
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  )
}
