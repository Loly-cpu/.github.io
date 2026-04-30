import { ReactNode } from 'react'
import AppLayout from '@/components/AppLayout'

export default function PlacementLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>
}
