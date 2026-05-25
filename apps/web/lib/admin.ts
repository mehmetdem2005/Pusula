'use client';

import { authedFetch } from './api';

export interface AdminMe {
  admin: boolean;
  superAdmin: boolean;
}
export interface Overview {
  users: { total: number; admins: number; suspended: number };
  listings: { published: number; removed: number; pending: number };
  reportsOpen: number;
}
export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  created_at: string;
  suspended_at: string | null;
}
export interface AdminListing {
  id: string;
  baslik: string;
  fiyat_tl: number;
  il: string | null;
  ilce: string | null;
  kategori: string;
  status: string;
  owner_user_id: string | null;
  created_at: string;
}
export interface AdminReport {
  id: string;
  listing_id: string;
  reason: string;
  detail: string | null;
  status: string;
  created_at: string;
  ilanlar?: { baslik: string } | null;
}
export interface AdminRow {
  id: string;
  email: string;
  display_name: string | null;
  role: string;
  created_at: string;
}
export interface Providers {
  managed: { provider: string; label: string; configured: boolean }[];
  keys: {
    id: string;
    provider: string;
    monthly_token_cap: number | null;
    is_active: boolean;
    notes: string | null;
    created_at: string;
  }[];
}
export interface AuditEntry {
  id: string;
  actor_user_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

interface Ok {
  ok: true;
}

export const adminApi = {
  me: () => authedFetch<AdminMe>('/v1/admin/me'),
  overview: () => authedFetch<Overview>('/v1/admin/overview'),
  audit: () => authedFetch<AuditEntry[]>('/v1/admin/audit'),

  users: (q = '') =>
    authedFetch<AdminUser[]>(`/v1/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  updateUser: (id: string, body: { role?: string; suspended?: boolean }) =>
    authedFetch<Ok>(`/v1/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  listings: (status = '', q = '') => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (q) params.set('q', q);
    const qs = params.toString();
    return authedFetch<AdminListing[]>(`/v1/admin/listings${qs ? `?${qs}` : ''}`);
  },
  takedown: (id: string) =>
    authedFetch<Ok>(`/v1/admin/listings/${id}/takedown`, { method: 'POST' }),
  restore: (id: string) => authedFetch<Ok>(`/v1/admin/listings/${id}/restore`, { method: 'POST' }),

  reports: () => authedFetch<AdminReport[]>('/v1/admin/reports'),
  resolveReport: (id: string, body: { status: string; resolver_note?: string }) =>
    authedFetch<Ok>(`/v1/admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  admins: () => authedFetch<AdminRow[]>('/v1/admin/admins'),
  addAdmin: (email: string) =>
    authedFetch<Ok>('/v1/admin/admins', { method: 'POST', body: JSON.stringify({ email }) }),
  removeAdmin: (id: string) => authedFetch<Ok>(`/v1/admin/admins/${id}`, { method: 'DELETE' }),

  providers: () => authedFetch<Providers>('/v1/admin/providers'),
  updateProvider: (
    id: string,
    body: { is_active?: boolean; monthly_token_cap?: number | null; notes?: string },
  ) =>
    authedFetch<Ok>(`/v1/admin/providers/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
};
