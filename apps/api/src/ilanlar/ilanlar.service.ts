import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { KonutInput, IsitmaTipi, type ChatMessage } from '@pusula/shared';
import type { ScoringContext } from '@pusula/scoring';
import { ScoringService } from '../scoring/scoring.service.js';
import { SUPABASE } from '../supabase/supabase.module.js';
import { LLMService } from '../llm/llm.service.js';
import { buildRiskContext } from './risk-enrichment.js';

interface ListBatchItem {
  url: string;
  baslik: string;
  fiyat: string;
}

type Comparable = ScoringContext['comparables'][number];

@Injectable()
export class IlanlarService {
  private readonly logger = new Logger(IlanlarService.name);

  constructor(
    private readonly scoring: ScoringService,
    @Inject(SUPABASE) private readonly sb: SupabaseClient,
    private readonly llm: LLMService,
  ) {}

  /**
   * Bir konut ilanını ingest eder, skorlar ve persist eder.
   *
   * - UPSERT (kaynak, kaynak_id) → idempotent
   * - Skor sonucu `scoring_results` tablosuna yazılır
   * - ID'ler `crypto.randomUUID` (Math.random DEĞİL)
   */
  async ingestKonut(userId: string, input: KonutInput): Promise<{ id: string; score_id: string }> {
    // 1. Comparable set — DB'den benzer ilanlar (aynı ilçe, ±%20 m², ±5 yaş, 90 gün)
    const comparables = await this.findComparables(input);
    const score = await this.scoring.scoreKonut(input, {
      comparables,
      konum: {},
      risk: buildRiskContext(input),
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
      .upsert(ilanRow, { onConflict: 'owner_user_id,kaynak,kaynak_id' })
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
      uyarilar: [...score.uyarilar, ...this.suspicionWarnings(input)],
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

  /**
   * Serbest metin/URL → LLM ile KonutInput çıkar → ingest + skor.
   * Metin client'tan (eklenti veya "yapıştır") gelir; sunucu hiçbir siteye istek ATMAZ → IP ban yok.
   * Her kaynağı (sahibinden, Facebook, vb.) kapsar; per-site parser gerektirmez.
   */
  async extractAndIngest(
    userId: string,
    body: {
      raw_text?: string | undefined;
      url?: string | undefined;
      kaynak?: string | undefined;
      screenshot_base64?: string | undefined;
    },
  ): Promise<{ id: string; score_id: string }> {
    const text = (body.raw_text ?? '').slice(0, 16_000);
    const instruction =
      'Bir emlak ilanından konut bilgilerini çıkar ve SADECE geçerli JSON döndür ' +
      '(bulunmayan alan null). Anahtarlar: baslik, fiyat_tl (sayı, TL), il, ilce, mahalle, ' +
      'net_m2 (sayı), brut_m2 (sayı), oda_sayisi ("2+1" veya "stüdyo"), bina_yasi (sayı, yıl), ' +
      `banyo_sayisi (sayı), isitma (${IsitmaTipi.options.join('|')}), asansor (bool), balkon (bool), ` +
      'esyali (bool), krediye_uygun (evet|kismen|hayir|bilinmiyor), aciklama.';

    // Görüntü varsa vision-LLM (tam-sayfa ekran görüntüsünden oku); yoksa metin tabanlı.
    const taskType = body.screenshot_base64 ? ('vision' as const) : ('score-explanation' as const);
    const messages: ChatMessage[] = body.screenshot_base64
      ? [
          {
            role: 'system',
            content:
              'Sen bir emlak ilanı veri çıkarıcısısın. Görseldeki ilan sayfasını oku. Yalnızca JSON döndür.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  instruction +
                  (text ? `\n\nEK METİN:\n${text}` : '') +
                  (body.url ? `\n\nURL: ${body.url}` : ''),
              },
              { type: 'image', image_base64: body.screenshot_base64 },
            ],
          },
        ]
      : [
          {
            role: 'system',
            content:
              'Sen bir emlak ilanı veri çıkarıcısısın. Yalnızca JSON döndür, açıklama yazma.',
          },
          {
            role: 'user',
            content: instruction + '\n\nMETİN:\n' + text + (body.url ? `\n\nURL: ${body.url}` : ''),
          },
        ];

    const resp = await this.llm.chat(userId, messages, { taskType, stream: false }, {});
    const parsed = this.parseJsonLoose(resp.text);

    const fiyat = Math.round(Number(parsed.fiyat_tl));
    const net = Math.round(Number(parsed.net_m2));
    if (!Number.isFinite(fiyat) || fiyat <= 0 || !Number.isFinite(net) || net <= 0) {
      throw new BadRequestException('İlandan fiyat veya m² çıkarılamadı; metni kontrol edin.');
    }

    const kaynak =
      (['sahibinden', 'hepsiemlak', 'emlakjet', 'zingat', 'manuel'] as const).find(
        (k) => k === body.kaynak,
      ) ?? 'manuel';
    const kaynakId = createHash('sha1')
      .update(body.url || text || body.screenshot_base64 || randomUUID())
      .digest('hex')
      .slice(0, 24);
    const ilanUrl =
      body.url && /^https?:\/\//.test(body.url)
        ? body.url
        : `https://pusula.app/manuel/${kaynakId}`;
    const odaRaw = String(parsed.oda_sayisi ?? '');
    const oda = /^\d+\+\d+$|^stüdyo$/.test(odaRaw) ? odaRaw : '1+1';
    const isitma = (IsitmaTipi.options as readonly string[]).includes(String(parsed.isitma))
      ? (parsed.isitma as IsitmaTipi)
      : 'bilinmiyor';
    const baslikRaw = String(parsed.baslik ?? '').trim();
    const baslik = baslikRaw.length >= 5 ? baslikRaw.slice(0, 200) : 'Yapıştırılan ilan';
    const binaYasiNum = Number(parsed.bina_yasi);
    const binaYasi = Number.isFinite(binaYasiNum)
      ? Math.max(0, Math.min(200, Math.round(binaYasiNum)))
      : 0;
    const brutNum = Number(parsed.brut_m2);
    const banyoNum = Number(parsed.banyo_sayisi);

    const built = {
      kaynak,
      kaynak_id: kaynakId,
      ilan_url: ilanUrl,
      baslik,
      fiyat_tl: fiyat,
      il: String(parsed.il ?? '').trim() || 'Bilinmiyor',
      ilce: String(parsed.ilce ?? '').trim() || 'Bilinmiyor',
      mahalle: parsed.mahalle ? String(parsed.mahalle) : undefined,
      net_m2: net,
      brut_m2: Number.isFinite(brutNum) && brutNum > 0 ? Math.round(brutNum) : undefined,
      oda_sayisi: oda,
      bina_yasi: binaYasi,
      banyo_sayisi: Number.isFinite(banyoNum)
        ? Math.max(0, Math.min(10, Math.round(banyoNum)))
        : undefined,
      isitma,
      asansor: typeof parsed.asansor === 'boolean' ? parsed.asansor : undefined,
      balkon: typeof parsed.balkon === 'boolean' ? parsed.balkon : undefined,
      esyali: typeof parsed.esyali === 'boolean' ? parsed.esyali : undefined,
      aciklama: parsed.aciklama ? String(parsed.aciklama).slice(0, 4000) : undefined,
      foto_urlleri: [],
      parse_versiyonu: 'llm-extract-v1',
      parse_tarihi: new Date().toISOString(),
    };

    const konut = KonutInput.parse(built);
    return this.ingestKonut(userId, konut);
  }

  private parseJsonLoose(text: string): Record<string, unknown> {
    const cleaned = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end < start) {
      throw new BadRequestException('İlan verisi çıkarılamadı (JSON bulunamadı).');
    }
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      throw new BadRequestException('İlan verisi çözümlenemedi.');
    }
  }

  /**
   * Skorlama için comparable seti: aynı ilçe + ±%20 net m² + ±5 bina yaşı + son 90 gün + aktif.
   * Kendi kaydını (kaynak_id) hariç tutar. ilçe yoksa boş döner (skor düşük confidence).
   */
  private async findComparables(input: KonutInput): Promise<Comparable[]> {
    if (!input.ilce || !input.net_m2) return [];
    const m2Lo = Math.floor(input.net_m2 * 0.8);
    const m2Hi = Math.ceil(input.net_m2 * 1.2);
    const since = new Date(Date.now() - 90 * 86_400_000).toISOString();

    let q = this.sb
      .from('ilanlar')
      .select('id, net_m2, fiyat_tl, bina_yasi, oda_sayisi, mahalle, ilce')
      .eq('kategori', 'konut')
      .eq('status', 'aktif')
      .eq('ilce', input.ilce)
      .gte('net_m2', m2Lo)
      .lte('net_m2', m2Hi)
      .gte('created_at', since)
      .neq('kaynak_id', input.kaynak_id)
      .limit(80);
    if (typeof input.bina_yasi === 'number') {
      q = q.gte('bina_yasi', input.bina_yasi - 5).lte('bina_yasi', input.bina_yasi + 5);
    }

    const { data, error } = await q;
    if (error) {
      this.logger.warn(`comparables query failed: ${error.message}`);
      return [];
    }
    return (data ?? [])
      .filter((r) => typeof r.net_m2 === 'number' && typeof r.fiyat_tl === 'number' && r.net_m2 > 0)
      .map((r) => ({
        id: r.id as string,
        m2: r.net_m2 as number,
        fiyat_tl: r.fiyat_tl as number,
        bina_yasi: (r.bina_yasi as number | null) ?? 0,
        oda_sayisi: (r.oda_sayisi as string | null) ?? '',
        ...(r.mahalle ? { mahalle: r.mahalle as string } : {}),
        ilce: (r.ilce as string | null) ?? input.ilce ?? '',
      }));
  }

  /**
   * İlan metni/medyasından şüphe/dolandırıcılık sinyalleri → kullanıcı uyarıları.
   * Skor matematiğini değiştirmez (ileride engine'e suspicion çarpanı eklenebilir).
   */
  private suspicionWarnings(input: KonutInput): string[] {
    const w: string[] = [];
    const fotoCount = input.foto_urlleri?.length ?? 0;
    if (fotoCount < 3) w.push('⚠️ Az fotoğraf (3’ten az) — ilanı dikkatle inceleyin.');
    if (/\bacil|acele|kelepir|fırsat\b/i.test(input.baslik)) {
      w.push('⚠️ Başlıkta aciliyet/“kelepir” vurgusu — fiyat doğrulamasını mutlaka yapın.');
    }
    if ((input.aciklama?.trim().length ?? 0) < 50) {
      w.push('⚠️ Çok kısa/eksik açıklama — bilgi yetersiz olabilir.');
    }
    if (!input.bulundugu_kat) {
      w.push('ℹ️ Kat bilgisi belirtilmemiş.');
    }
    return w;
  }

  /** Kullanıcının ilanları + her birinin son skoru (dashboard listesi). */
  async listIlanlar(userId: string): Promise<unknown[]> {
    const { data, error } = await this.sb
      .from('ilanlar')
      .select(
        'id, baslik, ilan_url, fiyat_tl, il, ilce, mahalle, net_m2, oda_sayisi, foto_urlleri, created_at, scoring_results(toplam, etiket, confidence, hesap_zamani)',
      )
      .eq('owner_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      this.logger.error(`listIlanlar failed: ${error.message}`);
      throw error;
    }
    return (data ?? []).map((row) => {
      const scores = (row.scoring_results ?? []) as {
        toplam: number;
        etiket: string;
        confidence: string;
        hesap_zamani: string;
      }[];
      const latest = scores.sort((a, b) => b.hesap_zamani.localeCompare(a.hesap_zamani))[0] ?? null;
      return { ...row, skor: latest };
    });
  }

  /** Tek ilan + son skor detayı (ilan detay sayfası). */
  async getIlan(userId: string, id: string): Promise<unknown> {
    const { data, error } = await this.sb
      .from('ilanlar')
      .select('*, scoring_results(*)')
      .eq('id', id)
      .eq('owner_user_id', userId)
      .maybeSingle();
    if (error) {
      this.logger.error(`getIlan failed: ${error.message}`);
      throw error;
    }
    if (!data) throw new NotFoundException('İlan bulunamadı');
    const scores = (data.scoring_results ?? []) as { hesap_zamani: string }[];
    const latest = scores.sort((a, b) => b.hesap_zamani.localeCompare(a.hesap_zamani))[0] ?? null;
    return { ...data, skor: latest };
  }
}
