'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { adminApi, type Overview, type AuditEntry } from '../../lib/admin';
import { PageHeader, StatCard, Spinner, ErrorNote, fmtDate } from './ui';

export default function AdminOverview(): ReactElement {
  const [ov, setOv] = useState<Overview | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([adminApi.overview(), adminApi.audit().catch(() => [] as AuditEntry[])])
      .then(([o, a]) => {
        if (!alive) return;
        setOv(o);
        setAudit(a);
      })
      .catch((e) => alive && setErr((e as Error).message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <PageHeader eyebrow="Yönetim" title="Genel Bakış" />
      {loading && <Spinner />}
      {err && <ErrorNote>{err}</ErrorNote>}
      {ov && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))',
              gap: 14,
            }}
          >
            <StatCard
              label="Kullanıcı"
              value={ov.users.total.toLocaleString('tr-TR')}
              sub={`${ov.users.admins} admin · ${ov.users.suspended} askıda`}
            />
            <StatCard
              label="Yayındaki ilan"
              value={ov.listings.published.toLocaleString('tr-TR')}
            />
            <StatCard
              label="Bekleyen ilan"
              value={ov.listings.pending.toLocaleString('tr-TR')}
              sub="taslak / işleniyor"
            />
            <StatCard label="Kaldırılan ilan" value={ov.listings.removed.toLocaleString('tr-TR')} />
            <StatCard label="Açık rapor" value={ov.reportsOpen.toLocaleString('tr-TR')} />
          </div>

          <div className="a-card" style={{ marginTop: 28, overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--line)' }}>
              <h2 style={{ fontSize: 16 }}>Son işlemler</h2>
            </div>
            {audit.length === 0 ? (
              <div style={{ padding: 18, color: 'var(--faint)', fontSize: 14 }}>
                Henüz kayıt yok.
              </div>
            ) : (
              <table className="a-table">
                <thead>
                  <tr>
                    <th>İşlem</th>
                    <th>Hedef</th>
                    <th>Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{a.action}</td>
                      <td style={{ color: 'var(--sub)' }}>
                        {a.target_type
                          ? `${a.target_type} · ${(a.target_id ?? '').slice(0, 8)}`
                          : '—'}
                      </td>
                      <td style={{ color: 'var(--sub)' }}>{fmtDate(a.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  );
}
