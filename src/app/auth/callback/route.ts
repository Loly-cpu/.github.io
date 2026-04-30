import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code     = searchParams.get('code')
  const next     = searchParams.get('next') ?? '/platform'
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://examen.atlasleads.be'

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/auth/login?error=no_code`)
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (newCookies) =>
          newCookies.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${siteUrl}/auth/login?error=${encodeURIComponent(error.message)}`)
  }

  return NextResponse.redirect(`${siteUrl}${next}`)
}
