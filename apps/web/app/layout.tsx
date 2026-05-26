import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'sonner'
import { QueryProvider } from '../lib/query-provider'

export const metadata: Metadata = {
  title: 'Kavra — Kavra. Her şeyi.',
  description: 'PDF, video, podcast özeti — AI sohbet, flashcard, sınav. Türkçe doğan AI defter.',
  openGraph: {
    title: 'Kavra',
    description: '150 teknik. Tek hoca. Tamamen sen.',
    locale: 'tr_TR',
    type: 'website',
    images: [{ url: 'https://kavra.app/og.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kavra',
    description: '150 teknik. Tek hoca. Tamamen sen.',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="antialiased">
        <QueryProvider>
          {children}
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  )
}
