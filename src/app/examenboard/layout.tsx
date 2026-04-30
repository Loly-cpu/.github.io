import { ReactNode } from 'react'
import PlatformNav from '@/components/PlatformNav'

export default function ExamenboardLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f4' }}>
      <PlatformNav />
      <div>{children}</div>
    </div>
  )
}
