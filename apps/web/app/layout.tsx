import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode, ReactElement } from 'react';
import { PostHogProvider } from '../lib/posthog';

export const metadata: Metadata = {
  title: 'Pusula — Karar verirken kaybolma',
  description:
    'Türkiye için AI destekli emlak ve oto ilan analiz platformu. Deterministik kelepir skoru, mahalle bağlamı, AI asistan.',
  applicationName: 'Pusula',
  authors: [{ name: 'Pusula' }],
  keywords: ['emlak', 'kelepir', 'AI', 'analiz', 'konut', 'oto'],
  openGraph: {
    title: 'Pusula — Karar verirken kaybolma',
    description: 'Türkiye emlak ve oto ilanları için AI destekli kelepir analiz aracı.',
    type: 'website',
    locale: 'tr_TR',
    siteName: 'Pusula',
    url: 'https://app.pusula.tr',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pusula — Karar verirken kaybolma',
    description: 'Türkiye emlak ve oto ilanları için AI destekli kelepir analiz aracı.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F1F4B',
};

export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang="tr">
      <body>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  );
}
