import { ReactNode } from 'react'
import AppLayout from '@/components/AppLayout'

export const metadata = { title: 'Schoolplatform' }

export default function PlatformLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
