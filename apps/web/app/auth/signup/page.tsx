'use client';

import { useState, type ReactElement } from 'react';
import Link from 'next/link';
import { getSupabaseBrowser } from '../../../lib/supabase';

export default function SignupPage(): ReactElement {
  const [form, setForm] = useState<{ email: string; display_name: string; role: 'individual' | 'agent' | 'dealer' }>({
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
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#0F1F4B] to-[#1a2d5e] px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-6">
          <Link href="/" className="text-2xl font-bold text-[#0F1F4B]">
            🧭 Pusula
          </Link>
          <p className="text-sm text-[#D4A22E] font-semibold mt-1">Karar verirken kaybolma.</p>
        </div>

        {sent ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-3" aria-hidden>🎉</div>
            <h2 className="text-lg font-bold mb-2">Beta&apos;ya hoş geldin</h2>
            <p className="text-sm text-slate-600">
              <strong>{form.email}</strong> adresine onay bağlantısı yolladık. Tıkla, başla.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-center">Beta&apos;ya Katıl</h2>

            <label className="block">
              <span className="text-sm text-slate-700 font-medium">İsim</span>
              <input
                type="text"
                required
                value={form.display_name}
                onChange={(e) => setForm({ ...form, display_name: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-700 font-medium">E-posta</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md"
                placeholder="ornek@pusula.tr"
              />
            </label>
            <label className="block">
              <span className="text-sm text-slate-700 font-medium">Profil</span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
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
              className="w-full bg-[#D4A22E] text-[#0F1F4B] py-2.5 rounded-md font-bold disabled:opacity-60"
            >
              {loading ? 'Hesap oluşturuluyor...' : 'Beta’ya Katıl'}
            </button>
            <p className="text-xs text-center text-slate-500 mt-3">
              Hesabın var mı?{' '}
              <Link href="/auth/login" className="text-sky-600 underline">
                Giriş yap
              </Link>
            </p>
            <p className="text-[10px] text-center text-slate-400 mt-2">
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
