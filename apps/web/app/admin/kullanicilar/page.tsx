'use client';

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { adminApi, type AdminUser } from '../../../lib/admin';
import { PageHeader, Spinner, ErrorNote, Badge, fmtDate } from '../ui';

const ROLES = ['individual', 'agent', 'dealer', 'admin'];

export default function AdminUsers(): ReactElement {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback((query = '') => {
    setLoading(true);
    setErr(null);
    adminApi
      .users(query)
      .then(setRows)
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function mutate(id: string, body: { role?: string; suspended?: boolean }) {
    setBusy(id);
    setErr(null);
    try {
      await adminApi.updateUser(id, body);
      load(q);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Yönetim" title="Kullanıcılar" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
        style={{ display: 'flex', gap: 10, marginBottom: 18 }}
      >
        <input
          className="a-input"
          style={{ flex: 1, maxWidth: 360 }}
          placeholder="E-posta ara…"
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
                <th>Kullanıcı</th>
                <th>Rol</th>
                <th>Durum</th>
                <th>Kayıt</th>
                <th style={{ textAlign: 'right' }}>İşlem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => {
                const suspended = !!u.suspended_at;
                return (
                  <tr key={u.id} style={{ opacity: busy === u.id ? 0.5 : 1 }}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{u.email}</div>
                      {u.display_name && (
                        <div style={{ fontSize: 12, color: 'var(--faint)' }}>{u.display_name}</div>
                      )}
                    </td>
                    <td>
                      <select
                        className="a-select"
                        style={{ height: 32, fontSize: 13 }}
                        value={u.role}
                        disabled={busy === u.id}
                        onChange={(e) => mutate(u.id, { role: e.target.value })}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {suspended ? (
                        <Badge tone="red">Askıda</Badge>
                      ) : (
                        <Badge tone="green">Aktif</Badge>
                      )}
                    </td>
                    <td style={{ color: 'var(--sub)' }}>{fmtDate(u.created_at)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className={`a-btn-sm ${suspended ? 'a-btn-ghost' : 'a-btn-danger'}`}
                        disabled={busy === u.id}
                        onClick={() => mutate(u.id, { suspended: !suspended })}
                      >
                        {suspended ? 'Askıyı kaldır' : 'Askıya al'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ color: 'var(--faint)' }}>
                    Kullanıcı bulunamadı.
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
