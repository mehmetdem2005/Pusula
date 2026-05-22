import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { KonutInput } from '@pusula/shared';
import { ScoringService } from '../scoring/scoring.service.js';
import { SUPABASE } from '../supabase/supabase.module.js';

interface ListBatchItem {
  url: string;
  baslik: string;
  fiyat: string;
}

@Injectable()
export class IlanlarService {
  private readonly logger = new Logger(IlanlarService.name);

  constructor(
    private readonly scoring: ScoringService,
    @Inject(SUPABASE) private readonly sb: SupabaseClient,
  ) {}

  /**
   * Bir konut ilanını ingest eder, skorlar ve persist eder.
   *
   * - UPSERT (kaynak, kaynak_id) → idempotent
   * - Skor sonucu `scoring_results` tablosuna yazılır
   * - ID'ler `crypto.randomUUID` (Math.random DEĞİL)
   */
  async ingestKonut(userId: string, input: KonutInput): Promise<{ id: string; score_id: string }> {
    // 1. Comparable set — V0.2'de ComparablesRepository
    const score = await this.scoring.scoreKonut(input, {
      comparables: [],
      konum: {},
      risk: {},
    });

    // 2. UPSERT ilan
    const ilanId = randomUUID();
    const ilanRow = {
      id: ilanId,
      owner_user_id: userId,
      kategori: 'konut' as const,
      kaynak: input.kaynak,
      kaynak_id: input.kaynak_id,
      ilan_url: input.ilan_url,
      baslik: input.baslik,
      aciklama: input.aciklama,
      fiyat_tl: input.fiyat_tl,
      il: input.il,
      ilce: input.ilce,
      mahalle: input.mahalle,
      net_m2: input.net_m2,
      brut_m2: input.brut_m2,
      oda_sayisi: input.oda_sayisi,
      bina_yasi: input.bina_yasi,
      bulundugu_kat:
        typeof input.bulundugu_kat === 'number'
          ? String(input.bulundugu_kat)
          : (input.bulundugu_kat ?? null),
      ozellikler: {
        isitma: input.isitma,
        asansor: input.asansor,
        otopark: input.otopark,
        site_icinde: input.site_icinde,
        balkon: input.balkon,
        esyali: input.esyali,
        krediye_uygun: input.krediye_uygun,
        tapu_durumu: input.tapu_durumu,
      },
      foto_urlleri: input.foto_urlleri,
      parse_versiyonu: input.parse_versiyonu,
      parse_tarihi: input.parse_tarihi,
      ilan_tarihi: input.ilan_tarihi,
    };

    const { data: upserted, error: ilanErr } = await this.sb
      .from('ilanlar')
      .upsert(ilanRow, { onConflict: 'kaynak,kaynak_id' })
      .select('id')
      .single();
    if (ilanErr) {
      this.logger.error(`ilan upsert failed: ${ilanErr.message}`);
      throw ilanErr;
    }
    const persistedIlanId = upserted.id as string;

    // 3. Skor sonucu insert
    const scoreId = randomUUID();
    const { error: scoreErr } = await this.sb.from('scoring_results').insert({
      id: scoreId,
      ilan_id: persistedIlanId,
      formul_versiyonu: score.formul_versiyonu,
      toplam: score.toplam,
      etiket: score.etiket,
      bilesenler: score.bilesenler,
      alt_bilesenler: score.alt_bilesenler,
      comparable: score.comparable,
      confidence: score.confidence,
      uyarilar: score.uyarilar,
      hesap_zamani: score.hesap_zamani,
    });
    if (scoreErr) {
      this.logger.error(`scoring_results insert failed: ${scoreErr.message}`);
      throw scoreErr;
    }

    return { id: persistedIlanId, score_id: scoreId };
  }

  /**
   * Liste batch — URL'leri queue'ya at (V1: hemen ack, ingest sonra).
   * Şimdilik sadece sayım döner; BullMQ job ileride.
   */
  async acceptListBatch(userId: string, batch: ListBatchItem[]): Promise<{ accepted: number }> {
    this.logger.debug(`list-batch from ${userId}: ${batch.length} items`);
    // TODO: BullMQ queue.add('list-batch-ingest', { userId, batch })
    return { accepted: batch.length };
  }
}
