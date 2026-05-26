'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { getSupabaseBrowserClient } from '../../lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = getSupabaseBrowserClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/library`,
      },
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Email kontrol et — onay linki gönderildi.')
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-sm w-full">
        <Link href="/" className="block text-center mb-10">
          <h1 className="font-serif text-5xl text-ink-900">Kavra</h1>
          <p className="text-xs text-slate-500 italic mt-1">Kavra. Her şeyi.</p>
        </Link>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <h2 className="font-serif text-2xl text-ink-900 mb-1">Kayıt</h2>
          <p className="text-xs text-slate-500 mb-5">
            Free tier — 3 defter, 5 kaynak, 10 AI üretim/ay. Kart bilgisi gerekmez.
          </p>

          <form onSubmit={handleSignup}>
            <input
              type="text"
              placeholder="Adın"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-cream-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm mb-3"
            />
            <input
              type="email"
              placeholder="email@adres.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-cream-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm mb-3"
            />
            <input
              type="password"
              placeholder="Şifre (en az 6 karakter)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-cream-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm mb-3"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink-900 text-cream-50 rounded-full py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? 'Hesap oluşturuluyor...' : 'Kayıt Ol'}
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-4">
            Zaten hesabın var mı?{' '}
            <Link href="/login" className="text-amber-600 underline font-semibold">
              Giriş yap
            </Link>
          </p>

          <p className="text-[9px] text-slate-400 text-center mt-4">
            Kayıt olarak{' '}
            <Link href="/terms" className="underline">
              Kullanım Şartları
            </Link>
            'nı ve{' '}
            <Link href="/privacy" className="underline">
              Gizlilik Politikası
            </Link>
            'nı kabul ediyorsun.
          </p>
        </div>
      </div>
    </div>
  )
}
