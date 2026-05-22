'use client';

import { useEffect, type ReactElement, type ReactNode } from 'react';

/**
 * PostHog provider — lazy init (NEXT_PUBLIC_POSTHOG_KEY varsa).
 * Paket yüklü değilse hiçbir şey yapmaz.
 */
export function PostHogProvider({ children }: { children: ReactNode }): ReactElement {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';
    if (!key) return;
    void (async () => {
      try {
        const posthog = await import('posthog-js').catch(() => null);
        if (!posthog) return;
        posthog.default.init(key, {
          api_host: host,
          person_profiles: 'identified_only',
          capture_pageview: true,
          autocapture: false, // Pusula event taxonomy elle yönetilecek
        });
      } catch {
        // ignore
      }
    })();
  }, []);

  return <>{children}</>;
}
