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
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'AI gaf geen geldig plan terug' }, { status: 500 })

    const plan = JSON.parse(jsonMatch[0])
    return NextResponse.json(plan)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
