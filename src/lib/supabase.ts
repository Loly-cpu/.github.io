import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ─── Progress helpers ─────────────────────────────────────────────────────────

export async function getProgress(userId: string) {
  const { data, error } = await supabase
    .from('progress')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return data ?? []
}

export async function upsertProgress(params: {
  userId: string
  language: string
  level: string
  topicId: string
  completed: boolean
  score: number
  maxScore: number
}) {
  const { error } = await supabase.from('progress').upsert(
    {
      user_id: params.userId,
      language: params.language,
      level: params.level,
      topic_id: params.topicId,
      completed: params.completed,
      score: params.score,
      max_score: params.maxScore,
      last_seen: new Date().toISOString(),
    },
    { onConflict: 'user_id,language,level,topic_id' }
  )

  if (error) throw error
}
