'use client'

import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function GeblokkeerddPage() {
  const router = useRouter()

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/auth/login')
  }

  return (
    <main className="min-h-screen bg-[#f4f4f4] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-xl shadow-sm border border-[#e8e8e8] p-8">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-[#242424] mb-2">Account geblokkeerd</h2>
          <p className="text-[#5b5b5b] text-sm mb-6">
            Je account is geblokkeerd door een beheerder.<br />
            Neem contact op met je school voor meer informatie.
          </p>
          <button
            onClick={logout}
            className="w-full py-2 rounded-lg text-white text-sm font-medium"
            style={{ background: '#ff520e' }}
          >
            Afmelden
          </button>
        </div>
      </div>
    </main>
  )
}
