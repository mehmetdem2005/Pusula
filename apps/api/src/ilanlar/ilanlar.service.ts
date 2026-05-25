import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { KonutInput, IsitmaTipi, type ChatMessage } from '@pusula/shared';
import type { ScoringContext } from '@pusula/scoring';
import { ScoringService } from '../scoring/scoring.service.js';
import { SUPABASE } from '../supabase/supabase.module.js';
import { LLMService } from '../llm/llm.service.js';
import { buildRiskContext } from './risk-enrichment.js';

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

    // Sadece-link durumu: sunucu ilan sitesini açamaz (sahibinden vb. Cloudflare/bot koruması
    // datacenter IP'sini engeller). Çıkarım için gerçek metin veya ekran görüntüsü gerekir.
    if (!body.screenshot_base64) {
      const textSansUrl = text.replace(/https?:\/\/\S+/g, '').trim();
      if (textSansUrl.length < 15) {
        throw new BadRequestException(
          'Sadece link algılandı. Bot koruması nedeniyle sunucu ilan sayfasını sizin yerinize ' +
            'açamaz. İlan sayfasındaki metni (başlık, fiyat, m², konum) kopyalayıp yapıştırın ya ' +
            'da tarayıcı eklentisini kullanın.',
        );
      }
    }

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
      .eq('status', 'published')
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

  /** UGC: taslak ilan oluştur (skor zorlanmaz; medya sonra eklenir, publish ayrı). */
  async createListing(
    userId: string,
    body: {
      kategori: 'konut' | 'arsa' | 'oto';
      baslik: string;
      fiyat_tl: number;
      aciklama?: string | undefined;
      il?: string | undefined;
      ilce?: string | undefined;
      mahalle?: string | undefined;
      net_m2?: number | undefined;
      oda_sayisi?: string | undefined;
      bina_yasi?: number | undefined;
      ozellikler?: Record<string, unknown> | undefined;
    },
  ): Promise<{ id: string }> {
    const id = randomUUID();
    const { error } = await this.sb.from('ilanlar').insert({
      id,
      owner_user_id: userId,
      kategori: body.kategori,
      kaynak: 'user',
      baslik: body.baslik,
      fiyat_tl: body.fiyat_tl,
      aciklama: body.aciklama ?? null,
      il: body.il ?? null,
      ilce: body.ilce ?? null,
      mahalle: body.mahalle ?? null,
      net_m2: body.net_m2 ?? null,
      oda_sayisi: body.oda_sayisi ?? null,
      bina_yasi: body.bina_yasi ?? null,
      ozellikler: body.ozellikler ?? {},
      status: 'draft',
      visibility: 'private',
    });
    if (error) {
      this.logger.error(`createListing failed: ${error.message}`);
      throw error;
    }
    return { id };
  }

  /** UGC: ilanı güncelle (yalnız sahip). */
  async updateListing(
    userId: string,
    id: string,
    patch: Record<string, unknown>,
  ): Promise<{ ok: true }> {
    await this.assertListingOwner(userId, id);
    const allowed: Record<string, unknown> = {};
    for (const k of [
      'baslik',
      'fiyat_tl',
      'aciklama',
      'il',
      'ilce',
      'mahalle',
      'net_m2',
      'oda_sayisi',
      'bina_yasi',
      'ozellikler',
    ]) {
      if (patch[k] !== undefined) allowed[k] = patch[k];
    }
    if (Object.keys(allowed).length === 0) return { ok: true };
    const { error } = await this.sb
      .from('ilanlar')
      .update(allowed)
      .eq('id', id)
      .eq('owner_user_id', userId);
    if (error) throw error;
    return { ok: true };
  }

  /** UGC: yayınla — en az 1 hazır medya + ToS/telif beyanı şart (dava-riski). */
  async publishListing(userId: string, id: string): Promise<{ ok: true }> {
    const { data: listing } = await this.sb
      .from('ilanlar')
      .select('ozellikler')
      .eq('id', id)
      .eq('owner_user_id', userId)
      .maybeSingle();
    if (!listing) throw new NotFoundException('İlan bulunamadı');

    const { count, error: mErr } = await this.sb
      .from('media')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', id)
      .eq('processing_status', 'ready');
    if (mErr) throw mErr;
    if (!count || count < 1) {
      throw new BadRequestException('Yayınlamak için en az bir hazır fotoğraf/video gerekli.');
    }
    const ozellikler = {
      ...((listing.ozellikler as Record<string, unknown> | null) ?? {}),
      tos_attested_at: new Date().toISOString(),
    };
    const { error } = await this.sb
      .from('ilanlar')
      .update({ visibility: 'public', status: 'published', ozellikler })
      .eq('id', id)
      .eq('owner_user_id', userId);
    if (error) throw error;
    return { ok: true };
  }

  private async assertListingOwner(userId: string, id: string): Promise<void> {
    const { data } = await this.sb
      .from('ilanlar')
      .select('id')
      .eq('id', id)
      .eq('owner_user_id', userId)
      .maybeSingle();
    if (!data) throw new NotFoundException('İlan bulunamadı');
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
  /**
   * Tek ilan detayı. Görünürlük: sahip her statüde görür; başkaları yalnız public+published.
   * Medya imzalı URL'leri, sahip profili ve beğeni bilgisiyle döner. Skor yalnız sahibine
   * gösterilir (kelepir analizi sahibe özel; feed'de otomatik skor yok).
   */
  async getIlan(userId: string, id: string): Promise<unknown> {
    const { data, error } = await this.sb
      .from('ilanlar')
      .select(
        '*, scoring_results(*), media(id,type,bucket,storage_path,poster_path,ordinal,is_ai_generated)',
      )
      .eq('id', id)
      .maybeSingle();
    if (error) {
      this.logger.error(`getIlan failed: ${error.message}`);
      throw error;
    }
    if (!data) throw new NotFoundException('İlan bulunamadı');

    const isOwner = data.owner_user_id === userId;
    const isPublic = data.visibility === 'public' && data.status === 'published';
    if (!isOwner && !isPublic) throw new NotFoundException('İlan bulunamadı');

    // Medya → batch imzalı URL (bucket bazında).
    interface MediaRow {
      id: string;
      type: string;
      bucket: string;
      storage_path: string;
      poster_path: string | null;
      ordinal: number;
      is_ai_generated: boolean;
    }
    const mediaRows = ((data.media ?? []) as MediaRow[])
      .slice()
      .sort((a, b) => a.ordinal - b.ordinal);
    const pathsByBucket = new Map<string, string[]>();
    for (const m of mediaRows) {
      const arr = pathsByBucket.get(m.bucket) ?? [];
      arr.push(m.storage_path);
      if (m.poster_path) arr.push(m.poster_path);
      pathsByBucket.set(m.bucket, arr);
    }
    const urlMap = new Map<string, string>();
    for (const [bucket, paths] of pathsByBucket) {
      if (paths.length === 0) continue;
      const { data: signed } = await this.sb.storage.from(bucket).createSignedUrls(paths, 3600);
      for (const s of signed ?? []) {
        if (s.signedUrl && s.path) urlMap.set(`${bucket}:${s.path}`, s.signedUrl);
      }
    }
    const media = mediaRows.map((m) => ({
      id: m.id,
      type: m.type,
      url: urlMap.get(`${m.bucket}:${m.storage_path}`) ?? null,
      poster: m.poster_path ? (urlMap.get(`${m.bucket}:${m.poster_path}`) ?? null) : null,
      is_ai_generated: m.is_ai_generated,
    }));

    // Sahip profili (güvenli kolonlar).
    const { data: owner } = await this.sb
      .from('users')
      .select('id, handle, avatar_url')
      .eq('id', data.owner_user_id as string)
      .maybeSingle();

    // Beğeni sayısı + benim beğenim.
    const { count: likeCount } = await this.sb
      .from('likes')
      .select('listing_id', { count: 'exact', head: true })
      .eq('listing_id', id);
    const { data: myLike } = await this.sb
      .from('likes')
      .select('listing_id')
      .eq('listing_id', id)
      .eq('user_id', userId)
      .maybeSingle();

    const scores = (data.scoring_results ?? []) as { hesap_zamani: string }[];
    const latest = scores.sort((a, b) => b.hesap_zamani.localeCompare(a.hesap_zamani))[0] ?? null;

    const { scoring_results: _sr, media: _m, ...rest } = data as Record<string, unknown>;
    return {
      ...rest,
      is_owner: isOwner,
      owner: owner ?? { id: data.owner_user_id, handle: null, avatar_url: null },
      media,
      like_count: likeCount ?? 0,
      liked_by_me: !!myLike,
      skor: isOwner ? latest : null,
    };
  }
}
