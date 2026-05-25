'use client';

import { authedFetch } from './api';

export interface ListSummary {
  id: string;
  name: string;
  is_default: boolean;
  item_count: number;
}

export interface Skor {
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

export interface ListDetail {
  id: string;
  name: string;
  is_default: boolean;
  items: ListItem[];
}

export const getLists = (): Promise<ListSummary[]> => authedFetch<ListSummary[]>('/v1/lists');

export const createList = (name: string): Promise<{ id: string; name: string }> =>
  authedFetch('/v1/lists', { method: 'POST', body: JSON.stringify({ name }) });

export const deleteList = (id: string): Promise<{ ok: true }> =>
  authedFetch(`/v1/lists/${id}`, { method: 'DELETE' });

export const getListDetail = (id: string, qs = ''): Promise<ListDetail> =>
  authedFetch<ListDetail>(`/v1/lists/${id}${qs ? `?${qs}` : ''}`);

export const removeItem = (id: string, ilanId: string): Promise<{ ok: true }> =>
  authedFetch(`/v1/lists/${id}/items/${ilanId}`, { method: 'DELETE' });

export const analyzeList = (
  id: string,
  qs = '',
): Promise<{ ranking: ListItem[]; commentary: string }> =>
  authedFetch(`/v1/lists/${id}/analyze${qs ? `?${qs}` : ''}`, { method: 'POST' });
