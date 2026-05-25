import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../supabase/supabase.module.js';
import type { AuthedUser } from '../auth/jwt.guard.js';

const MANAGED_PROVIDERS = [
  { provider: 'groq', env: 'MANAGED_GROQ_KEY', label: 'Groq' },
  { provider: 'gemini', env: 'MANAGED_GEMINI_KEY', label: 'Gemini' },
  { provider: 'deepseek', env: 'MANAGED_DEEPSEEK_KEY', label: 'DeepSeek' },
  { provider: 'anthropic', env: 'MANAGED_ANTHROPIC_KEY', label: 'Claude' },
] as const;

const ROLES = ['individual', 'agent', 'dealer', 'admin'] as const;
const LISTING_STATUSES = ['draft', 'processing', 'published', 'paused', 'removed', 'rejected'];

/**
 * Admin paneli iş mantığı. Yetki her metodun başında DB rolü VEYA SUPER_ADMIN_EMAILS
 * allowlist'i ile doğrulanır (service-role client → RLS bypass). Mutasyonlar audit log'a yazılır.
 */
@Injectable()
export class AdminService {
  constructor(@Inject(SUPABASE) private readonly sb: SupabaseClient) {}

  private superEmails(): string[] {
    return (process.env.SUPER_ADMIN_EMAILS ?? '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }

  /** Throw etmez — /me için. Süper admin ise DB rolünü kendiliğinden admin'e çeker. */
  async isAdmin(user: AuthedUser): Promise<{ admin: boolean; superAdmin: boolean }> {
    if (user.email && this.superEmails().includes(user.email.toLowerCase())) {
      await this.sb.from('users').update({ role: 'admin' }).eq('id', user.id);
      return { admin: true, superAdmin: true };
    }
    const { data } = await this.sb.from('users').select('role').eq('id', user.id).maybeSingle();
    return { admin: (data as { role?: string } | null)?.role === 'admin', superAdmin: false };
  }

  private async assertAdmin(user: AuthedUser): Promise<boolean> {
    const { admin, superAdmin } = await this.isAdmin(user);
    if (!admin) throw new ForbiddenException('Yetki yok');
    return superAdmin;
  }

  private async assertSuperAdmin(user: AuthedUser): Promise<void> {
    const superAdmin = await this.assertAdmin(user);
    if (!superAdmin) throw new ForbiddenException('Bu işlem yalnız süper admin içindir');
  }

  private async audit(
    actor: string,
    action: string,
    targetType?: string,
    targetId?: string,
    meta: Record<string, unknown> = {},
  ): Promise<void> {
    await this.sb.from('admin_audit_log').insert({
      actor_user_id: actor,
      action,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      meta,
    });
  }

  private async count(table: string, build?: (q: any) => any): Promise<number> {
    let q = this.sb.from(table).select('*', { count: 'exact', head: true });
    if (build) q = build(q);
    const { count } = await q;
    return count ?? 0;
  }

  // ── Genel bakış ──
  async overview(user: AuthedUser) {
    await this.assertAdmin(user);
    const [users, admins, suspended, published, removed, pending, reportsOpen] = await Promise.all([
      this.count('users'),
      this.count('users', (q) => q.eq('role', 'admin')),
      this.count('users', (q) => q.not('suspended_at', 'is', null)),
      this.count('ilanlar', (q) => q.eq('status', 'published')),
      this.count('ilanlar', (q) => q.eq('status', 'removed')),
      this.count('ilanlar', (q) => q.in('status', ['draft', 'processing'])),
      this.count('reports', (q) => q.in('status', ['open', 'reviewing'])),
    ]);
    return {
      users: { total: users, admins, suspended },
      listings: { published, removed, pending },
      reportsOpen,
    };
  }

  async recentAudit(user: AuthedUser) {
    await this.assertAdmin(user);
    const { data, error } = await this.sb
      .from('admin_audit_log')
      .select('id, actor_user_id, action, target_type, target_id, meta, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  }

  // ── Kullanıcılar ──
  async listUsers(user: AuthedUser, q?: string, limit = 50) {
    await this.assertAdmin(user);
    let query = this.sb
      .from('users')
      .select('id, email, display_name, role, created_at, suspended_at')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 200));
    if (q) query = query.ilike('email', `%${q}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async updateUser(
    user: AuthedUser,
    id: string,
    body: { role?: string | undefined; suspended?: boolean | undefined },
  ): Promise<{ ok: true }> {
    await this.assertAdmin(user);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.role) {
      if (!ROLES.includes(body.role as (typeof ROLES)[number]))
        throw new BadRequestException('Geçersiz rol');
      patch.role = body.role;
    }
    if (typeof body.suspended === 'boolean') {
      patch.suspended_at = body.suspended ? new Date().toISOString() : null;
    }
    const { error } = await this.sb.from('users').update(patch).eq('id', id);
    if (error) throw error;
    await this.audit(user.id, 'user.update', 'user', id, patch);
    return { ok: true };
  }

  // ── İlan moderasyonu ──
  async listListings(user: AuthedUser, status?: string, q?: string, limit = 50) {
    await this.assertAdmin(user);
    let query = this.sb
      .from('ilanlar')
      .select('id, baslik, fiyat_tl, il, ilce, kategori, status, owner_user_id, created_at')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 200));
    if (status) {
      if (!LISTING_STATUSES.includes(status)) throw new BadRequestException('Geçersiz durum');
      query = query.eq('status', status);
    }
    if (q) query = query.ilike('baslik', `%${q}%`);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async setListingStatus(
    user: AuthedUser,
    id: string,
    status: 'removed' | 'published',
  ): Promise<{ ok: true }> {
    await this.assertAdmin(user);
    const { error } = await this.sb
      .from('ilanlar')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    if (status === 'removed') {
      await this.sb
        .from('takedowns')
        .insert({
          listing_id: id,
          reason: 'admin-action',
          source: 'admin',
          actor_user_id: user.id,
        });
    }
    await this.audit(
      user.id,
      status === 'removed' ? 'listing.takedown' : 'listing.restore',
      'listing',
      id,
    );
    return { ok: true };
  }

  // ── Raporlar ──
  async listReports(user: AuthedUser) {
    await this.assertAdmin(user);
    const { data, error } = await this.sb
      .from('reports')
      .select('id, listing_id, media_id, reason, detail, status, created_at, ilanlar(baslik)')
      .in('status', ['open', 'reviewing'])
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  }

  async resolveReport(
    user: AuthedUser,
    id: string,
    body: { status: 'reviewing' | 'actioned' | 'dismissed'; resolver_note?: string | undefined },
  ): Promise<{ ok: true }> {
    await this.assertAdmin(user);
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
      const listingId = (report as { listing_id: string }).listing_id;
      await this.sb.from('ilanlar').update({ status: 'removed' }).eq('id', listingId);
      await this.sb
        .from('takedowns')
        .insert({
          listing_id: listingId,
          reason: 'report-action',
          source: 'admin',
          actor_user_id: user.id,
        });
    }
    await this.audit(user.id, 'report.resolve', 'report', id, { status: body.status });
    return { ok: true };
  }

  // ── Admin yönetimi (yalnız süper admin) ──
  async listAdmins(user: AuthedUser) {
    await this.assertAdmin(user);
    const { data, error } = await this.sb
      .from('users')
      .select('id, email, display_name, role, created_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async addAdmin(user: AuthedUser, email: string): Promise<{ ok: true }> {
    await this.assertSuperAdmin(user);
    const { data: target } = await this.sb
      .from('users')
      .select('id')
      .ilike('email', email.trim())
      .maybeSingle();
    if (!target) throw new NotFoundException('Bu e-posta ile kayıtlı kullanıcı yok');
    const targetId = (target as { id: string }).id;
    const { error } = await this.sb
      .from('users')
      .update({ role: 'admin', updated_at: new Date().toISOString() })
      .eq('id', targetId);
    if (error) throw error;
    await this.audit(user.id, 'admin.add', 'user', targetId, { email });
    return { ok: true };
  }

  async removeAdmin(user: AuthedUser, id: string): Promise<{ ok: true }> {
    await this.assertSuperAdmin(user);
    if (id === user.id) throw new BadRequestException('Kendi admin yetkini kaldıramazsın');
    const { error } = await this.sb
      .from('users')
      .update({ role: 'individual', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    await this.audit(user.id, 'admin.remove', 'user', id);
    return { ok: true };
  }

  // ── Sağlayıcı / API yönetimi ──
  async listProviders(user: AuthedUser) {
    await this.assertAdmin(user);
    const managed = MANAGED_PROVIDERS.map((p) => ({
      provider: p.provider,
      label: p.label,
      configured: !!process.env[p.env],
    }));
    const { data, error } = await this.sb
      .from('platform_provider_keys')
      .select('id, provider, monthly_token_cap, is_active, notes, created_at')
      .order('created_at', { ascending: true });
    if (error) throw error;
    return { managed, keys: data ?? [] };
  }

  async updateProvider(
    user: AuthedUser,
    id: string,
    body: {
      is_active?: boolean | undefined;
      monthly_token_cap?: number | null | undefined;
      notes?: string | undefined;
    },
  ): Promise<{ ok: true }> {
    await this.assertSuperAdmin(user);
    const patch: Record<string, unknown> = {};
    if (typeof body.is_active === 'boolean') patch.is_active = body.is_active;
    if (body.monthly_token_cap !== undefined) patch.monthly_token_cap = body.monthly_token_cap;
    if (body.notes !== undefined) patch.notes = body.notes;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await this.sb.from('platform_provider_keys').update(patch).eq('id', id);
    if (error) throw error;
    await this.audit(user.id, 'provider.update', 'provider', id, patch);
    return { ok: true };
  }
}
