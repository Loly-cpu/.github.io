export type Language = 'fr' | 'en'
export type Level = 'a0' | 'a1' | 'a2' | 'b1' | 'bplus' | 'b2' | 'c1' | 'c2'

// ─── Content Types ───────────────────────────────────────────────────────────

export type TheoryBlock =
  | { type: 'text'; content: string }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'note'; content: string }
  | { type: 'example'; pairs: { left: string; right: string; note?: string }[] }

export type ExerciseType = 'multiple_choice' | 'fill_blank' | 'translation' | 'matching' | 'speaking' | 'dictation'

export interface MultipleChoiceExercise {
  id: string
  type: 'multiple_choice'
  question: string
  options: string[]
  correct: number
  explanation: string
}

export interface FillBlankExercise {
  id: string
  type: 'fill_blank'
  question: string
  blanks: string[]
  hint?: string
  explanation: string
}

export interface TranslationExercise {
  id: string
  type: 'translation'
  direction: 'nl_to_target' | 'target_to_nl'
  source: string
  accepted: string[]
  explanation: string
}

export interface MatchingExercise {
  id: string
  type: 'matching'
  instruction: string
  pairs: { left: string; right: string }[]
}

export interface SpeakingExercise {
  id: string
  type: 'speaking'
  instruction: string
  target: string
  hint?: string
  explanation: string
}

export interface DictationExercise {
  id: string
  type: 'dictation'
  audio_text: string
  accepted: string[]
  hint?: string
  explanation: string
}

export type Exercise =
  | MultipleChoiceExercise
  | FillBlankExercise
  | TranslationExercise
  | MatchingExercise
  | SpeakingExercise
  | DictationExercise

export interface Topic {
  id: string
  title: string
  description: string
  theory: TheoryBlock[]
  exercises: Exercise[]
}

export interface LevelContent {
  language: Language
  level: Level
  title: string
  description: string
  topics: Topic[]
}

// ─── Progress Types ───────────────────────────────────────────────────────────

export interface TopicProgress {
  id: string
  user_id: string
  language: Language
  level: Level
  topic_id: string
  completed: boolean
  score: number
  max_score: number
  last_seen: string
}

export interface UserProgress {
  [key: string]: TopicProgress // key = `${language}-${level}-${topicId}`
}
