import { Inject, Injectable, Logger } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../supabase/supabase.module.js';

interface MediaRow {
  id: string;
  type: string;
  bucket: string;
  storage_path: string;
  poster_path: string | null;
  ordinal: number;
  is_ai_generated: boolean;
}

export interface FeedCardMedia {
  id: string;
  type: string;
  url: string | null;
  is_ai_generated: boolean;
}
export interface FeedCard {
  id: string;
  baslik: string;
  fiyat_tl: number;
  kategori: string;
  il: string | null;
  ilce: string | null;
  mahalle: string | null;
  net_m2: number | null;
  oda_sayisi: string | null;
  owner: { id: string; handle: string | null; avatar_url: string | null };
  media: FeedCardMedia[];
  like_count: number;
  liked_by_me: boolean;
}

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);

  constructor(@Inject(SUPABASE) private readonly sb: SupabaseClient) {}

  /**
   * Public feed — yenilik-öncelikli (soğuk başlangıç). Kişiselleştirme Faz 4'te affinity ile gelir.
   * Cursor = offset (opak değil; basit sayfalama). Media için batch signed URL üretir.
   */
  async getFeed(
    userId: string,
    cursor: number,
    limit: number,
  ): Promise<{ items: FeedCard[]; next_cursor: number | null }> {
    const offset = Math.max(0, cursor);
    const { data, error } = await this.sb
      .from('ilanlar')
      .select(
        'id,baslik,fiyat_tl,kategori,il,ilce,mahalle,net_m2,oda_sayisi,owner_user_id,created_at, media(id,type,bucket,storage_path,poster_path,ordinal,is_ai_generated)',
      )
      .eq('visibility', 'public')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) {
      this.logger.error(`getFeed failed: ${error.message}`);
      throw error;
    }
    const rows = data ?? [];
    if (rows.length === 0) return { items: [], next_cursor: null };

    const listingIds = rows.map((r) => r.id as string);
    const ownerIds = [...new Set(rows.map((r) => r.owner_user_id as string))];

    // Sahip profilleri (güvenli kolonlar).
    const { data: owners } = await this.sb
      .from('users')
      .select('id, handle, avatar_url')
      .in('id', ownerIds);
    const ownerMap = new Map(
      (owners ?? []).map((o) => [
        o.id as string,
        o as { id: string; handle: string | null; avatar_url: string | null },
      ]),
    );

    // Beğeni sayıları + benim beğenilerim.
    const { data: likeRows } = await this.sb
      .from('likes')
      .select('listing_id')
      .in('listing_id', listingIds);
    const likeCount = new Map<string, number>();
    for (const l of likeRows ?? []) {
      const id = l.listing_id as string;
      likeCount.set(id, (likeCount.get(id) ?? 0) + 1);
    }
    const { data: myLikes } = await this.sb
      .from('likes')
      .select('listing_id')
      .eq('user_id', userId)
      .in('listing_id', listingIds);
    const likedByMe = new Set((myLikes ?? []).map((l) => l.listing_id as string));

    // Tüm medya yollarını bucket bazında topla → batch signed URL.
    const pathsByBucket = new Map<string, string[]>();
    for (const r of rows) {
      for (const m of (r.media ?? []) as MediaRow[]) {
        const arr = pathsByBucket.get(m.bucket) ?? [];
        arr.push(m.storage_path);
        pathsByBucket.set(m.bucket, arr);
      }
    }
    const urlMap = new Map<string, string>();
    for (const [bucket, paths] of pathsByBucket) {
      if (paths.length === 0) continue;
      const { data: signed } = await this.sb.storage.from(bucket).createSignedUrls(paths, 3600);
      for (const s of signed ?? []) {
        if (s.signedUrl && s.path) urlMap.set(`${bucket}:${s.path}`, s.signedUrl);
      }
    }

    const items: FeedCard[] = rows.map((r) => {
      const media = ((r.media ?? []) as MediaRow[])
        .slice()
        .sort((a, b) => a.ordinal - b.ordinal)
        .map((m) => ({
          id: m.id,
          type: m.type,
          url: urlMap.get(`${m.bucket}:${m.storage_path}`) ?? null,
          is_ai_generated: m.is_ai_generated,
        }));
      const owner = ownerMap.get(r.owner_user_id as string) ?? {
        id: r.owner_user_id as string,
        handle: null,
        avatar_url: null,
      };
      return {
        id: r.id as string,
        baslik: r.baslik as string,
        fiyat_tl: r.fiyat_tl as number,
        kategori: r.kategori as string,
        il: (r.il as string | null) ?? null,
        ilce: (r.ilce as string | null) ?? null,
        mahalle: (r.mahalle as string | null) ?? null,
        net_m2: (r.net_m2 as number | null) ?? null,
        oda_sayisi: (r.oda_sayisi as string | null) ?? null,
        owner: { id: owner.id, handle: owner.handle, avatar_url: owner.avatar_url },
        media,
        like_count: likeCount.get(r.id as string) ?? 0,
        liked_by_me: likedByMe.has(r.id as string),
      };
    });

    const next_cursor = rows.length === limit ? offset + limit : null;
    return { items, next_cursor };
  }
}
