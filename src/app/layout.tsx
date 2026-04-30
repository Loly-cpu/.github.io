import type { Metadata } from 'next'
import './globals.css'
import dynamic from 'next/dynamic'

// Dynamisch laden zodat SSR geen problemen geeft met AudioContext etc.
const PomodoroTimer = dynamic(() => import('@/components/PomodoroTimer'), { ssr: false })

export const metadata: Metadata = {
  title: 'Schoolplatform',
  description: 'Jouw persoonlijk schoolplatform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body suppressHydrationWarning>
        {children}
        <PomodoroTimer />
      </body>
    </html>
  )
}
