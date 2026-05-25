import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode, ReactElement } from 'react';
import { Cormorant, Manrope, JetBrains_Mono } from 'next/font/google';
import { PostHogProvider } from '../lib/posthog';
import { ThemeProvider, THEME_INIT_SCRIPT } from '../components/ThemeProvider';

// Türkçe glifler için latin-ext şart. next/font fontları self-host eder (Google'a runtime bağlantı yok).
const cormorant = Cormorant({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});
const manrope = Manrope({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-manrope',
  display: 'swap',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-jetbrains',
  display: 'swap',
});

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
  themeColor: '#0A1736',
};

export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html
      lang="tr"
      className={`${cormorant.variable} ${manrope.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ThemeProvider>
          <PostHogProvider>{children}</PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
