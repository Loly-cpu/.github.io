'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface NavigationProps {
  backHref?: string
  backLabel?: string
  title?: string
}

export default function Navigation({ backHref, backLabel, title }: NavigationProps) {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  return (
    <nav className="bg-white border-b border-warm-gray px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link href={backHref} className="btn-ghost text-sm px-3 py-1.5">
              ← {backLabel ?? 'Terug'}
            </Link>
          )}
          {title && <span className="font-semibold text-gray-700 text-base">{title}</span>}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/examenboard" className="btn-ghost text-sm">
            🎓 Examenboard
          </Link>
          <Link href="/dashboard" className="btn-ghost text-sm">
            Taalplatform
          </Link>
          <button onClick={handleLogout} className="btn-ghost text-sm text-gray-400">
            Uitloggen
          </button>
        </div>
      </div>
    </nav>
  )
}
