-- Pusula — Storage bucket'ları (0007)
-- listing-media: kullanıcı yüklemeleri (foto + ham video). generated-videos: AI tur çıktıları.
-- Her ikisi private; API servis-rolü ile signed upload/read URL üretir (object RLS gerekmez).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-media', 'listing-media', false, 209715200,
   array['image/jpeg','image/png','image/webp','image/heic','video/mp4','video/quicktime']),
  ('generated-videos', 'generated-videos', false, 209715200,
   array['video/mp4'])
on conflict (id) do nothing;
