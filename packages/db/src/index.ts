import { type SupabaseClient, createClient } from '@supabase/supabase-js'
import type { Database } from './types.js'

export type Kavra = SupabaseClient<Database>

export function createKavraClient(url: string, key: string): Kavra {
  return createClient<Database>(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  })
}

export function createServiceClient(url: string, serviceKey: string): Kavra {
  return createClient<Database>(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export type { Database } from './types.js'
