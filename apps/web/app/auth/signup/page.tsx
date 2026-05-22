'use client';

import { useState, type ReactElement } from 'react';
import Link from 'next/link';
import { signUpPassword, logAudit } from '../../../lib/auth';
import { OAuthButtons } from '../../../components/auth/OAuthButtons';

export default function SignupPage(): ReactElement {
  const [form, setForm] = useState<{
    email: string;
    password: string;
    display_name: string;
    role: 'individual' | 'agent' | 'dealer';
  }>({ email: '', password: '', display_name: '', role: 'individual' });
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
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-2';

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0F1F4B] to-[#1a2d5e] px-6 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <Link href="/" className="text-2xl font-bold text-[#0F1F4B]">
            🧭 Pusula
          </Link>
          <p className="mt-1 text-sm font-semibold text-[#D4A22E]">Karar verirken kaybolma.</p>
        </div>

        {sent ? (
          <div className="py-8 text-center">
            <div className="mb-3 text-4xl" aria-hidden>
              🎉
            </div>
            <h2 className="mb-2 text-lg font-bold">Son bir adım</h2>
            <p className="text-sm text-slate-600">
              <strong>{form.email}</strong> adresine onay bağlantısı yolladık. Tıkla, hesabın
              aktifleşsin.
            </p>
          </div>
        ) : (
          <>
            <h2 className="mb-4 text-center text-xl font-bold">Beta&apos;ya Katıl</h2>
            <form onSubmit={onSubmit} className="space-y-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">İsim</span>
                <input
                  type="text"
                  required
                  value={form.display_name}
                  onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">E-posta</span>
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
                <span className="text-sm font-medium text-slate-700">Şifre (min 8)</span>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className={inputCls}
                  placeholder="••••••••"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Profil</span>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
                  className={`${inputCls} bg-white`}
                >
                  <option value="individual">Bireysel (alıcı / yatırımcı)</option>
                  <option value="agent">Emlakçı</option>
                  <option value="dealer">Galerici</option>
                </select>
              </label>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-[#D4A22E] py-2.5 font-bold text-[#0F1F4B] disabled:opacity-60"
              >
                {loading ? 'Hesap oluşturuluyor...' : 'Beta’ya Katıl'}
              </button>
            </form>

            <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
              <span className="h-px flex-1 bg-slate-200" /> veya{' '}
              <span className="h-px flex-1 bg-slate-200" />
            </div>
            <OAuthButtons />

            <p className="mt-4 text-center text-xs text-slate-500">
              Hesabın var mı?{' '}
              <Link href="/auth/login" className="text-sky-600 underline">
                Giriş yap
              </Link>
            </p>
            <p className="mt-2 text-center text-[10px] text-slate-400">
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
