'use client';

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { getSupabaseBrowser } from '../../lib/supabase';
import { updatePassword, logAudit } from '../../lib/auth';

interface Factor {
  id: string;
  friendly_name?: string;
  status: string;
}
interface AuditRow {
  id: number;
  event: string;
  provider: string | null;
  created_at: string;
}

const card = 'rounded-lg bg-white p-6';
const input = 'w-full rounded-md border border-slate-300 px-3 py-2 text-sm';
const btn =
  'rounded-md bg-[#0F1F4B] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60';

export function AccountSecurity(): ReactElement {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('individual');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [factors, setFactors] = useState<Factor[]>([]);
  const [enroll, setEnroll] = useState<{ id: string; qr: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const flash = (m: string) => {
    setMsg(m);
    setErr(null);
  };
  const fail = (e: unknown) => {
    setErr((e as Error).message);
    setMsg(null);
  };

  const refresh = useCallback(async () => {
    const sb = getSupabaseBrowser();
    const { data: u } = await sb.auth.getUser();
    if (u.user) {
      setEmail(u.user.email ?? '');
      const meta = u.user.user_metadata as { display_name?: string; role?: string };
      setDisplayName(meta.display_name ?? '');
      setRole(meta.role ?? 'individual');
    }
    const { data: f } = await sb.auth.mfa.listFactors();
    setFactors((f?.totp ?? []) as Factor[]);
    const { data: a } = await sb
      .from('auth_audit_log')
      .select('id,event,provider,created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    setAudit((a ?? []) as AuditRow[]);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function saveProfile() {
    try {
      const sb = getSupabaseBrowser();
      const { data: u } = await sb.auth.getUser();
      if (!u.user) return;
      const { error } = await sb
        .from('users')
        .update({ display_name: displayName, role })
        .eq('id', u.user.id);
      if (error) throw error;
      await sb.auth.updateUser({ data: { display_name: displayName, role } });
      flash('Profil güncellendi.');
    } catch (e) {
      fail(e);
    }
  }

  async function changeEmail() {
    try {
      const { error } = await getSupabaseBrowser().auth.updateUser({ email: newEmail });
      if (error) throw error;
      flash('Onay e-postası gönderildi (hem eski hem yeni adrese).');
    } catch (e) {
      fail(e);
    }
  }

  async function changePassword() {
    try {
      if (newPassword.length < 8) throw new Error('Şifre en az 8 karakter olmalı.');
      const { error } = await updatePassword(newPassword);
      if (error) throw error;
      setNewPassword('');
      await logAudit('password_change', {});
      flash('Şifre güncellendi.');
    } catch (e) {
      fail(e);
    }
  }

  async function startEnroll() {
    try {
      const { data, error } = await getSupabaseBrowser().auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: `Authenticator-${Date.now()}`,
      });
      if (error) throw error;
      setEnroll({ id: data.id, qr: data.totp.qr_code });
    } catch (e) {
      fail(e);
    }
  }

  async function confirmEnroll() {
    if (!enroll) return;
    try {
      const { error } = await getSupabaseBrowser().auth.mfa.challengeAndVerify({
        factorId: enroll.id,
        code: mfaCode,
      });
      if (error) throw error;
      setEnroll(null);
      setMfaCode('');
      await logAudit('mfa_enrolled', {});
      flash('İki adımlı doğrulama etkin.');
      await refresh();
    } catch (e) {
      fail(e);
    }
  }

  async function removeFactor(id: string) {
    try {
      const { error } = await getSupabaseBrowser().auth.mfa.unenroll({ factorId: id });
      if (error) throw error;
      await refresh();
      flash('Faktör kaldırıldı.');
    } catch (e) {
      fail(e);
    }
  }

  async function signOutEverywhere() {
    await getSupabaseBrowser().auth.signOut({ scope: 'global' });
    window.location.href = '/auth/login';
  }

  async function deleteAccount() {
    if (!confirm('Hesabın ve tüm verilerin kalıcı olarak silinecek. Emin misin?')) return;
    try {
      const sb = getSupabaseBrowser();
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
      const res = await fetch(`${base}/v1/account`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Silme başarısız: ${res.status}`);
      await sb.auth.signOut();
      window.location.href = '/';
    } catch (e) {
      fail(e);
    }
  }

  return (
    <div className="space-y-4">
      {(msg || err) && (
        <p className={`text-sm ${err ? 'text-red-600' : 'text-green-600'}`}>{err ?? msg}</p>
      )}

      <section className={card}>
        <h2 className="mb-4 text-lg font-semibold">Profil</h2>
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm text-slate-600">İsim</span>
            <input
              className={input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600">Profil tipi</span>
            <select
              className={`${input} bg-white`}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="individual">Bireysel</option>
              <option value="agent">Emlakçı</option>
              <option value="dealer">Galerici</option>
            </select>
          </label>
          <button type="button" className={btn} onClick={() => void saveProfile()}>
            Profili Kaydet
          </button>
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-4 text-lg font-semibold">E-posta & Şifre</h2>
        <p className="mb-2 text-sm text-slate-500">Mevcut e-posta: {email || '—'}</p>
        <div className="mb-4 flex gap-2">
          <input
            className={input}
            type="email"
            placeholder="Yeni e-posta"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />
          <button
            type="button"
            className={btn}
            disabled={!newEmail}
            onClick={() => void changeEmail()}
          >
            Değiştir
          </button>
        </div>
        <div className="flex gap-2">
          <input
            className={input}
            type="password"
            placeholder="Yeni şifre (min 8)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            type="button"
            className={btn}
            disabled={!newPassword}
            onClick={() => void changePassword()}
          >
            Güncelle
          </button>
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-4 text-lg font-semibold">İki Adımlı Doğrulama (2FA)</h2>
        {factors.length > 0 ? (
          <div className="space-y-2">
            {factors.map((f) => (
              <div
                key={f.id}
                className="flex items-center justify-between rounded border px-3 py-2 text-sm"
              >
                <span>
                  {f.friendly_name ?? 'TOTP'} · <span className="text-green-600">{f.status}</span>
                </span>
                <button
                  type="button"
                  className="text-xs text-red-600 underline"
                  onClick={() => void removeFactor(f.id)}
                >
                  Kaldır
                </button>
              </div>
            ))}
          </div>
        ) : enroll ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Authenticator uygulamasıyla QR'ı tarat:</p>
            <img src={enroll.qr} alt="TOTP QR" className="h-40 w-40" />
            <div className="flex gap-2">
              <input
                className={input}
                inputMode="numeric"
                placeholder="6 haneli kod"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
              />
              <button type="button" className={btn} onClick={() => void confirmEnroll()}>
                Doğrula
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className={btn} onClick={() => void startEnroll()}>
            2FA Ekle
          </button>
        )}
      </section>

      <section className={card}>
        <h2 className="mb-4 text-lg font-semibold">Son Aktivite</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-slate-500">Kayıt yok.</p>
        ) : (
          <ul className="space-y-1 text-sm text-slate-600">
            {audit.map((a) => (
              <li key={a.id} className="flex justify-between">
                <span>
                  {a.event}
                  {a.provider ? ` · ${a.provider}` : ''}
                </span>
                <span className="text-slate-400">
                  {new Date(a.created_at).toLocaleString('tr-TR')}
                </span>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="mt-4 rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          onClick={() => void signOutEverywhere()}
        >
          Tüm cihazlardan çıkış yap
        </button>
      </section>

      <section className={card}>
        <h2 className="mb-2 text-lg font-semibold text-red-700">Tehlikeli Bölge</h2>
        <p className="mb-3 text-sm text-slate-600">
          KVKK politikamızı{' '}
          <a href="/legal/kvkk" className="text-sky-600 underline">
            buradan
          </a>{' '}
          okuyabilirsin.
        </p>
        <button
          type="button"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
          onClick={() => void deleteAccount()}
        >
          Hesabımı Sil
        </button>
      </section>
    </div>
  );
}
