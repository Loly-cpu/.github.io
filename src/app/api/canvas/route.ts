import { NextResponse } from 'next/server'

const BASE = process.env.CANVAS_BASE_URL ?? 'https://canvas.instructure.com'
const TOKEN = process.env.CANVAS_API_TOKEN

async function cf(path: string) {
  if (!TOKEN) throw new Error('CANVAS_API_TOKEN niet ingesteld in .env.local')
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
    next: { revalidate: 300 },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Canvas API ${res.status}: ${body.slice(0, 200)}`)
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return res.json() as Promise<any>
}

export async function GET() {
  try {
    const rawCourses = await cf('/api/v1/courses?enrollment_state=active&per_page=50')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const active = rawCourses.filter((c: any) => c.workflow_state === 'available')

    const results = await Promise.allSettled(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      active.map(async (course: any) => {
        const modules = await cf(`/api/v1/courses/${course.id}/modules?per_page=100`)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const completed = modules.filter((m: any) => m.state === 'completed').length
        return {
          id: course.id,
          name: course.name,
          course_code: course.course_code,
          url: `${BASE}/courses/${course.id}`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          modules: modules.map((m: any) => ({
            id: m.id,
            name: m.name,
            state: m.state as 'locked' | 'unlocked' | 'started' | 'completed',
            items_count: m.items_count as number,
          })),
          completedModules: completed,
          totalModules: modules.length,
        }
      })
    )

    const courses = results
      .filter((r) => r.status === 'fulfilled')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r) => (r as PromiseFulfilledResult<any>).value)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((c: any) => c.totalModules > 0)

    return NextResponse.json({ courses })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
