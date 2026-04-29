import { NextResponse } from 'next/server'

const BASE = process.env.CANVAS_BASE_URL ?? 'https://canvas.instructure.com'
const TOKEN = process.env.CANVAS_API_TOKEN

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function cf(path: string): Promise<any> {
  if (!TOKEN) throw new Error('CANVAS_API_TOKEN niet ingesteld in .env.local')
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    next: { revalidate: 120 },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Canvas ${res.status}: ${body.slice(0, 150)}`)
  }
  return res.json()
}

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawCourses: any[] = await cf('/api/v1/courses?enrollment_state=active&per_page=50')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const active = rawCourses.filter((c: any) => c.workflow_state === 'available')

    const results = await Promise.allSettled(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      active.map(async (course: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mods: any[] = await cf(
          `/api/v1/courses/${course.id}/modules?include[]=items&per_page=100`
        ).catch(() => [])

        // Real item-level completion — only items with completion_requirement are truly tracked
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allItems = mods.flatMap((m: any) => m.items ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const tracked = allItems.filter((i: any) => i.completion_requirement != null)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const done = tracked.filter((i: any) => i.completion_requirement?.completed === true)

        const hasTracking = tracked.length > 0
        const pct = hasTracking ? Math.round((done.length / tracked.length) * 100) : null

        return {
          id: course.id,
          name: course.name,
          url: `${BASE}/courses/${course.id}`,
          pct,           // null = INZICHT PLUS style (no API tracking)
          doneCount: done.length,
          totalCount: tracked.length,
          hasTracking,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          modules: mods.map((m: any) => ({
            id: m.id,
            name: m.name,
            url: `${BASE}/courses/${course.id}/modules#module_${m.id}`,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            items: (m.items ?? []).filter((i: any) => i.type !== 'SubHeader').map((i: any) => ({
              id: i.id,
              title: i.title,
              type: i.type as string,
              url: i.html_url as string,
              req: i.completion_requirement
                ? {
                    type: i.completion_requirement.type as string,
                    completed: i.completion_requirement.completed as boolean,
                    min_score: (i.completion_requirement.min_score as number) ?? null,
                  }
                : null,
            })),
          })).filter((m: { items: unknown[] }) => m.items.length > 0),
        }
      })
    )

    const courses = results
      .filter((r) => r.status === 'fulfilled')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r) => (r as PromiseFulfilledResult<any>).value)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((c: any) => c.modules.length > 0)

    return NextResponse.json({ courses })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
