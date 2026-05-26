'use client'
import { createBrowserClient } from '@supabase/ssr'

let _client: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (_client) return _client
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  if (!url || !key) {
    // SSG prerender sırasında env yoksa stub döndür — runtime'da düzgün init olur
    return new Proxy({} as ReturnType<typeof createBrowserClient>, {
      get() {
        throw new Error('Supabase client init: env değişkenleri runtime\'da yok')
      },
    })
  }
  _client = createBrowserClient(url, key)
  return _client
}
