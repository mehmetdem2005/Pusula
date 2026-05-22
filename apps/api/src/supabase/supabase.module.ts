import { Global, Module } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadEnv } from '../config/env.schema.js';

export const SUPABASE = Symbol('SUPABASE');

/**
 * Service-role Supabase client — yalnız server-side kullanılır.
 * RLS bypass eder; her sorguda user_id'yi `auth.uid()` yerine elle kontrol et.
 */
@Global()
@Module({
  providers: [
    {
      provide: SUPABASE,
      useFactory: (): SupabaseClient => {
        const env = loadEnv();
        return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { 'X-Client-Info': 'pusula-api' } },
        });
      },
    },
  ],
  exports: [SUPABASE],
})
export class SupabaseModule {}
