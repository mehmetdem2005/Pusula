'use client';

import { useState, type ReactElement } from 'react';
import Link from 'next/link';
import { getSupabaseBrowser } from '../../../lib/supabase';

export default function SignupPage(): ReactElement {
  const [form, setForm] = useState<{
    email: string;
    display_name: string;
    role: 'individual' | 'agent' | 'dealer';
  }>({
    email: '',
    display_name: '',
    role: 'individual',
  });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowser();
      const { error: err } = await supabase.auth.signInWithOtp({
        email: form.email,
        options: {
          data: { display_name: form.display_name, role: form.role },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (err) throw err;
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#0F1F4B] to-[#1a2d5e] px-6">
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
            <h2 className="mb-2 text-lg font-bold">Beta&apos;ya hoş geldin</h2>
            <p className="text-sm text-slate-600">
              <strong>{form.email}</strong> adresine onay bağlantısı yolladık. Tıkla, başla.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <h2 className="text-center text-xl font-bold">Beta&apos;ya Katıl</h2>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">İsim</span>
              <input
                type="text"
                required
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
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
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
                placeholder="ornek@pusula.tr"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Profil</span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2"
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
            <p className="mt-3 text-center text-xs text-slate-500">
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
          </form>
        )}
      </div>
    </main>
  );
}
