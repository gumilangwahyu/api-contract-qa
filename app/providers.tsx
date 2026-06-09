'use client'

import { SessionProvider } from 'next-auth/react'
import { GlobalUIProvider } from '../components/GlobalUIProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GlobalUIProvider>
        {children}
      </GlobalUIProvider>
    </SessionProvider>
  )
}