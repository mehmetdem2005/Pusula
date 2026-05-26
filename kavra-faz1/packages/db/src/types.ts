// Bu dosya `pnpm db:types` komutuyla otomatik üretilecek.
// Supabase migration'ları push edildikten sonra komutu çalıştır.
// Geçici placeholder:

export type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: Record<
      string,
      {
        Row: Record<string, unknown>
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    >
    Views: Record<string, { Row: Record<string, unknown> }>
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>
    Enums: Record<string, string>
  }
}
