import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const LANG_NAMES: Record<string, string> = { fr: 'Frans', en: 'Engels' }
const LEVEL_NAMES: Record<string, string> = {
  a0: 'A0 (absolute beginner)',
  a1: 'A1 (beginner)',
  a2: 'A2 (elementair)',
  b1: 'B1 (drempelgebruiker)',
  b2: 'B2 (zelfstandig gebruiker)',
}

export async function POST(req: Request) {
  const { language, level, topicTitle, topicContext } = await req.json()

  const prompt = `Je bent een geduldige, warme taalleraar voor ${LANG_NAMES[language] ?? language} op niveau ${LEVEL_NAMES[level] ?? level}.

De leerling begrijpt het volgende onderwerp niet: "${topicTitle}"

Context over dit onderwerp:
${topicContext}

Geef een korte, heldere uitleg in het Nederlands. Gebruik:
- Korte zinnen (max 15 woorden per zin)
- Opsommingstekens (•) voor opsommingen
- 2-3 concrete voorbeelden met Nederlandse vertaling
- Geen vaktermen zonder uitleg
- Maximaal 200 woorden

Begin direct met de uitleg, geen inleiding.`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    const explanation = message.content[0].type === 'text' ? message.content[0].text : ''
    return NextResponse.json({ explanation })
  } catch {
    return NextResponse.json({ error: 'Kon uitleg niet laden' }, { status: 500 })
  }
}
