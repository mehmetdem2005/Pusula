import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../supabase/supabase.module.js';

const SEVERE = new Set(['illegal', 'personal_data']);

interface CreateReport {
  listing_id: string;
  media_id?: string | undefined;
  reason: 'spam' | 'fraud' | 'copyright' | 'illegal' | 'personal_data' | 'other';
  detail?: string | undefined;
}

@Injectable()
export class ReportsService {
  constructor(@Inject(SUPABASE) private readonly sb: SupabaseClient) {}

  /** Rapor oluştur. Ağır kategoriler (illegal/personal_data) ilanı anında kaldırır (sonra inceleme). */
  async create(userId: string, body: CreateReport): Promise<{ ok: true }> {
    const { error } = await this.sb.from('reports').insert({
      reporter_user_id: userId,
      listing_id: body.listing_id,
      media_id: body.media_id ?? null,
      reason: body.reason,
      detail: body.detail ?? null,
      status: 'open',
    });
    if (error) throw error;

    if (SEVERE.has(body.reason)) {
      await this.takedown(body.listing_id, `auto:${body.reason}`, 'report', userId);
    }
    return { ok: true };
  }

  private async assertAdmin(userId: string): Promise<void> {
    const { data } = await this.sb.from('users').select('role').eq('id', userId).maybeSingle();
    if (!data || data.role !== 'admin') throw new ForbiddenException('Yetki yok');
  }

  private async takedown(
    listingId: string,
    reason: string,
    source: 'report' | 'dmca' | 'kvkk' | 'admin',
    actor: string,
  ): Promise<void> {
    await this.sb.from('ilanlar').update({ status: 'removed' }).eq('id', listingId);
    await this.sb
      .from('takedowns')
      .insert({ listing_id: listingId, reason, source, actor_user_id: actor });
  }

  /** Admin: açık/incelemedeki raporlar. */
  async listForAdmin(userId: string): Promise<unknown[]> {
    await this.assertAdmin(userId);
    const { data, error } = await this.sb
      .from('reports')
      .select('id, listing_id, media_id, reason, detail, status, created_at, ilanlar(baslik)')
      .in('status', ['open', 'reviewing'])
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  }

  /** Admin: raporu çöz. actioned → ilanı kaldır + takedown. */
  async resolve(
    userId: string,
    id: string,
    body: { status: 'reviewing' | 'actioned' | 'dismissed'; resolver_note?: string | undefined },
  ): Promise<{ ok: true }> {
    await this.assertAdmin(userId);
    const { data: report } = await this.sb
      .from('reports')
      .select('listing_id')
      .eq('id', id)
      .maybeSingle();
    if (!report) throw new NotFoundException('Rapor bulunamadı');

    const { error } = await this.sb
      .from('reports')
      .update({
        status: body.status,
        resolver_note: body.resolver_note ?? null,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;

    if (body.status === 'actioned') {
      await this.takedown(report.listing_id as string, 'admin-action', 'admin', userId);
    }
    return { ok: true };
  }
}
