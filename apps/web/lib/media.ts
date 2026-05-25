'use client';

import { authedFetch } from './api';
import { getSupabaseBrowser } from './supabase';

const BUCKET = 'listing-media';

interface UploadUrlResp {
  media_id: string;
  upload_url: string;
  token: string;
  storage_path: string;
}

/**
 * Medyayı doğrudan Storage'a yükler (signed-URL). API büyük dosyayı proxy'lemez:
 * 1) /v1/media/upload-url → signed token, 2) tarayıcı Storage'a PUT, 3) /complete → ready.
 * Yüklenen medyanın id'sini döner.
 */
export async function uploadListingMedia(
  file: File,
  listingId: string,
  type: 'photo' | 'video',
): Promise<string> {
  const res = await authedFetch<UploadUrlResp>('/v1/media/upload-url', {
    method: 'POST',
    body: JSON.stringify({
      listing_id: listingId,
      type,
      content_type: file.type,
      bytes: file.size,
    }),
  });

  const { error } = await getSupabaseBrowser()
    .storage.from(BUCKET)
    .uploadToSignedUrl(res.storage_path, res.token, file, { contentType: file.type });
  if (error) throw new Error(`Yükleme başarısız: ${error.message}`);

  await authedFetch(`/v1/media/${res.media_id}/complete`, {
    method: 'POST',
    body: JSON.stringify({ bytes: file.size }),
  });
  return res.media_id;
}

export async function deleteMedia(mediaId: string): Promise<void> {
  await authedFetch(`/v1/media/${mediaId}`, { method: 'DELETE' });
}
