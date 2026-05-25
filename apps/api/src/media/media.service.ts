import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../supabase/supabase.module.js';
import type { CompleteInput, UploadUrlInput } from './dto.js';

const BUCKET = 'listing-media';
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const PHOTO_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
};
const VIDEO_TYPES: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
};

interface MediaRow {
  id: string;
  owner_user_id: string;
  bucket: string;
  storage_path: string;
  listing_id: string;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(@Inject(SUPABASE) private readonly sb: SupabaseClient) {}

  /** Signed upload URL üret + media satırı (uploading). Client doğrudan Storage'a PUT eder. */
  async createUploadUrl(
    userId: string,
    body: UploadUrlInput,
  ): Promise<{ media_id: string; upload_url: string; token: string; storage_path: string }> {
    await this.assertListingOwner(userId, body.listing_id);

    const map = body.type === 'photo' ? PHOTO_TYPES : VIDEO_TYPES;
    const ext = map[body.content_type];
    if (!ext) throw new BadRequestException(`Desteklenmeyen format: ${body.content_type}`);
    const max = body.type === 'photo' ? MAX_PHOTO_BYTES : MAX_VIDEO_BYTES;
    if (body.bytes > max) {
      throw new BadRequestException(`Dosya çok büyük (max ${Math.round(max / 1024 / 1024)}MB).`);
    }

    const mediaId = randomUUID();
    const path = `${userId}/${body.listing_id}/${mediaId}.${ext}`;
    const { data, error } = await this.sb.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error || !data) {
      this.logger.error(`createSignedUploadUrl failed: ${error?.message}`);
      throw new BadRequestException('Yükleme bağlantısı oluşturulamadı.');
    }

    // ordinal = mevcut medya sayısı (sıra korunur).
    const { count } = await this.sb
      .from('media')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', body.listing_id);

    const { error: insErr } = await this.sb.from('media').insert({
      id: mediaId,
      listing_id: body.listing_id,
      owner_user_id: userId,
      type: body.type,
      bucket: BUCKET,
      storage_path: path,
      bytes: body.bytes,
      ordinal: count ?? 0,
      processing_status: 'uploading',
    });
    if (insErr) throw insErr;

    return { media_id: mediaId, upload_url: data.signedUrl, token: data.token, storage_path: path };
  }

  /** Yükleme tamamlandı → ready + boyut/poster. */
  async complete(userId: string, mediaId: string, body: CompleteInput): Promise<{ ok: true }> {
    await this.getOwned(userId, mediaId);
    const patch: Record<string, unknown> = { processing_status: 'ready' };
    for (const k of ['width', 'height', 'duration_ms', 'bytes', 'poster_path'] as const) {
      if (body[k] !== undefined) patch[k] = body[k];
    }
    const { error } = await this.sb
      .from('media')
      .update(patch)
      .eq('id', mediaId)
      .eq('owner_user_id', userId);
    if (error) throw error;
    return { ok: true };
  }

  /** İmzalı okuma URL'i (sahip veya public+published ilan). */
  async readUrl(userId: string, mediaId: string): Promise<{ url: string }> {
    const { data: row } = await this.sb
      .from('media')
      .select('bucket, storage_path, owner_user_id, listing_id')
      .eq('id', mediaId)
      .maybeSingle();
    if (!row) throw new NotFoundException('Medya bulunamadı');
    if (row.owner_user_id !== userId) {
      const { data: pub } = await this.sb
        .from('ilanlar')
        .select('id')
        .eq('id', row.listing_id)
        .eq('visibility', 'public')
        .eq('status', 'published')
        .maybeSingle();
      if (!pub) throw new NotFoundException('Medya bulunamadı');
    }
    const { data, error } = await this.sb.storage
      .from(row.bucket as string)
      .createSignedUrl(row.storage_path as string, 3600);
    if (error || !data) throw new BadRequestException('Okuma bağlantısı oluşturulamadı.');
    return { url: data.signedUrl };
  }

  async remove(userId: string, mediaId: string): Promise<{ ok: true }> {
    const row = await this.getOwned(userId, mediaId);
    await this.sb.storage.from(row.bucket).remove([row.storage_path]);
    const { error } = await this.sb
      .from('media')
      .delete()
      .eq('id', mediaId)
      .eq('owner_user_id', userId);
    if (error) throw error;
    return { ok: true };
  }

  private async getOwned(userId: string, mediaId: string): Promise<MediaRow> {
    const { data } = await this.sb
      .from('media')
      .select('id, owner_user_id, bucket, storage_path, listing_id')
      .eq('id', mediaId)
      .eq('owner_user_id', userId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Medya bulunamadı');
    return data as MediaRow;
  }

  private async assertListingOwner(userId: string, listingId: string): Promise<void> {
    const { data } = await this.sb
      .from('ilanlar')
      .select('id')
      .eq('id', listingId)
      .eq('owner_user_id', userId)
      .maybeSingle();
    if (!data) throw new NotFoundException('İlan bulunamadı');
  }
}
