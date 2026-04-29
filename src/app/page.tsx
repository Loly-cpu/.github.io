'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/platform')
      } else {
        router.replace('/auth/login')
      }
    })
  }, [router])

  return (
    <div className="min-h-screen bg-[#f4f4f4] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#ff520e] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
