// Bu dosya `pnpm db:types` komutuyla otomatik üretilecek.
// Supabase migration'ları push edildikten sonra komutu çalıştır.
// Geçici placeholder:

export type Json = string | number | boolean | null | { [k: string]: Json | undefined } | Json[]

// Placeholder rows kullanır, geleneksel `unknown` yerine `any`:
// gerçek tip üretilene kadar çağrı tarafında sürekli cast yapmaya gerek kalmaz.
type GenericRow = Record<string, any>
type GenericRelationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}
type GenericTable = {
  Row: GenericRow
  Insert: GenericRow
  Update: GenericRow
  Relationships: GenericRelationship[]
}
type GenericView = {
  Row: GenericRow
  Relationships: GenericRelationship[]
}
type GenericFunction = {
  Args: GenericRow
  Returns: any
}

export interface Database {
  public: {
    Tables: { [key: string]: GenericTable }
    Views: { [key: string]: GenericView }
    Functions: { [key: string]: GenericFunction }
    Enums: { [key: string]: string }
    CompositeTypes: { [key: string]: GenericRow }
  }
}
