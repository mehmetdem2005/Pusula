import { z } from 'zod';

export const CreateListSchema = z.object({ name: z.string().trim().min(1).max(80) });
export type CreateListInput = z.infer<typeof CreateListSchema>;

export const RenameListSchema = z.object({ name: z.string().trim().min(1).max(80) });
export type RenameListInput = z.infer<typeof RenameListSchema>;

export const AddItemSchema = z.object({ ilan_id: z.string().uuid() });
export type AddItemInput = z.infer<typeof AddItemSchema>;

/** Liste detayı filtreleri (query string → tipli). Tümü opsiyonel. */
export interface ListFilters {
  il?: string;
  ilce?: string;
  mahalle?: string;
  fiyatMin?: number;
  fiyatMax?: number;
  m2Min?: number;
  m2Max?: number;
  yasMin?: number;
  yasMax?: number;
  skorMin?: number;
  skorMax?: number;
  oda?: string[];
  band?: string[];
  kaynak?: string[];
  sort?: 'skor_desc' | 'skor_asc' | 'fiyat_asc' | 'fiyat_desc' | 'yeni' | 'm2_desc';
}

const num = (v: unknown): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const csv = (v: unknown): string[] | undefined => {
  if (typeof v !== 'string' || !v.trim()) return undefined;
  const arr = v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return arr.length ? arr : undefined;
};

const SORTS = ['skor_desc', 'skor_asc', 'fiyat_asc', 'fiyat_desc', 'yeni', 'm2_desc'] as const;

/** Express query (string'ler) → ListFilters. Bilinmeyen/boş alanlar atlanır. */
export function parseFilters(q: Record<string, unknown>): ListFilters {
  const f: ListFilters = {};
  if (typeof q.il === 'string' && q.il.trim()) f.il = q.il.trim();
  if (typeof q.ilce === 'string' && q.ilce.trim()) f.ilce = q.ilce.trim();
  if (typeof q.mahalle === 'string' && q.mahalle.trim()) f.mahalle = q.mahalle.trim();
  const fmin = num(q.fiyatMin);
  if (fmin !== undefined) f.fiyatMin = fmin;
  const fmax = num(q.fiyatMax);
  if (fmax !== undefined) f.fiyatMax = fmax;
  const mmin = num(q.m2Min);
  if (mmin !== undefined) f.m2Min = mmin;
  const mmax = num(q.m2Max);
  if (mmax !== undefined) f.m2Max = mmax;
  const ymin = num(q.yasMin);
  if (ymin !== undefined) f.yasMin = ymin;
  const ymax = num(q.yasMax);
  if (ymax !== undefined) f.yasMax = ymax;
  const smin = num(q.skorMin);
  if (smin !== undefined) f.skorMin = smin;
  const smax = num(q.skorMax);
  if (smax !== undefined) f.skorMax = smax;
  const oda = csv(q.oda);
  if (oda) f.oda = oda;
  const band = csv(q.band);
  if (band) f.band = band;
  const kaynak = csv(q.kaynak);
  if (kaynak) f.kaynak = kaynak;
  if (typeof q.sort === 'string' && (SORTS as readonly string[]).includes(q.sort)) {
    f.sort = q.sort as (typeof SORTS)[number];
  }
  return f;
}
