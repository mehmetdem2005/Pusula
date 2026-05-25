'use client';

import { useState, type ReactElement } from 'react';
import Link from 'next/link';
import { signUpPassword, logAudit, friendlyAuthError } from '../../../lib/auth';
import { OAuthButtons } from '../../../components/auth/OAuthButtons';
import { PasswordInput } from '../../../components/auth/PasswordInput';

export default function SignupPage(): ReactElement {
  const [form, setForm] = useState<{
    email: string;
    password: string;
    confirm: string;
    display_name: string;
    role: 'individual' | 'agent' | 'dealer';
  }>({ email: '', password: '', confirm: '', display_name: '', role: 'individual' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (form.password.length < 8) {
        throw new Error('Şifre en az 8 karakter olmalı.');
      }
      if (form.password !== form.confirm) {
        throw new Error('Şifreler eşleşmiyor.');
      }
      const { data, error: err } = await signUpPassword(form.email, form.password, {
        display_name: form.display_name,
        role: form.role,
      });
      if (err) throw err;
      if (data.session) {
        await logAudit('signup', { method: 'password' });
        window.location.href = '/dashboard';
        return;
      }
      setSent(true);
    } catch (err) {
      setError(friendlyAuthError((err as Error).message));
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'mt-1 w-full rounded-card-sm border border-hairline-strong bg-paper px-3 py-2 text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy';

  return (
    <main className="bg-paper text-ink flex min-h-screen items-center justify-center px-6 py-10">
      <div className="rounded-card-lg border-hairline bg-surface shadow-card w-full max-w-sm border p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <Link href="/" className="brand !text-2xl">
            <span className="brand-mark" aria-hidden="true" />
            <span>Pusula</span>
          </Link>
          <p className="text-muted mt-2 text-xs uppercase tracking-wider">
            Karar verirken kaybolma
          </p>
        </div>

        {sent ? (
          <div className="py-8 text-center">
            <div className="mb-3 text-4xl" aria-hidden>
              🎉
            </div>
            <h2 className="text-navy mb-2 font-serif text-xl">Son bir adım</h2>
            <p className="text-ink-3 text-sm">
              <strong>{form.email}</strong> adresine onay bağlantısı yolladık. Tıkla, hesabın
              aktifleşsin.
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-navy mb-4 text-center font-serif text-2xl">Beta&apos;ya Katıl</h2>
            <form onSubmit={onSubmit} className="space-y-3">
              <label className="block">
                <span className="text-ink-2 text-sm font-medium">İsim</span>
                <input
                  type="text"
                  required
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="text-ink-2 text-sm font-medium">E-posta</span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls}
                  placeholder="ornek@pusula.tr"
                />
              </label>
              <label className="block">
                <span className="text-ink-2 text-sm font-medium">Şifre (min 8)</span>
                <PasswordInput
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(v) => setForm({ ...form, password: v })}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="text-ink-2 text-sm font-medium">Şifre (tekrar)</span>
                <PasswordInput
                  required
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={(v) => setForm({ ...form, confirm: v })}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="text-ink-2 text-sm font-medium">Profil</span>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
                  className={`${inputCls}`}
                >
                  <option value="individual">Bireysel (alıcı / yatırımcı)</option>
                  <option value="agent">Emlakçı</option>
                  <option value="dealer">Galerici</option>
                </select>
              </label>

              {error && <p className="text-band-asiri text-sm">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-gold w-full disabled:opacity-60"
              >
                {loading ? 'Hesap oluşturuluyor...' : 'Beta’ya Katıl'}
              </button>
            </form>

            <div className="text-muted my-4 flex items-center gap-3 text-xs">
              <span className="bg-hairline h-px flex-1" /> veya{' '}
              <span className="bg-hairline h-px flex-1" />
            </div>
            <OAuthButtons />

            <p className="text-muted mt-4 text-center text-xs">
              Hesabın var mı?{' '}
              <Link href="/auth/login" className="text-navy hover:text-gold-deep underline">
                Giriş yap
              </Link>
            </p>
            <p className="text-muted mt-2 text-center text-[10px]">
              Devam ederek{' '}
              <Link href="/legal/kullanim" className="underline">
                Kullanım Şartları
              </Link>{' '}
              ve{' '}
              <Link href="/legal/kvkk" className="underline">
                KVKK
              </Link>{' '}
              metnini kabul ediyorsun.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
