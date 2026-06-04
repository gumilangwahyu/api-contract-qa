import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'
import Navbar from '../components/Navbar'

export const metadata: Metadata = {
  title: 'API Contract & QA',
  description: 'Free API Contract Testing & QA Platform',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-primary text-white">
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  )
}