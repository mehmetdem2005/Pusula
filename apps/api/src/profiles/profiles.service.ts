import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../supabase/supabase.module.js';

interface UpdateProfile {
  handle?: string | undefined;
  bio?: string | undefined;
  avatar_url?: string | undefined;
  is_public?: boolean | undefined;
}

@Injectable()
export class ProfilesService {
  constructor(@Inject(SUPABASE) private readonly sb: SupabaseClient) {}

  /** Kayıt öncesi kullanıcı adı uygunluğu (format + benzersizlik). */
  async isHandleAvailable(handle: string): Promise<{ available: boolean }> {
    if (!/^[a-z0-9_]{3,30}$/.test(handle)) return { available: false };
    const { data } = await this.sb.from('users').select('id').eq('handle', handle).maybeSingle();
    return { available: !data };
  }

  /** Public profil + kullanıcının yayınlanmış ilanları (yalnız güvenli kolonlar). */
  async getByHandle(handle: string): Promise<unknown> {
    const { data: user } = await this.sb
      .from('users')
      .select('id, handle, display_name, bio, avatar_url, created_at, is_public')
      .eq('handle', handle)
      .maybeSingle();
    if (!user || user.is_public === false) throw new NotFoundException('Profil bulunamadı');

    const { data: listings } = await this.sb
      .from('ilanlar')
      .select('id, baslik, fiyat_tl, kategori, il, ilce, mahalle, created_at')
      .eq('owner_user_id', user.id)
      .eq('visibility', 'public')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(60);

    return {
      handle: user.handle,
      display_name: user.display_name,
      bio: user.bio,
      avatar_url: user.avatar_url,
      created_at: user.created_at,
      listings: listings ?? [],
    };
  }

  /** Geçerli kullanıcının profilini güncelle (handle benzersizliği kontrollü). */
  async updateMe(userId: string, patch: UpdateProfile): Promise<{ ok: true }> {
    if (patch.handle) {
      const { data: taken } = await this.sb
        .from('users')
        .select('id')
        .eq('handle', patch.handle)
        .neq('id', userId)
        .maybeSingle();
      if (taken) throw new ConflictException('Bu kullanıcı adı alınmış');
    }
    const update: Record<string, unknown> = {};
    for (const k of ['handle', 'bio', 'avatar_url', 'is_public'] as const) {
      if (patch[k] !== undefined) update[k] = patch[k];
    }
    if (Object.keys(update).length === 0) return { ok: true };
    const { error } = await this.sb.from('users').update(update).eq('id', userId);
    if (error) throw error;
    return { ok: true };
  }
}
