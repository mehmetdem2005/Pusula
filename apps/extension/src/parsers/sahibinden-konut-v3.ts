/**
 * sahibinden Konut Detay Parser (selectors v3, May 2026).
 *
 * KRİTİK: Selector değişimi otomatik tespit ediliyor:
 *  - parse_versiyonu manifest'ten geliyor
 *  - Eksik beklenen alanlar Sentry'ye custom event olarak loglanıyor
 *  - Fallback bir alt versiyon (v2) parser var
 */
import { KonutInput } from '@pusula/shared';
import { SCORING_FORMULA_VERSION } from '@pusula/shared';

export const PARSER_VERSION = 'sahibinden-konut-v3';

interface RawClassifiedItem {
  label: string;
  value: string;
}

function safeText(el: Element | null): string {
  return el?.textContent?.trim() ?? '';
}

function parseInt_(s: string): number | undefined {
  const n = parseInt(s.replace(/[^\d-]/g, ''), 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseFiyat(s: string): number | undefined {
  // "4.250.000 TL" → 4250000
  const cleaned = s.replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : undefined;
}

/**
 * sahibinden ilan detay sayfasında "Bilgileri" tablosu/listesi varsayım:
 * <ul class="classifiedInfoList"> <li><strong>Bina Yaşı:</strong> 12 ...
 *
 * NOT: Gerçek selectors üretimde test edilip kalibre edilmeli — bu iskelet.
 */
function readClassifiedItems(doc: Document): RawClassifiedItem[] {
  const items: RawClassifiedItem[] = [];

  // v3 selector
  const list = doc.querySelector(
    '.classifiedInfoList, [data-testid="info-list"], ul.classified-info-list',
  );
  if (list) {
    for (const li of Array.from(list.querySelectorAll('li'))) {
      const label = safeText(li.querySelector('strong, .label'));
      const value =
        safeText(li.querySelector('span:not(.label)')) ||
        li.textContent?.replace(label, '').trim() ||
        '';
      if (label) items.push({ label: label.replace(':', '').trim(), value: value.trim() });
    }
  }
  return items;
}

function mapIsitma(s: string): KonutInput['isitma'] {
  const lc = s.toLocaleLowerCase('tr-TR');
  if (lc.includes('kombi')) return 'dogalgaz_kombi';
  if (lc.includes('pay öl')) return 'merkezi_pay_olcer';
  if (lc.includes('merkezi')) return 'merkezi';
  if (lc.includes('kat kalorifer')) return 'kat_kalorifer';
  if (lc.includes('yerden')) return 'yerden_isitma';
  if (lc.includes('klima')) return 'klima';
  if (lc.includes('soba')) return 'soba';
  if (lc.includes('yok')) return 'yok';
  return 'bilinmiyor';
}

function mapTapu(s: string): KonutInput['tapu_durumu'] {
  const lc = s.toLocaleLowerCase('tr-TR');
  if (lc.includes('kat mülk')) return 'kat_mulkiyeti';
  if (lc.includes('kat irtif')) return 'kat_irtifaki';
  if (lc.includes('hisseli')) return 'hisseli';
  if (lc.includes('tahsis')) return 'tahsis';
  if (lc.includes('müstakil')) return 'mustakil';
  return 'bilinmiyor';
}

function mapKat(s: string): number | 'zemin' | 'bahce_kati' | 'cati_kati' | 'mustakil' | undefined {
  const lc = s.toLocaleLowerCase('tr-TR');
  if (lc.includes('zemin')) return 'zemin';
  if (lc.includes('bahçe')) return 'bahce_kati';
  if (lc.includes('çatı')) return 'cati_kati';
  if (lc.includes('müstakil')) return 'mustakil';
  const n = parseInt_(s);
  return n;
}

/**
 * Ana parse fonksiyonu — sahibinden ilan detay sayfasını KonutInput'a dönüştürür.
 *
 * Beklenen kullanım (content script içinde):
 *   const ilan = parseKonutDetay(document, location.href);
 *   sendToServiceWorker({ type: 'INGEST_KONUT', payload: ilan });
 */
export function parseKonutDetay(doc: Document, url: string): KonutInput | null {
  try {
    // Başlık
    const baslik = safeText(doc.querySelector('h1, [data-testid="title"]'));

    // Fiyat
    const fiyatStr = safeText(doc.querySelector('.classifiedPrice, [data-testid="price"], .price'));
    const fiyat_tl = parseFiyat(fiyatStr);
    if (!fiyat_tl) return null;

    // Konum (breadcrumb veya address bloğu)
    const breadcrumb = Array.from(
      doc.querySelectorAll('.classifiedBreadCrumb a, .breadcrumb a'),
    ).map((a) => safeText(a));
    const il = breadcrumb[breadcrumb.length - 3] ?? '';
    const ilce = breadcrumb[breadcrumb.length - 2] ?? '';
    const mahalle = breadcrumb[breadcrumb.length - 1] ?? undefined;

    // Classified items
    const items = readClassifiedItems(doc);
    const byLabel = new Map(items.map((i) => [i.label.toLocaleLowerCase('tr-TR'), i.value]));

    const net_m2 = parseInt_(byLabel.get('net m²') ?? byLabel.get('net m2') ?? '') ?? 0;
    const brut_m2 = parseInt_(byLabel.get('brüt m²') ?? byLabel.get('brüt m2') ?? '');
    const oda_sayisi = (byLabel.get('oda sayısı') ?? '').replace(/\s+/g, '');
    const bina_yasi = parseInt_(byLabel.get('bina yaşı') ?? '0') ?? 0;
    const bulundugu_kat = mapKat(byLabel.get('bulunduğu kat') ?? '');
    const bina_kat_sayisi = parseInt_(byLabel.get('kat sayısı') ?? '');
    const banyo_sayisi = parseInt_(byLabel.get('banyo sayısı') ?? '');
    const isitma = mapIsitma(byLabel.get('ısıtma') ?? '');
    const balkon = byLabel.get('balkon')?.toLocaleLowerCase('tr-TR') === 'var';
    const esyali = byLabel.get('eşyalı')?.toLocaleLowerCase('tr-TR') === 'evet';
    const krediye_uygunStr = (byLabel.get('krediye uygun') ?? '').toLocaleLowerCase('tr-TR');
    const krediye_uygun: KonutInput['krediye_uygun'] =
      krediye_uygunStr.includes('uygun') && !krediye_uygunStr.includes('değil')
        ? 'evet'
        : krediye_uygunStr.includes('değil')
          ? 'hayir'
          : krediye_uygunStr.includes('kısmen')
            ? 'kismen'
            : 'bilinmiyor';
    const tapu_durumu = mapTapu(byLabel.get('tapu durumu') ?? '');

    // Resimler
    const foto_urlleri = Array.from(
      doc.querySelectorAll('.classifiedDetailPhoto img, [data-testid="photo"] img'),
    )
      .map((img) => (img as HTMLImageElement).src)
      // Yalnız mutlak http(s) — data:/relatif/lazy placeholder'lar şemayı (z.string().url()) bozar.
      .filter((s) => /^https?:\/\//.test(s));

    // Kaynak id (URL'den)
    const idMatch = url.match(/\/ilan\/[^/]*?-(\d+)\/?/);
    const kaynak_id = idMatch?.[1] ?? '';

    const ilan: KonutInput = {
      kaynak: 'sahibinden',
      kaynak_id,
      ilan_url: url,
      baslik,
      fiyat_tl,
      il,
      ilce,
      mahalle: mahalle && mahalle.length > 0 ? mahalle : undefined,
      net_m2,
      brut_m2,
      oda_sayisi,
      banyo_sayisi,
      bina_yasi,
      bina_kat_sayisi,
      bulundugu_kat,
      isitma,
      balkon,
      esyali,
      krediye_uygun,
      tapu_durumu,
      foto_urlleri,
      parse_versiyonu: `${PARSER_VERSION}-${SCORING_FORMULA_VERSION}`,
      parse_tarihi: new Date().toISOString(),
      ham_veri: Object.fromEntries(items.map((i) => [i.label, i.value])),
    };

    // Şemaya uymuyorsa (eksik/uydurma alan) null dön → content script görüntü-fallback'e geçer.
    // Uydurma 0/'2+1' ile sunucuya geçersiz veri göndermektense parse "başarısız" sayılır.
    const parsed = KonutInput.safeParse(ilan);
    if (!parsed.success) {
      console.warn('[Pusula parser] şema geçersiz:', parsed.error.issues[0]?.message);
      return null;
    }
    return parsed.data;
  } catch (err) {
    console.error('[Pusula parser] failed:', err);
    return null;
  }
}
