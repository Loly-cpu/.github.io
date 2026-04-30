'use client'

import { ReactNode } from 'react'
import AppTopbar from './AppTopbar'
import AppSidebar from './AppSidebar'
import FeedbackButton from './FeedbackButton'
import SpotifyWidget from './SpotifyWidget'
import { DeleteConfirmProvider } from './DeleteConfirm'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <AppTopbar />
      <AppSidebar />
      <main className="app-content">
        {children}
      </main>
      <FeedbackButton />
      <SpotifyWidget />
      <DeleteConfirmProvider />
    </div>
  )
}
