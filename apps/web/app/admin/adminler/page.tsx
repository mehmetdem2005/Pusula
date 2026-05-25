'use client';

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { adminApi, type AdminRow } from '../../../lib/admin';
import { PageHeader, Spinner, ErrorNote, fmtDate } from '../ui';

export default function AdminAdmins(): ReactElement {
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [superAdmin, setSuperAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      adminApi.admins(),
      adminApi.me().catch(() => ({ admin: true, superAdmin: false })),
    ])
      .then(([a, m]) => {
        setRows(a);
        setSuperAdmin(m.superAdmin);
      })
      .catch((e) => setErr((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy('add');
    setErr(null);
    setNote(null);
    try {
      await adminApi.addAdmin(email.trim());
      setNote(`${email.trim()} admin yapıldı.`);
      setEmail('');
      load();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    setErr(null);
    try {
      await adminApi.removeAdmin(id);
      load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Yönetim" title="Adminler" />

      {superAdmin ? (
        <form onSubmit={add} style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <input
            className="a-input"
            style={{ flex: 1, maxWidth: 360 }}
            type="email"
            placeholder="Yeni admin e-postası…"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="a-btn" disabled={busy === 'add'}>
            Admin ekle
          </button>
        </form>
      ) : (
        <p style={{ color: 'var(--faint)', fontSize: 13, marginBottom: 18 }}>
          Admin ekleme/çıkarma yalnız süper admin yetkisindedir.
        </p>
      )}

      {note && (
        <div
          style={{
            background: 'var(--green-bg)',
            border: '1px solid var(--green-line)',
            color: 'var(--green)',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 14,
          }}
        >
          {note}
        </div>
      )}
      {err && <ErrorNote>{err}</ErrorNote>}

      {loading ? (
        <Spinner />
      ) : (
        <div className="a-card" style={{ overflow: 'hidden', marginTop: err || note ? 14 : 0 }}>
          <table className="a-table">
            <thead>
              <tr>
                <th>E-posta</th>
                <th>İsim</th>
                <th>Eklendi</th>
                {superAdmin && <th style={{ textAlign: 'right' }}>İşlem</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} style={{ opacity: busy === a.id ? 0.5 : 1 }}>
                  <td style={{ fontWeight: 600 }}>{a.email}</td>
                  <td style={{ color: 'var(--sub)' }}>{a.display_name ?? '—'}</td>
                  <td style={{ color: 'var(--sub)' }}>{fmtDate(a.created_at)}</td>
                  {superAdmin && (
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="a-btn-sm a-btn-danger"
                        disabled={busy === a.id}
                        onClick={() => remove(a.id)}
                      >
                        Yetkiyi kaldır
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={superAdmin ? 4 : 3} style={{ color: 'var(--faint)' }}>
                    Admin yok.
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
