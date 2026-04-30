import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { url, token } = await req.json()
    if (!url || !token) return NextResponse.json({ error: 'url en token zijn verplicht' }, { status: 400 })

    const base = url.replace(/\/$/, '')
    const res = await fetch(`${base}/api/v1/users/self/profile`, {
      headers: { Authorization: `Bearer ${token}`, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return NextResponse.json({ error: `Canvas antwoordde met status ${res.status}. Controleer je URL en token.` }, { status: 400 })
    }

    const data = await res.json()
    return NextResponse.json({ name: data.name ?? data.login_id ?? 'Onbekend', ok: true })
  } catch (e) {
    return NextResponse.json({ error: 'Kan Canvas niet bereiken. Controleer je URL.' }, { status: 500 })
  }
}
