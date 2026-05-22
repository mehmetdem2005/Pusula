import type { NextConfig } from 'next';

const isProd = process.env.NODE_ENV === 'production';

/**
 * CSP — sıkı ama gerçekçi.
 * - script-src: 'self' + analytics (PostHog). 'unsafe-inline' Tailwind / Next.js için gerekli.
 *   'strict-dynamic' production'da hash-based ile değiştirilebilir.
 * - connect-src: Supabase, API, PostHog.
 * - frame-ancestors 'none' — clickjacking koruması.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://app.posthog.com https://*.sentry.io",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.sahibinden.com https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://api.pusula.tr https://app.posthog.com https://*.sentry.io wss://*.supabase.co",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  isProd ? 'upgrade-insecure-requests' : '',
]
  .filter(Boolean)
  .join('; ');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@pusula/shared', '@pusula/scoring', '@pusula/llm-gateway', '@pusula/agents'],
  experimental: {
    optimizePackageImports: ['@pusula/shared', 'lucide-react'],
  },
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
