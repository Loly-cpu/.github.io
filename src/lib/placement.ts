import type { Language, Level } from './types'

export interface PlacementQuestion {
  id: string
  level: Level
  question: string
  options: string[]
  correct: number
}

export interface PlacementResult {
  language: Language
  recommendedLevel: Level
  scores: Record<string, number>
  date: string
}

const TESTED_LEVELS: Level[] = ['a0', 'a1', 'a2', 'b1', 'b2']

export const PLACEMENT_QUESTIONS: Record<Language, PlacementQuestion[]> = {
  fr: [
    {
      id: 'fr-p-a0-1', level: 'a0',
      question: "Hoe zeg je 'tot ziens' in het Frans?",
      options: ["Bonjour", "Au revoir", "Bonsoir", "Merci"],
      correct: 1,
    },
    {
      id: 'fr-p-a0-2', level: 'a0',
      question: "Wat betekent 'quinze'?",
      options: ["12", "13", "14", "15"],
      correct: 3,
    },
    {
      id: 'fr-p-a1-1', level: 'a1',
      question: "Vul in: 'Tu ___ étudiant(e).' (zijn)",
      options: ["suis", "es", "est", "êtes"],
      correct: 1,
    },
    {
      id: 'fr-p-a1-2', level: 'a1',
      question: "Welk lidwoord hoort bij 'école' (vrouwelijk, begint met klinker)?",
      options: ["le école", "la école", "l'école", "un école"],
      correct: 2,
    },
    {
      id: 'fr-p-a2-1', level: 'a2',
      question: "Hoe zeg je 'Ik heb gegeten' (passé composé van manger)?",
      options: ["Je mangeais", "J'ai mangé", "Je mange", "J'avais mangé"],
      correct: 1,
    },
    {
      id: 'fr-p-a2-2', level: 'a2',
      question: "Quand j'étais enfant, je ___ (jouer) au football tous les jours.",
      options: ["ai joué", "jouais", "joue", "jouerai"],
      correct: 1,
    },
    {
      id: 'fr-p-b1-1', level: 'b1',
      question: "Welke zin is grammaticaal correct? (subjonctif)",
      options: [
        "Il faut que tu viens maintenant.",
        "Il faut que tu viennes maintenant.",
        "Il faut que tu vient maintenant.",
        "Il faut que tu venait maintenant.",
      ],
      correct: 1,
    },
    {
      id: 'fr-p-b1-2', level: 'b1',
      question: "Vul in: 'Si j'avais plus de temps, je ___ plus.' (lire — conditionnel)",
      options: ["lirai", "lis", "lisais", "lirais"],
      correct: 3,
    },
    {
      id: 'fr-p-b2-1', level: 'b2',
      question: "'La décision ___ prise sans hésitation.' (passief — voltooid verleden)",
      options: ["a été", "est été", "était été", "a"],
      correct: 0,
    },
    {
      id: 'fr-p-b2-2', level: 'b2',
      question: "Welke zin gebruikt de subjonctif correct na 'bien que'?",
      options: [
        "Bien qu'il est fatigué, il continue.",
        "Bien qu'il soit fatigué, il continue.",
        "Bien qu'il était fatigué, il continue.",
        "Bien qu'il serait fatigué, il continue.",
      ],
      correct: 1,
    },
  ],
  en: [
    {
      id: 'en-p-a0-1', level: 'a0',
      question: "Wat betekent 'Good morning'?",
      options: ["Goeienacht", "Goedemorgen", "Tot morgen", "Goeienavond"],
      correct: 1,
    },
    {
      id: 'en-p-a0-2', level: 'a0',
      question: "Hoe zeg je 'hond' in het Engels?",
      options: ["cat", "horse", "dog", "bird"],
      correct: 2,
    },
    {
      id: 'en-p-a1-1', level: 'a1',
      question: "Vul in: 'She ___ a doctor.'",
      options: ["am", "are", "is", "be"],
      correct: 2,
    },
    {
      id: 'en-p-a1-2', level: 'a1',
      question: "Welk lidwoord is correct? '___ umbrella'",
      options: ["a", "an", "the", "geen lidwoord"],
      correct: 1,
    },
    {
      id: 'en-p-a2-1', level: 'a2',
      question: "Hoe vertaal je: 'Ik was aan het lezen toen hij belde'?",
      options: [
        "I read when he called.",
        "I was reading when he called.",
        "I have read when he called.",
        "I had read when he called.",
      ],
      correct: 1,
    },
    {
      id: 'en-p-a2-2', level: 'a2',
      question: "Vul in: 'She ___ when I arrived.' (already / to go — verleden voltooid)",
      options: ["already went", "has already gone", "had already gone", "was already going"],
      correct: 2,
    },
    {
      id: 'en-p-b1-1', level: 'b1',
      question: "Vul in: 'I wish I ___ speak Spanish fluently.' (onvervulbare wens)",
      options: ["can", "could", "will", "would"],
      correct: 1,
    },
    {
      id: 'en-p-b1-2', level: 'b1',
      question: "Welke zin is correct? (present perfect ontkennend)",
      options: [
        "They haven't finished the report yet.",
        "They didn't finished the report yet.",
        "They don't finish the report yet.",
        "They hadn't finished the report yet.",
      ],
      correct: 0,
    },
    {
      id: 'en-p-b2-1', level: 'b2',
      question: "Welke zin gebruikt inversie na 'hardly' correct?",
      options: [
        "Hardly I had arrived when it started to rain.",
        "Hardly had I arrived when it started to rain.",
        "Hardly I arrived when it started to rain.",
        "Hardly arrived I when it started to rain.",
      ],
      correct: 1,
    },
    {
      id: 'en-p-b2-2', level: 'b2',
      question: "Welke zin gebruikt de passief correct?",
      options: [
        "The cake was eaten by the children.",
        "The cake was eat by the children.",
        "The cake is eaten by the children yesterday.",
        "The children were eaten the cake.",
      ],
      correct: 0,
    },
  ],
}

export function calculateRecommendedLevel(
  language: Language,
  answers: Record<string, number>
): { recommendedLevel: Level; scores: Record<string, number> } {
  const questions = PLACEMENT_QUESTIONS[language]
  const scores: Record<string, number> = {}

  for (const level of TESTED_LEVELS) {
    const levelQs = questions.filter((q) => q.level === level)
    scores[level] = levelQs.filter((q) => answers[q.id] === q.correct).length
  }

  // First level where score < 2 is the recommended level (not yet fully mastered)
  let recommendedLevel: Level = 'b2'
  for (const level of TESTED_LEVELS) {
    if (scores[level] < 2) {
      recommendedLevel = level
      break
    }
  }

  return { recommendedLevel, scores }
}

export function savePlacementResult(result: PlacementResult): void {
  try {
    localStorage.setItem(`placement-${result.language}`, JSON.stringify(result))
  } catch { /* localStorage not available (SSR) */ }
}

export function loadPlacementResult(language: Language): PlacementResult | null {
  try {
    const raw = localStorage.getItem(`placement-${language}`)
    return raw ? (JSON.parse(raw) as PlacementResult) : null
  } catch {
    return null
  }
}
