'use client';

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { adminApi, type AdminReport } from '../../../lib/admin';
import { PageHeader, Spinner, ErrorNote, Badge, REASON_TR, fmtDate } from '../ui';

export default function AdminReports(): ReactElement {
  const [rows, setRows] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setErr(null);
    adminApi
      .reports()
      .then(setRows)
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(id: string, status: 'actioned' | 'dismissed') {
    setBusy(id);
    setErr(null);
    try {
      await adminApi.resolveReport(id, { status });
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Yönetim" title="Şikâyet kuyruğu" />
      {err && <ErrorNote>{err}</ErrorNote>}
      {loading ? (
        <Spinner />
      ) : (
        <div className="a-card" style={{ overflow: 'hidden', marginTop: err ? 14 : 0 }}>
          <table className="a-table">
            <thead>
              <tr>
                <th>İlan</th>
                <th>Sebep</th>
                <th>Detay</th>
                <th>Tarih</th>
                <th style={{ textAlign: 'right' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={{ opacity: busy === r.id ? 0.5 : 1 }}>
                  <td style={{ fontWeight: 600 }}>
                    {r.ilanlar?.baslik ?? r.listing_id.slice(0, 8)}
                  </td>
                  <td>
                    <Badge tone="amber">{REASON_TR[r.reason] ?? r.reason}</Badge>
                  </td>
                  <td style={{ color: 'var(--sub)', maxWidth: 280 }}>{r.detail ?? '—'}</td>
                  <td style={{ color: 'var(--sub)' }}>{fmtDate(r.created_at)}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      className="a-btn-sm a-btn-ghost"
                      style={{ marginRight: 8 }}
                      disabled={busy === r.id}
                      onClick={() => resolve(r.id, 'dismissed')}
                    >
                      Reddet
                    </button>
                    <button
                      type="button"
                      className="a-btn-sm a-btn-danger"
                      disabled={busy === r.id}
                      onClick={() => resolve(r.id, 'actioned')}
                    >
                      İlanı kaldır
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: 'var(--faint)' }}>
                    Açık şikâyet yok.
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
