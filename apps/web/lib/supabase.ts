import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client. Sadece anon key, RLS aktif.
 * Server-side için ayrı bir factory gerek (V1'de eklenecek).
 *
 * NOT: @supabase/ssr paketi yüklü olmadığında dinamik fallback yapmadık — bu
 * dosya zaten apps/web bundle'ında ve dependency package.json'da listelenmeli.
 */
export function getSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  );
}
