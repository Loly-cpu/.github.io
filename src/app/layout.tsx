import type { Metadata } from 'next'
import './globals.css'
import { GlobalWidgets } from '@/components/GlobalWidgets'

export const metadata: Metadata = {
  title: 'Schoolplatform',
  description: 'Jouw persoonlijk schoolplatform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body suppressHydrationWarning>
        {children}
        <GlobalWidgets />
      </body>
    </html>
  )
}
