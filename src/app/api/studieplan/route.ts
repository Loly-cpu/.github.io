import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface ExamEntry  { subject: string; date: string; start: string }
interface BusySlot   { date: string; start: string; end: string; reason?: string }
interface RequestBody { exams: ExamEntry[]; busy: BusySlot[]; preferences?: string }

export async function POST(req: Request) {
  try {
    const body: RequestBody = await req.json()
    const { exams, busy, preferences } = body

    if (!exams?.length) return NextResponse.json({ error: 'Geen examens opgegeven' }, { status: 400 })

    const prompt = `Je bent een studiecoach. Maak een realistisch studieplan op basis van deze gegevens.

EXAMENS:
${exams.map(e => `- ${e.subject}: ${e.date} om ${e.start}`).join('\n')}

BEZETTE TIJDEN (kan niet studeren):
${busy.length ? busy.map(b => `- ${b.date} ${b.start}–${b.end}${b.reason ? ` (${b.reason})` : ''}`).join('\n') : '- Geen opgegeven'}

VOORKEUREN:
${preferences || 'Geen specifieke voorkeuren'}

Maak een studieplan in JSON-formaat met deze structuur:
{
  "plan": [
    {
      "date": "YYYY-MM-DD",
      "sessions": [
        {
          "subject": "Vaknam",
          "start": "HH:MM",
          "end": "HH:MM",
          "topic": "Wat te studeren",
          "priority": "hoog|medium|laag",
          "type": "studie|herhaling|proefexamen|rust"
        }
      ]
    }
  ],
  "tips": ["tip1", "tip2"],
  "warning": "Optionele waarschuwing als plan krap is"
}

Regels:
- Plan max 6 uur studie per dag (max 3 sessies van elk 1.5-2 uur)
- Pomodoro-principe: blokken van 25 min + pauze
- De dag voor een examen: max 1 uur lichte herhaling, GEEN nieuwe stof
- Bouw herhaling in: elke topic minstens 3 keer bekijken
- Vroeg beginnen met het eerste examen
- Geef alleen JSON terug, geen uitleg ervoor of erna`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON — find the outermost { ... } block
    const start = raw.indexOf('{')
    const end   = raw.lastIndexOf('}')
    if (start === -1 || end === -1) {
      return NextResponse.json({ error: 'AI gaf geen geldig plan terug' }, { status: 500 })
    }

    let jsonStr = raw.slice(start, end + 1)

    // If truncated (max_tokens hit), try to repair by closing open arrays/objects
    try {
      JSON.parse(jsonStr)
    } catch {
      // Count unclosed brackets and close them
      let opens = 0
      let closeChar = ''
      const stack: string[] = []
      for (const ch of jsonStr) {
        if (ch === '{') stack.push('}')
        else if (ch === '[') stack.push(']')
        else if (ch === '}' || ch === ']') stack.pop()
      }
      // Remove trailing incomplete item (ends with comma or partial string)
      jsonStr = jsonStr.replace(/,\s*$/, '').replace(/,\s*[^,{[\]}"]*$/, '')
      jsonStr += stack.reverse().join('')
    }

    const plan = JSON.parse(jsonStr)
    return NextResponse.json(plan)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
