import { ReactNode } from 'react'
import AppLayout from '@/components/AppLayout'

export const metadata = { title: 'Taalplatform' }

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
