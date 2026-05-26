import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kavra — Kavra. Her şeyi.',
  description:
    "150 pedagojik tekniği tek uygulamada birleştiren, Türkçe konuşan kişisel öğrenme AI'ı. Sesli, görsel, çok dilli.",
  openGraph: {
    title: 'Kavra',
    description: '150 teknik. Tek hoca. Tamamen sen.',
    locale: 'tr_TR',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  )
}
