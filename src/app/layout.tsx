import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Taalplatform — Frans & Engels',
  description: 'Leer Frans en Engels stap voor stap, van A0 tot B2',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  )
}
