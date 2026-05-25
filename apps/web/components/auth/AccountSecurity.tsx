'use client';

import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { getSupabaseBrowser } from '../../lib/supabase';
import { updatePassword, logAudit, friendlyAuthError } from '../../lib/auth';
import { PasswordInput } from './PasswordInput';

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

const card = 'rounded-2xl border border-line bg-panel p-6';
const input =
  'w-full rounded-lg border border-line bg-panel-soft px-3 py-2 text-sm text-fg placeholder:text-fg-faint focus:border-brand focus:outline-none';
const btn =
  'press rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const h2 = 'font-display text-fg mb-4 text-lg font-bold';

export function AccountSecurity(): ReactElement {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('individual');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [busy, setBusy] = useState(false);
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
    setErr(friendlyAuthError((e as Error).message));
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
    if (!confirm(`E-posta ${newEmail} olarak değiştirilecek. Onay maili gelecek. Devam?`)) return;
    setBusy(true);
    try {
      const { error } = await getSupabaseBrowser().auth.updateUser({ email: newEmail });
      if (error) throw error;
      flash('Onay e-postası gönderildi (hem eski hem yeni adrese).');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    setBusy(true);
    try {
      if (newPassword.length < 8) throw new Error('Şifre en az 8 karakter olmalı.');
      if (newPassword !== newPasswordConfirm) throw new Error('Şifreler eşleşmiyor.');
      const { error } = await updatePassword(newPassword);
      if (error) throw error;
      setNewPassword('');
      setNewPasswordConfirm('');
      await logAudit('password_change', {});
      flash('Şifre güncellendi.');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
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
    if (!confirm('İki adımlı doğrulamayı kaldırmak hesabını daha az güvenli yapar. Emin misin?'))
      return;
    try {
      const { error } = await getSupabaseBrowser().auth.mfa.unenroll({ factorId: id });
      if (error) throw error;
      await refresh();
      flash('Faktör kaldırıldı.');
    } catch (e) {
      fail(e);
    }
  }

  async function signOut() {
    await getSupabaseBrowser().auth.signOut();
    window.location.href = '/auth/login';
  }

  async function signOutEverywhere() {
    if (!confirm('Tüm cihazlardaki oturumların kapatılacak. Devam?')) return;
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
        <p className="text-sm" style={{ color: err ? 'var(--c-danger)' : 'var(--kelepir)' }}>
          {err ?? msg}
        </p>
      )}

      <section className={card}>
        <h2 className={h2}>Profil</h2>
        <div className="space-y-3">
          <label className="block">
            <span className="text-fg-dim text-sm">İsim</span>
            <input
              className={input}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="text-fg-dim text-sm">Profil tipi</span>
            <select className={input} value={role} onChange={(e) => setRole(e.target.value)}>
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
        <h2 className={h2}>E-posta & Şifre</h2>
        <p className="text-fg-faint mb-2 text-sm">Mevcut e-posta: {email || '—'}</p>
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
            disabled={!newEmail || busy}
            onClick={() => void changeEmail()}
          >
            Değiştir
          </button>
        </div>
        <div className="space-y-2">
          <PasswordInput
            className={input}
            autoComplete="new-password"
            minLength={8}
            placeholder="Yeni şifre (min 8)"
            value={newPassword}
            onChange={setNewPassword}
          />
          <PasswordInput
            className={input}
            autoComplete="new-password"
            placeholder="Yeni şifre (tekrar)"
            value={newPasswordConfirm}
            onChange={setNewPasswordConfirm}
          />
          <button
            type="button"
            className={btn}
            disabled={!newPassword || busy}
            onClick={() => void changePassword()}
          >
            Şifreyi Güncelle
          </button>
        </div>
      </section>

      <section className={card}>
        <h2 className={h2}>İki Adımlı Doğrulama (2FA)</h2>
        {factors.length > 0 ? (
          <div className="space-y-2">
            {factors.map((f) => (
              <div
                key={f.id}
                className="border-line flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span className="text-fg-dim">
                  {f.friendly_name ?? 'TOTP'} ·{' '}
                  <span style={{ color: 'var(--kelepir)' }}>{f.status}</span>
                </span>
                <button
                  type="button"
                  className="text-danger text-xs underline"
                  onClick={() => void removeFactor(f.id)}
                >
                  Kaldır
                </button>
              </div>
            ))}
          </div>
        ) : enroll ? (
          <div className="space-y-3">
            <p className="text-fg-dim text-sm">Authenticator uygulamasıyla QR&apos;ı tarat:</p>
            <img src={enroll.qr} alt="TOTP QR" className="h-40 w-40 rounded-lg bg-white p-1" />
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
        <h2 className={h2}>Son Aktivite</h2>
        {audit.length === 0 ? (
          <p className="text-fg-faint text-sm">Kayıt yok.</p>
        ) : (
          <ul className="text-fg-dim space-y-1 text-sm">
            {audit.map((a) => (
              <li key={a.id} className="flex justify-between">
                <span>
                  {a.event}
                  {a.provider ? ` · ${a.provider}` : ''}
                </span>
                <span className="text-fg-faint">
                  {new Date(a.created_at).toLocaleString('tr-TR')}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className="press border-line text-fg rounded-lg border px-4 py-2 text-sm font-semibold"
            onClick={() => void signOut()}
          >
            Çıkış yap
          </button>
          <button
            type="button"
            className="press text-fg-dim rounded-lg px-4 py-2 text-sm font-medium underline"
            onClick={() => void signOutEverywhere()}
          >
            Tüm cihazlardan çıkış
          </button>
        </div>
      </section>

      <section className={card}>
        <h2 className="text-danger font-display mb-2 text-lg font-bold">Tehlikeli Bölge</h2>
        <p className="text-fg-dim mb-3 text-sm">
          KVKK politikamızı{' '}
          <a href="/legal/kvkk" className="text-brand underline">
            buradan
          </a>{' '}
          okuyabilirsin.
        </p>
        <button
          type="button"
          className="press border-danger text-danger rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
          onClick={() => void deleteAccount()}
        >
          Hesabımı Sil
        </button>
      </section>
    </div>
  );
}
