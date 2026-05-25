'use client';

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { adminApi, type AdminListing } from '../../../lib/admin';
import { PageHeader, Spinner, ErrorNote, ListingStatus, fmtPrice, fmtDate } from '../ui';

const FILTERS: { label: string; value: string }[] = [
  { label: 'Tümü', value: '' },
  { label: 'Yayında', value: 'published' },
  { label: 'Durduruldu', value: 'paused' },
  { label: 'Taslak', value: 'draft' },
  { label: 'Kaldırıldı', value: 'removed' },
  { label: 'Reddedildi', value: 'rejected' },
];

export default function AdminListings(): ReactElement {
  const [rows, setRows] = useState<AdminListing[]>([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback((st: string, query: string) => {
    setLoading(true);
    setErr(null);
    adminApi
      .listings(st, query)
      .then(setRows)
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(status, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function act(row: AdminListing) {
    setBusy(row.id);
    setErr(null);
    try {
      if (row.status === 'removed') await adminApi.restore(row.id);
      else await adminApi.takedown(row.id);
      load(status, q);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Yönetim" title="İlan moderasyonu" />
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`a-chip ${status === f.value ? 'on' : ''}`}
            onClick={() => setStatus(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(status, q);
        }}
        style={{ display: 'flex', gap: 10, marginBottom: 18 }}
      >
        <input
          className="a-input"
          style={{ flex: 1, maxWidth: 360 }}
          placeholder="Başlıkta ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="a-btn-ghost">
          Ara
        </button>
      </form>

      {err && <ErrorNote>{err}</ErrorNote>}
      {loading ? (
        <Spinner />
      ) : (
        <div className="a-card" style={{ overflow: 'hidden', marginTop: err ? 14 : 0 }}>
          <table className="a-table">
            <thead>
              <tr>
                <th>İlan</th>
                <th>Fiyat</th>
                <th>Konum</th>
                <th>Durum</th>
                <th style={{ textAlign: 'right' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.id} style={{ opacity: busy === l.id ? 0.5 : 1 }}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{l.baslik}</div>
                    <div style={{ fontSize: 12, color: 'var(--faint)' }}>
                      {l.kategori} · {fmtDate(l.created_at)}
                    </div>
                  </td>
                  <td className="tnum" style={{ fontWeight: 600 }}>
                    {fmtPrice(l.fiyat_tl)}
                  </td>
                  <td style={{ color: 'var(--sub)' }}>
                    {[l.il, l.ilce].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td>
                    <ListingStatus status={l.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className={`a-btn-sm ${l.status === 'removed' ? 'a-btn-ghost' : 'a-btn-danger'}`}
                      disabled={busy === l.id}
                      onClick={() => act(l)}
                    >
                      {l.status === 'removed' ? 'Geri al' : 'Kaldır'}
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: 'var(--faint)' }}>
                    İlan bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
