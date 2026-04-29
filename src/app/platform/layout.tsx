import { ReactNode } from 'react'
import PlatformNav from '@/components/PlatformNav'

export const metadata = { title: 'Leerplatform' }

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-cream">
      <PlatformNav />
      <main className="flex-1 min-w-0 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
