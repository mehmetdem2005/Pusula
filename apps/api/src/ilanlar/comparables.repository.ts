import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { KonutInput } from '@pusula/shared';
import { COMPARABLE_CONFIG } from '@pusula/shared';
import type { KomparableIlan } from '@pusula/scoring/dist/price-advantage.js';
import { SUPABASE } from '../supabase/supabase.module.js';

/**
 * Comparable set repository — bir konut ilanı için benzer aktif ilanları döner.
 *
 * Kurallar:
 *  - aynı il + ilçe + (varsa mahalle)
 *  - aynı oda_sayisi
 *  - ±%20 m²
 *  - ±5 yıl bina_yasi
 *  - son 90 gün
 *  - status = 'aktif'
 *  - kendini hariç tut
 */
@Injectable()
export class ComparablesRepository {
  constructor(@Inject(SUPABASE) private readonly sb: SupabaseClient) {}

  async forKonut(input: KonutInput): Promise<KomparableIlan[]> {
    const m2 = input.net_m2;
    const m2Lo = Math.floor(m2 * (1 - COMPARABLE_CONFIG.m2_tolerance));
    const m2Hi = Math.ceil(m2 * (1 + COMPARABLE_CONFIG.m2_tolerance));
    const yasLo = Math.max(0, input.bina_yasi - COMPARABLE_CONFIG.yas_tolerance_yil);
    const yasHi = input.bina_yasi + COMPARABLE_CONFIG.yas_tolerance_yil;
    const sinceIso = new Date(
      Date.now() - COMPARABLE_CONFIG.zaman_penceresi_gun * 86_400_000,
    ).toISOString();

    let query = this.sb
      .from('ilanlar')
      .select('id, net_m2, fiyat_tl, bina_yasi, oda_sayisi, mahalle, ilce')
      .eq('kategori', 'konut')
      .eq('status', 'aktif')
      .eq('il', input.il)
      .eq('ilce', input.ilce)
      .eq('oda_sayisi', input.oda_sayisi)
      .gte('net_m2', m2Lo)
      .lte('net_m2', m2Hi)
      .gte('bina_yasi', yasLo)
      .lte('bina_yasi', yasHi)
      .gte('parse_tarihi', sinceIso)
      .limit(50);

    if (input.mahalle) {
      query = query.eq('mahalle', input.mahalle);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? [])
      .filter((r) => r.net_m2 != null && r.fiyat_tl != null)
      .map((r) => ({
        id: r.id as string,
        m2: r.net_m2 as number,
        fiyat_tl: r.fiyat_tl as number,
        bina_yasi: (r.bina_yasi as number) ?? 0,
        oda_sayisi: r.oda_sayisi as string,
        mahalle: (r.mahalle as string | null) ?? undefined,
        ilce: r.ilce as string,
      }));
  }
}
