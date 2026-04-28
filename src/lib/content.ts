import type { Language, Level, LevelContent, Topic } from './types'

const contentCache: Partial<Record<string, LevelContent>> = {}

export async function getLevelContent(language: Language, level: Level): Promise<LevelContent | null> {
  const key = `${language}-${level}`
  if (contentCache[key]) return contentCache[key]!

  try {
    const mod = await import(`@/data/${language}/${level}.json`)
    contentCache[key] = mod.default as LevelContent
    return contentCache[key]!
  } catch {
    return null
  }
}

export async function getTopic(language: Language, level: Level, topicId: string): Promise<Topic | null> {
  const content = await getLevelContent(language, level)
  return content?.topics.find((t) => t.id === topicId) ?? null
}

export const LEVEL_LABELS: Record<Level, string> = {
  a0: 'A0 — Absolute beginner',
  a1: 'A1 — Beginner',
  a2: 'A2 — Elementair',
  b1: 'B1 — Drempelgebruiker',
  b2: 'B2 — Zelfstandig gebruiker',
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  fr: 'Frans',
  en: 'Engels',
}

export const LANGUAGE_FLAGS: Record<Language, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
}

export const AVAILABLE_LEVELS: Record<Language, Level[]> = {
  fr: ['a0', 'a1'],
  en: ['a1'],
}
