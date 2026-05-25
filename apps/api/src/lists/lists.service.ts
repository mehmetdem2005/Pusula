import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChatMessage } from '@pusula/shared';
import { SUPABASE } from '../supabase/supabase.module.js';
import { LLMService } from '../llm/llm.service.js';
import type { ListFilters } from './dto.js';

interface Skor {
  toplam: number;
  etiket: string;
  confidence: string;
  hesap_zamani: string;
}

export interface ListItem {
  id: string;
  baslik: string;
  ilan_url: string;
  fiyat_tl: number;
  il: string | null;
  ilce: string | null;
  mahalle: string | null;
  net_m2: number | null;
  oda_sayisi: string | null;
  bina_yasi: number | null;
  kaynak: string | null;
  foto_urlleri: string[] | null;
  added_at: string;
  skor: Skor | null;
}

const FAVORITES_NAME = 'Favorilerim';

@Injectable()
export class ListsService {
  private readonly logger = new Logger(ListsService.name);

  constructor(
    @Inject(SUPABASE) private readonly sb: SupabaseClient,
    private readonly llm: LLMService,
  ) {}

  /** Kullanıcının varsayılan (favori) listesini döndürür; yoksa oluşturur. */
  private async ensureDefault(userId: string): Promise<string> {
    const { data: existing } = await this.sb
      .from('lists')
      .select('id')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle();
    if (existing) return existing.id as string;

    const { data: created, error } = await this.sb
      .from('lists')
      .insert({ user_id: userId, name: FAVORITES_NAME, is_default: true })
      .select('id')
      .single();
    if (error) {
      // Yarış: unique index → tekrar oku.
      const { data: again } = await this.sb
        .from('lists')
        .select('id')
        .eq('user_id', userId)
        .eq('is_default', true)
        .maybeSingle();
      if (again) return again.id as string;
      throw error;
    }
    return created.id as string;
  }

  private async assertOwner(
    userId: string,
    listId: string,
  ): Promise<{ id: string; name: string; is_default: boolean }> {
    const { data } = await this.sb
      .from('lists')
      .select('id,name,is_default')
      .eq('id', listId)
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Liste bulunamadı');
    return data as { id: string; name: string; is_default: boolean };
  }

  async getLists(
    userId: string,
  ): Promise<{ id: string; name: string; is_default: boolean; item_count: number }[]> {
    await this.ensureDefault(userId);
    const { data, error } = await this.sb
      .from('lists')
      .select('id,name,is_default,created_at, list_items(count)')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => {
      const items = (r.list_items ?? []) as { count: number }[];
      return {
        id: r.id as string,
        name: r.name as string,
        is_default: r.is_default as boolean,
        item_count: items[0]?.count ?? 0,
      };
    });
  }

  async createList(userId: string, name: string): Promise<{ id: string; name: string }> {
    const { data, error } = await this.sb
      .from('lists')
      .insert({ user_id: userId, name })
      .select('id,name')
      .single();
    if (error) throw error;
    return data as { id: string; name: string };
  }

  async renameList(
    userId: string,
    id: string,
    name: string,
  ): Promise<{ id: string; name: string }> {
    const list = await this.assertOwner(userId, id);
    if (list.is_default) throw new ForbiddenException('Varsayılan liste yeniden adlandırılamaz');
    const { error } = await this.sb
      .from('lists')
      .update({ name })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
    return { id, name };
  }

  async deleteList(userId: string, id: string): Promise<{ ok: true }> {
    const list = await this.assertOwner(userId, id);
    if (list.is_default) throw new ForbiddenException('Favorilerim listesi silinemez');
    const { error } = await this.sb.from('lists').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
    return { ok: true };
  }

  async addItem(userId: string, listId: string, ilanId: string): Promise<{ ok: true }> {
    await this.assertOwner(userId, listId);
    const { data: ilan } = await this.sb
      .from('ilanlar')
      .select('id')
      .eq('id', ilanId)
      .maybeSingle();
    if (!ilan) throw new NotFoundException('İlan bulunamadı');
    const { error } = await this.sb
      .from('list_items')
      .upsert(
        { list_id: listId, ilan_id: ilanId },
        { onConflict: 'list_id,ilan_id', ignoreDuplicates: true },
      );
    if (error) throw error;
    return { ok: true };
  }

  async removeItem(userId: string, listId: string, ilanId: string): Promise<{ ok: true }> {
    await this.assertOwner(userId, listId);
    const { error } = await this.sb
      .from('list_items')
      .delete()
      .eq('list_id', listId)
      .eq('ilan_id', ilanId);
    if (error) throw error;
    return { ok: true };
  }

  async addFavorite(userId: string, ilanId: string): Promise<{ ok: true; list_id: string }> {
    const listId = await this.ensureDefault(userId);
    await this.addItem(userId, listId, ilanId);
    return { ok: true, list_id: listId };
  }

  async removeFavorite(userId: string, ilanId: string): Promise<{ ok: true }> {
    const listId = await this.ensureDefault(userId);
    return this.removeItem(userId, listId, ilanId);
  }

  /** Liste + (filtrelenmiş, sıralanmış) ilan item'ları. */
  async getListDetail(
    userId: string,
    id: string,
    filters: ListFilters,
  ): Promise<{ id: string; name: string; is_default: boolean; items: ListItem[] }> {
    const list = await this.assertOwner(userId, id);
    const { data, error } = await this.sb
      .from('list_items')
      .select(
        'added_at, ilanlar(id,baslik,ilan_url,fiyat_tl,il,ilce,mahalle,net_m2,oda_sayisi,bina_yasi,kaynak,foto_urlleri, scoring_results(toplam,etiket,confidence,hesap_zamani))',
      )
      .eq('list_id', id);
    if (error) throw error;

    const items: ListItem[] = (data ?? [])
      .map((row) => {
        // list_items → ilanlar to-one; runtime tek nesne (supabase-js tipi dizi sanır → unknown'dan cast).
        const ilan = row.ilanlar as unknown as Record<string, unknown> | null;
        if (!ilan) return null;
        const scores = ((ilan.scoring_results ?? []) as Skor[])
          .slice()
          .sort((a, b) => b.hesap_zamani.localeCompare(a.hesap_zamani));
        return {
          id: ilan.id as string,
          baslik: ilan.baslik as string,
          ilan_url: ilan.ilan_url as string,
          fiyat_tl: ilan.fiyat_tl as number,
          il: (ilan.il as string | null) ?? null,
          ilce: (ilan.ilce as string | null) ?? null,
          mahalle: (ilan.mahalle as string | null) ?? null,
          net_m2: (ilan.net_m2 as number | null) ?? null,
          oda_sayisi: (ilan.oda_sayisi as string | null) ?? null,
          bina_yasi: (ilan.bina_yasi as number | null) ?? null,
          kaynak: (ilan.kaynak as string | null) ?? null,
          foto_urlleri: (ilan.foto_urlleri as string[] | null) ?? null,
          added_at: row.added_at as string,
          skor: scores[0] ?? null,
        };
      })
      .filter((x): x is ListItem => x !== null);

    return {
      id: list.id,
      name: list.name,
      is_default: list.is_default,
      items: applyFilters(items, filters),
    };
  }

  /**
   * Chatbot bağlamı: kullanıcının TÜM listelerindeki benzersiz ilanlar + skor + hangi listelerde.
   * Asistan "tüm kaydettiklerim" sorularını ve kelepir karşılaştırmasını bununla yanıtlar.
   */
  async getSavedContext(userId: string): Promise<{
    items: (ListItem & { lists: string[] })[];
  }> {
    const { data: lists } = await this.sb.from('lists').select('id, name').eq('user_id', userId);
    const listName = new Map((lists ?? []).map((l) => [l.id as string, l.name as string]));
    const listIds = (lists ?? []).map((l) => l.id as string);
    if (listIds.length === 0) return { items: [] };

    const { data, error } = await this.sb
      .from('list_items')
      .select(
        'list_id, added_at, ilanlar(id,baslik,ilan_url,fiyat_tl,kategori,il,ilce,mahalle,net_m2,oda_sayisi,bina_yasi,kaynak,foto_urlleri, scoring_results(toplam,etiket,confidence,hesap_zamani))',
      )
      .in('list_id', listIds);
    if (error) throw error;

    const byIlan = new Map<string, ListItem & { lists: string[] }>();
    for (const row of data ?? []) {
      const ilan = row.ilanlar as unknown as Record<string, unknown> | null;
      if (!ilan) continue;
      const id = ilan.id as string;
      const lname = listName.get(row.list_id as string) ?? '';
      const existing = byIlan.get(id);
      if (existing) {
        if (lname && !existing.lists.includes(lname)) existing.lists.push(lname);
        continue;
      }
      const scores = ((ilan.scoring_results ?? []) as Skor[])
        .slice()
        .sort((a, b) => b.hesap_zamani.localeCompare(a.hesap_zamani));
      byIlan.set(id, {
        id,
        baslik: ilan.baslik as string,
        ilan_url: ilan.ilan_url as string,
        fiyat_tl: ilan.fiyat_tl as number,
        il: (ilan.il as string | null) ?? null,
        ilce: (ilan.ilce as string | null) ?? null,
        mahalle: (ilan.mahalle as string | null) ?? null,
        net_m2: (ilan.net_m2 as number | null) ?? null,
        oda_sayisi: (ilan.oda_sayisi as string | null) ?? null,
        bina_yasi: (ilan.bina_yasi as number | null) ?? null,
        kaynak: (ilan.kaynak as string | null) ?? null,
        foto_urlleri: (ilan.foto_urlleri as string[] | null) ?? null,
        added_at: row.added_at as string,
        skor: scores[0] ?? null,
        lists: lname ? [lname] : [],
      });
    }
    return { items: [...byIlan.values()] };
  }

  /**
   * Liderlik tablosu: item'ları kelepirden aza sırala + LLM'den kısa Türkçe değerlendirme.
   * Skor deterministik; LLM yalnız yorum üretir (skoru değiştirmez).
   */
  async analyzeList(
    userId: string,
    id: string,
    filters: ListFilters,
  ): Promise<{ ranking: ListItem[]; commentary: string }> {
    const detail = await this.getListDetail(userId, id, filters);
    const ranking = detail.items
      .slice()
      .sort((a, b) => (b.skor?.toplam ?? -1) - (a.skor?.toplam ?? -1));

    if (ranking.length === 0) {
      return { ranking, commentary: 'Listede değerlendirilecek ilan yok.' };
    }

    const compact = ranking.slice(0, 25).map((i, idx) => ({
      sira: idx + 1,
      baslik: i.baslik,
      skor: i.skor ? Math.round(i.skor.toplam) : null,
      etiket: i.skor?.etiket ?? null,
      fiyat_tl: i.fiyat_tl,
      konum: [i.ilce, i.mahalle].filter(Boolean).join(' · '),
      net_m2: i.net_m2,
    }));
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          "Sen Pusula'nın emlak danışmanısın. Aşağıda bir listenin ilanları kelepir skoruna göre " +
          'sıralı (yüksek=daha kelepir). Sade, kısa Türkçe bir liderlik değerlendirmesi yaz: en ' +
          'kelepir 1-2 ilanı ve neden öne çıktıklarını, dikkat edilecek bir-iki riski belirt. ' +
          'Skorları DEĞİŞTİRME, yalnız yorumla. 120 kelimeyi geçme.',
      },
      { role: 'user', content: `SIRALI LİSTE (JSON): ${JSON.stringify(compact)}` },
    ];
    let commentary = '';
    try {
      const resp = await this.llm.chat(
        userId,
        messages,
        { taskType: 'score-explanation', stream: false },
        {},
      );
      commentary = resp.text;
    } catch (e) {
      this.logger.warn(`analyzeList LLM failed: ${(e as Error).message}`);
      commentary = 'AI yorumu şu an üretilemedi; sıralama skora göre gösteriliyor.';
    }
    return { ranking, commentary };
  }
}

/** Item'lara filtre + sıralama uygular (listeler küçük; bellek içi yeterli). */
function applyFilters(items: ListItem[], f: ListFilters): ListItem[] {
  const bandMatch = (etiket: string | undefined): boolean => {
    if (!f.band) return true;
    return f.band.includes(etiket ?? '');
  };
  const has = (val: string | null, q?: string) =>
    !q || (val ?? '').toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr'));

  let out = items.filter((i) => {
    if (!has(i.il, f.il)) return false;
    if (!has(i.ilce, f.ilce)) return false;
    if (!has(i.mahalle, f.mahalle)) return false;
    if (f.fiyatMin !== undefined && i.fiyat_tl < f.fiyatMin) return false;
    if (f.fiyatMax !== undefined && i.fiyat_tl > f.fiyatMax) return false;
    if (f.m2Min !== undefined && (i.net_m2 ?? 0) < f.m2Min) return false;
    if (f.m2Max !== undefined && (i.net_m2 ?? Infinity) > f.m2Max) return false;
    if (f.yasMin !== undefined && (i.bina_yasi ?? 0) < f.yasMin) return false;
    if (f.yasMax !== undefined && (i.bina_yasi ?? Infinity) > f.yasMax) return false;
    if (f.skorMin !== undefined && (i.skor?.toplam ?? -1) < f.skorMin) return false;
    if (f.skorMax !== undefined && (i.skor?.toplam ?? 101) > f.skorMax) return false;
    if (f.oda && !f.oda.includes(i.oda_sayisi ?? '')) return false;
    if (f.kaynak && !f.kaynak.includes(i.kaynak ?? '')) return false;
    if (!bandMatch(i.skor?.etiket)) return false;
    return true;
  });

  const s = (i: ListItem) => i.skor?.toplam ?? -1;
  switch (f.sort) {
    case 'skor_asc':
      out = out.sort((a, b) => s(a) - s(b));
      break;
    case 'fiyat_asc':
      out = out.sort((a, b) => a.fiyat_tl - b.fiyat_tl);
      break;
    case 'fiyat_desc':
      out = out.sort((a, b) => b.fiyat_tl - a.fiyat_tl);
      break;
    case 'm2_desc':
      out = out.sort((a, b) => (b.net_m2 ?? 0) - (a.net_m2 ?? 0));
      break;
    case 'yeni':
      out = out.sort((a, b) => b.added_at.localeCompare(a.added_at));
      break;
    case 'skor_desc':
    default:
      out = out.sort((a, b) => s(b) - s(a));
  }
  return out;
}
