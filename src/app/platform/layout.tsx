import { ReactNode } from 'react'
import PlatformNav from '@/components/PlatformNav'

export const metadata = { title: 'Leerplatform' }

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <div className="smsc-layout">
      <PlatformNav />
      <div className="smsc-content">
        {children}
      </div>
    </div>
  )
}
