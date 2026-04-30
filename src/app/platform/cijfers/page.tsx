'use client'
import { useEffect, useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon, ExternalLinkIcon, TrendingUpIcon, AlertTriangleIcon } from 'lucide-react'

interface Assignment {
  id: number
  name: string
  max: number
  score: number | null
  submitted: boolean
  graded: boolean
  due: string | null
  submitted_at: string | null
}

interface Group {
  name: string
  items: Assignment[]
  score: number
  max: number
}

interface Course {
  id: number
  name: string
  url: string
  totalScore: number
  totalMax: number
  pct: number | null
  groups: Group[]
}

function pctColor(pct: number | null): string {
  if (pct === null) return '#6b7280'
  if (pct >= 80) return '#16a34a'
  if (pct >= 60) return '#d97706'
  return '#dc2626'
}

function pctBg(pct: number | null): string {
  if (pct === null) return '#f9fafb'
  if (pct >= 80) return '#f0fdf4'
  if (pct >= 60) return '#fffbeb'
  return '#fef2f2'
}

function ScoreBar({ score, max }: { score: number | null; max: number }) {
  const pct = score !== null && max > 0 ? (score / max) * 100 : 0
  const color = pctColor(score !== null ? pct : null)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 6, background: '#e5e7eb', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 6, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 48, textAlign: 'right' }}>
        {score !== null ? `${score} / ${max}` : `— / ${max}`}
      </span>
    </div>
  )
}

function GroupRow({ group, open, onToggle }: { group: Group; open: boolean; onToggle: () => void }) {
  const scoredItems = group.items.filter(i => i.score !== null)
  const pct = group.max > 0 && scoredItems.length > 0 ? Math.round((group.score / group.max) * 100) : null
  const color = pctColor(pct)
  const bg    = pctBg(pct)

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden', marginBottom: 6 }}>
      <button onClick={onToggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px', background: bg, border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        {open ? <ChevronDownIcon size={15} style={{ color: '#6b7280', flexShrink: 0 }} /> : <ChevronRightIcon size={15} style={{ color: '#6b7280', flexShrink: 0 }} />}
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#111827' }}>{group.name}</span>
        <span style={{ fontSize: 11, color: '#6b7280', marginRight: 8 }}>{scoredItems.length}/{group.items.length} beoordeeld</span>
        <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 64, textAlign: 'right' }}>
          {pct !== null ? `${pct}%` : '—'}
        </span>
      </button>

      {open && (
        <div style={{ background: '#fff' }}>
          {group.items.map(item => {
            const iPct = item.score !== null && item.max > 0 ? (item.score / item.max) * 100 : null
            const iColor = pctColor(iPct)
            return (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 14px 8px 38px',
                borderTop: '1px solid #f3f4f6',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </p>
                  {item.submitted_at && (
                    <p style={{ margin: 0, fontSize: 10, color: '#9ca3af' }}>
                      Ingediend {new Date(item.submitted_at).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
                {item.graded && item.score !== null ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 80, height: 5, borderRadius: 5, background: '#e5e7eb', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, (item.score / item.max) * 100)}%`, background: iColor, borderRadius: 5 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: iColor, minWidth: 56, textAlign: 'right' }}>
                      {item.score.toLocaleString('nl-BE', { maximumFractionDigits: 2 })} / {item.max}
                    </span>
                  </div>
                ) : item.submitted ? (
                  <span style={{ fontSize: 11, color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '2px 8px' }}>Nog niet beoordeeld</span>
                ) : (
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>— / {item.max}</span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CijfersPage() {
  const [courses, setCourses]   = useState<Course[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [openCourses, setOpenCourses] = useState<Record<number, boolean>>({})

  useEffect(() => {
    fetch('/api/canvas/grades')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setCourses(d.courses ?? [])
        const firstOpen: Record<number, boolean> = {}
        for (const c of d.courses ?? []) firstOpen[c.id] = true
        setOpenCourses(firstOpen)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const toggleGroup = (key: string) => setOpenGroups(p => ({ ...p, [key]: !p[key] }))
  const toggleCourse = (id: number) => setOpenCourses(p => ({ ...p, [id]: !p[id] }))

  // Weak spots: graded items with pct < 60
  const weakItems = courses.flatMap(c =>
    c.groups.flatMap(g =>
      g.items.filter(i => i.score !== null && i.max > 0 && (i.score / i.max) < 0.6)
        .map(i => ({ ...i, courseName: c.name, groupName: g.name }))
    )
  )

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>Mijn cijfers</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Via Canvas — automatisch bijgewerkt</p>
        </div>
        <a href="https://canvas.instructure.com/grades" target="_blank" rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#2563eb', textDecoration: 'none', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '6px 12px' }}>
          <ExternalLinkIcon size={13} /> Open Canvas
        </a>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
          <p style={{ fontSize: 14 }}>Cijfers ophalen uit Canvas…</p>
        </div>
      )}

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '16px 20px', color: '#dc2626', fontSize: 13 }}>
          <strong>Fout:</strong> {error}
        </div>
      )}

      {!loading && !error && courses.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
          <p style={{ fontSize: 14 }}>Geen actieve cursussen gevonden.</p>
        </div>
      )}

      {/* Weak spots */}
      {weakItems.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <AlertTriangleIcon size={16} style={{ color: '#d97706' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#92400e' }}>Aandachtspunten (onder 60%)</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {weakItems.map(i => (
              <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 700, minWidth: 48 }}>
                  {Math.round((i.score! / i.max) * 100)}%
                </span>
                <span style={{ fontSize: 12, color: '#374151' }}>{i.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course cards */}
      {courses.map(course => {
        const isOpen = openCourses[course.id] ?? true
        const color  = pctColor(course.pct)
        const bg     = pctBg(course.pct)

        return (
          <div key={course.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, marginBottom: 16, overflow: 'hidden' }}>
            {/* Course header */}
            <button onClick={() => toggleCourse(course.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 12,
              padding: '16px 20px', background: bg, border: 'none', cursor: 'pointer', textAlign: 'left',
            }}>
              <TrendingUpIcon size={18} style={{ color, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.name}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
                  {course.totalScore.toLocaleString('nl-BE', { maximumFractionDigits: 2 })} / {course.totalMax} punten gescoord
                </p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color }}>{course.pct !== null ? `${course.pct}%` : '—'}</p>
              </div>
              {isOpen ? <ChevronDownIcon size={16} style={{ color: '#9ca3af', flexShrink: 0 }} /> : <ChevronRightIcon size={16} style={{ color: '#9ca3af', flexShrink: 0 }} />}
            </button>

            {/* Score bar */}
            {course.pct !== null && (
              <div style={{ height: 4, background: '#e5e7eb' }}>
                <div style={{ height: '100%', width: `${course.pct}%`, background: color, transition: 'width 0.5s ease' }} />
              </div>
            )}

            {/* Groups */}
            {isOpen && (
              <div style={{ padding: '16px 20px' }}>
                {course.groups.map(group => {
                  const key = `${course.id}-${group.name}`
                  return (
                    <GroupRow
                      key={key}
                      group={group}
                      open={openGroups[key] ?? false}
                      onToggle={() => toggleGroup(key)}
                    />
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
