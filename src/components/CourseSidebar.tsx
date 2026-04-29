'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AVAILABLE_LEVELS, LEVEL_LABELS, LANGUAGE_LABELS, LANGUAGE_FLAGS } from '@/lib/content'
import type { Language, Level, LevelContent, TopicProgress } from '@/lib/types'

interface Props {
  language: Language
  currentLevel: Level
  currentTopicId?: string
  progress: TopicProgress[]
  levelContent: Partial<Record<Level, LevelContent>>
}

export default function CourseSidebar({ language, currentLevel, currentTopicId, progress, levelContent }: Props) {
  const [openLevels, setOpenLevels] = useState<Set<Level>>(new Set([currentLevel]))
  const [mobileOpen, setMobileOpen] = useState(false)

  function toggleLevel(level: Level) {
    setOpenLevels((prev) => {
      const next = new Set(prev)
      next.has(level) ? next.delete(level) : next.add(level)
      return next
    })
  }

  function completedInLevel(level: Level, content: LevelContent) {
    return content.topics.filter((t) =>
      progress.some((p) => p.language === language && p.level === level && p.topic_id === t.id && p.completed)
    ).length
  }

  const sidebar = (
    <nav className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-4 border-b border-warm-gray">
        <Link href="/dashboard" className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary-600 transition-colors mb-3">
          ← Dashboard
        </Link>
        <h2 className="font-bold text-gray-900 text-base">
          {LANGUAGE_FLAGS[language]} {LANGUAGE_LABELS[language]}
        </h2>
      </div>

      <div className="flex-1 py-2">
        {AVAILABLE_LEVELS[language].map((level) => {
          const content = levelContent[level]
          const isOpen = openLevels.has(level)
          const isCurrent = level === currentLevel
          const done = content ? completedInLevel(level, content) : 0
          const total = content?.topics.length ?? 0

          return (
            <div key={level}>
              <button
                onClick={() => toggleLevel(level)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold transition-colors ${
                  isCurrent ? 'text-primary-700 bg-primary-50' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${isCurrent ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {level.toUpperCase().replace('BPLUS', 'B+')}
                  </span>
                  <span className="truncate">{LEVEL_LABELS[level].split(' — ')[1]}</span>
                </span>
                <span className="flex items-center gap-2 flex-shrink-0">
                  {total > 0 && (
                    <span className={`text-xs ${done === total ? 'text-green-600' : 'text-gray-400'}`}>
                      {done}/{total}
                    </span>
                  )}
                  <span className={`transition-transform text-gray-400 ${isOpen ? 'rotate-90' : ''}`}>›</span>
                </span>
              </button>

              {isOpen && content && (
                <div className="border-l-2 border-warm-gray ml-4 mb-1">
                  {content.topics.map((topic, i) => {
                    const prog = progress.find(
                      (p) => p.language === language && p.level === level && p.topic_id === topic.id
                    )
                    const isActive = topic.id === currentTopicId
                    const isCompleted = prog?.completed ?? false

                    return (
                      <Link
                        key={topic.id}
                        href={`/learn/${language}/${level}/${topic.id}`}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                          isActive
                            ? 'bg-primary-100 text-primary-800 font-semibold border-r-2 border-primary-500'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          isCompleted ? 'bg-green-100 text-green-700' :
                          isActive ? 'bg-primary-200 text-primary-800' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {isCompleted ? '✓' : i + 1}
                        </span>
                        <span className="truncate">{topic.title}</span>
                        {isActive && <span className="ml-auto text-primary-500 flex-shrink-0">›</span>}
                      </Link>
                    )
                  })}
                </div>
              )}

              {isOpen && !content && (
                <div className="px-4 py-2 text-xs text-gray-400 italic">Inhoud laden…</div>
              )}
            </div>
          )
        })}
      </div>
    </nav>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-warm-gray px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="w-9 h-9 rounded-lg border border-warm-gray flex items-center justify-center text-gray-600 hover:bg-gray-50"
          aria-label="Menu openen"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            {mobileOpen
              ? <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              : <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            }
          </svg>
        </button>
        <span className="font-semibold text-gray-800 text-sm">
          {LANGUAGE_FLAGS[language]} {LANGUAGE_LABELS[language]}
        </span>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={`md:hidden fixed top-0 left-0 bottom-0 z-40 w-72 bg-white shadow-xl transition-transform duration-200 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="pt-14">{sidebar}</div>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 flex-shrink-0 bg-white border-r border-warm-gray min-h-screen sticky top-0">
        {sidebar}
      </aside>
    </>
  )
}
