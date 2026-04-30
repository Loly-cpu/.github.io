import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cf(path: string, base: string, token: string): Promise<any> {
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    next: { revalidate: 300 },
  })
  if (!res.ok) throw new Error(`Canvas ${res.status}`)
  return res.json()
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('user_id')

  // Try personal canvas token from profile first
  let BASE  = process.env.CANVAS_BASE_URL  ?? 'https://canvas.instructure.com'
  let TOKEN = process.env.CANVAS_API_TOKEN ?? ''

  if (userId) {
    const sb = getSupabaseAdmin()
    const { data: p } = await sb.from('profiles').select('canvas_url,canvas_token').eq('id', userId).single()
    if (p?.canvas_url && p?.canvas_token) {
      BASE  = p.canvas_url.replace(/\/$/, '')
      TOKEN = p.canvas_token
    }
  }

  if (!TOKEN) return NextResponse.json({ error: 'Geen Canvas-token. Koppel je Canvas-account via Profiel → Accounts beheren.' }, { status: 400 })
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawCourses: any[] = await cf('/api/v1/courses?enrollment_state=active&per_page=50', BASE, TOKEN)
    const active = rawCourses.filter((c) => c.workflow_state === 'available')

    const results = await Promise.allSettled(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      active.map(async (course: any) => {
        const [assignments, submissions] = await Promise.all([
          cf(`/api/v1/courses/${course.id}/assignments?per_page=100&order_by=due_at`, BASE, TOKEN).catch(() => []),
          cf(`/api/v1/courses/${course.id}/submissions?student_ids[]=self&per_page=100&include[]=assignment`, BASE, TOKEN).catch(() => []),
        ])

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subMap: Record<string, any> = {}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const s of submissions as any[]) subMap[s.assignment_id] = s

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const items = (assignments as any[]).map((a: any) => {
          const sub = subMap[a.id]
          const score: number | null = sub?.score ?? null
          const max: number = a.points_possible ?? 0
          const submitted = sub?.submitted_at != null
          const graded = sub?.grade != null && sub.grade !== 'not_graded'
          return {
            id: a.id,
            name: a.name,
            group: a.assignment_group_id,
            max,
            score,
            submitted,
            graded,
            due: a.due_at ?? null,
            submitted_at: sub?.submitted_at ?? null,
          }
        }).filter((a) => a.max > 0)

        // Group by name prefix (alles voor " | " of " reeks ")
        const groups: Record<string, typeof items> = {}
        for (const item of items) {
          const key = item.name.replace(/\s*[\|]\s*reeks\s*[A-Z]$/i, '')
            .replace(/\s*reeks\s*[A-Z]$/i, '')
            .replace(/\s*[\|]\s*[A-Z]$/i, '')
            .trim()
          if (!groups[key]) groups[key] = []
          groups[key].push(item)
        }

        const totalScore = items.reduce((s, i) => s + (i.score ?? 0), 0)
        const totalMax   = items.reduce((s, i) => s + i.max, 0)
        const gradedItems = items.filter((i) => i.score !== null)

        return {
          id: course.id,
          name: course.name,
          url: `${BASE}/courses/${course.id}/grades`,
          totalScore,
          totalMax,
          pct: totalMax > 0 && gradedItems.length > 0
            ? Math.round((totalScore / totalMax) * 1000) / 10
            : null,
          groups: Object.entries(groups).map(([name, its]) => ({
            name,
            items: its,
            score: its.reduce((s, i) => s + (i.score ?? 0), 0),
            max:   its.reduce((s, i) => s + i.max, 0),
          })),
        }
      })
    )

    const courses = results
      .filter((r) => r.status === 'fulfilled')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r) => (r as PromiseFulfilledResult<any>).value)
      .filter((c) => c.groups.length > 0)

    return NextResponse.json({ courses })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
