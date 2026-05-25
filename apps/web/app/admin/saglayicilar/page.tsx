'use client';

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { adminApi, type Providers } from '../../../lib/admin';
import { PageHeader, Spinner, ErrorNote, Badge } from '../ui';

export default function AdminProviders(): ReactElement {
  const [data, setData] = useState<Providers | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setErr(null);
    adminApi
      .providers()
      .then(setData)
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(id: string, active: boolean) {
    setBusy(id);
    setErr(null);
    try {
      await adminApi.updateProvider(id, { is_active: active });
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Yönetim" title="Sağlayıcılar & API" />
      {err && <ErrorNote>{err}</ErrorNote>}
      {loading ? (
        <Spinner />
      ) : data ? (
        <>
          <h2 style={{ fontSize: 15, color: 'var(--sub)', margin: '4px 0 12px' }}>
            Platform anahtarları (env)
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
              gap: 12,
            }}
          >
            {data.managed.map((m) => (
              <div key={m.provider} className="a-card" style={{ padding: '16px 18px' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span style={{ fontWeight: 600 }}>{m.label}</span>
                  {m.configured ? (
                    <Badge tone="green">Bağlı</Badge>
                  ) : (
                    <Badge tone="gray">Yok</Badge>
                  )}
                </div>
                <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 6 }}>
                  {m.provider}
                </div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 15, color: 'var(--sub)', margin: '28px 0 12px' }}>
            Havuz anahtar kayıtları
          </h2>
          <div className="a-card" style={{ overflow: 'hidden' }}>
            <table className="a-table">
              <thead>
                <tr>
                  <th>Sağlayıcı</th>
                  <th>Aylık token tavanı</th>
                  <th>Not</th>
                  <th>Durum</th>
                  <th style={{ textAlign: 'right' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {data.keys.map((k) => (
                  <tr key={k.id} style={{ opacity: busy === k.id ? 0.5 : 1 }}>
                    <td style={{ fontWeight: 600 }}>{k.provider}</td>
                    <td className="tnum" style={{ color: 'var(--sub)' }}>
                      {k.monthly_token_cap != null
                        ? k.monthly_token_cap.toLocaleString('tr-TR')
                        : 'sınırsız'}
                    </td>
                    <td style={{ color: 'var(--sub)' }}>{k.notes ?? '—'}</td>
                    <td>
                      {k.is_active ? (
                        <Badge tone="green">Aktif</Badge>
                      ) : (
                        <Badge tone="gray">Pasif</Badge>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="a-btn-sm a-btn-ghost"
                        disabled={busy === k.id}
                        onClick={() => toggle(k.id, !k.is_active)}
                      >
                        {k.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                      </button>
                    </td>
                  </tr>
                ))}
                {data.keys.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ color: 'var(--faint)' }}>
                      Havuz anahtar kaydı yok. Sağlayıcılar env (yukarıda) ile çalışıyor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  );
}
