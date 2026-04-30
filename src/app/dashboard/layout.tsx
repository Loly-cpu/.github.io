import { ReactNode } from 'react'
import PlatformNav from '@/components/PlatformNav'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <PlatformNav />
      <div>{children}</div>
    </div>
  )
}
