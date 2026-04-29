import { NextResponse } from 'next/server'

interface CalEvent {
  summary: string
  start: string
  end: string
  description?: string
  location?: string
  allDay: boolean
}

function parseDate(raw: string): { iso: string; allDay: boolean } {
  // Strip VALUE=DATE or TZID prefixes after the colon
  const val = raw.includes(':') ? raw.split(':').slice(1).join(':') : raw
  const clean = val.replace(/Z$/, '').trim()

  if (clean.length === 8) {
    // DATE only: YYYYMMDD
    return {
      iso: `${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}T00:00:00`,
      allDay: true,
    }
  }
  // DATETIME: YYYYMMDDTHHMMSS
  return {
    iso: `${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}T${clean.slice(9,11)}:${clean.slice(11,13)}:${clean.slice(13,15)}`,
    allDay: false,
  }
}

function parseICS(text: string): CalEvent[] {
  const events: CalEvent[] = []
  // Unfold long lines (RFC 5545: lines can be continued with CRLF + space/tab)
  const unfolded = text.replace(/\r?\n[ \t]/g, '')
  const blocks = unfolded.split(/BEGIN:VEVENT/i).slice(1)

  for (const block of blocks) {
    const lines = block.split(/\r?\n/)
    const props: Record<string, string> = {}

    for (const line of lines) {
      if (line.startsWith('END:VEVENT')) break
      const colonIdx = line.indexOf(':')
      if (colonIdx < 0) continue
      const key = line.slice(0, colonIdx).split(';')[0].trim().toUpperCase()
      const value = line.slice(colonIdx + 1).trim()
      props[key] = value
    }

    const summary = props['SUMMARY']
    const rawStart = props['DTSTART'] ?? props['DTSTART;VALUE=DATE']
    const rawEnd   = props['DTEND']   ?? props['DTEND;VALUE=DATE']

    if (!summary || !rawStart) continue

    const startParsed = parseDate(rawStart)
    const endParsed   = rawEnd ? parseDate(rawEnd) : startParsed

    events.push({
      summary,
      start: startParsed.iso,
      end: endParsed.iso,
      allDay: startParsed.allDay,
      description: props['DESCRIPTION'],
      location: props['LOCATION'],
    })
  }

  return events
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const url = searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url parameter vereist' }, { status: 400 })

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ExamenBoard/1.0 (iCal import)' },
      next: { revalidate: 300 },
    })
    if (!res.ok) throw new Error(`Kon kalender niet ophalen: HTTP ${res.status}`)
    const text = await res.text()
    const events = parseICS(text)
    return NextResponse.json({ events, count: events.length })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
