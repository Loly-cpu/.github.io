import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const PROTECTED = ['/platform', '/examenboard', '/dashboard', '/learn', '/placement']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Only guard protected routes
  const isProtected = PROTECTED.some(p => pathname === p || pathname.startsWith(p + '/'))
  if (!isProtected) return NextResponse.next()

  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    const loginUrl = new URL('/auth/login', req.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Check if blocked
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_blocked, banned_until')
    .eq('id', session.user.id)
    .single()

  if (profile?.is_blocked) {
    const until = profile.banned_until
    const stillBanned = !until || new Date(until) > new Date()
    if (stillBanned) {
      return NextResponse.redirect(new URL('/auth/geblokkeerd', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/platform/:path*', '/examenboard/:path*', '/dashboard/:path*', '/learn/:path*', '/placement/:path*'],
}
