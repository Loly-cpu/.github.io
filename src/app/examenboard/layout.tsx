import { ReactNode } from 'react'
import AppLayout from '@/components/AppLayout'

export const metadata = { title: 'Examenboard' }

export default function ExamenboardLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
