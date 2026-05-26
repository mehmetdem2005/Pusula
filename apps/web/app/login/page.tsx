'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import * as React from 'react'
import { Suspense as SuspenseRaw, useState } from 'react'
import { toast } from 'sonner'
import { getSupabaseBrowserClient } from '../../lib/supabase/client'

const Suspense = SuspenseRaw as unknown as React.ComponentType<{
  fallback?: React.ReactNode
  children?: React.ReactNode
}>

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}

function LoginInner() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') ?? '/library'

  const [mode, setMode] = useState<'email' | 'magic'>('magic')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = getSupabaseBrowserClient()

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      router.push(next)
    }
  }

  const handleMagic = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}${next}` },
    })
    setLoading(false)
    if (error) toast.error(error.message)
    else toast.success('Email kontrol et — sihirli link gönderildi.')
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${next}` },
    })
  }

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center px-6 py-12">
      <div className="max-w-sm w-full">
        <Link href="/" className="block text-center mb-10">
          <h1 className="font-serif text-5xl text-ink-900">Kavra</h1>
          <p className="text-xs text-slate-500 italic mt-1">Kavra. Her şeyi.</p>
        </Link>

        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <h2 className="font-serif text-2xl text-ink-900 mb-1">Giriş</h2>
          <p className="text-xs text-slate-500 mb-5">
            Tekrar hoş geldin. Çalışmana kaldığın yerden devam et.
          </p>

          <button
            onClick={handleGoogle}
            className="w-full bg-white border border-slate-200 rounded-full py-2.5 flex items-center justify-center gap-2 hover:border-slate-300 mb-3"
          >
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path
                d="M15.68 8.18c0-.6-.05-1.18-.15-1.73H8v3.27h4.31c-.19.99-.74 1.83-1.58 2.4v2H13.4c1.6-1.48 2.28-3.65 2.28-5.94z"
                fill="#4285F4"
              />
              <path
                d="M8 16c2.16 0 3.97-.71 5.3-1.93l-2.67-2c-.74.5-1.69.79-2.63.79-2.02 0-3.74-1.36-4.35-3.2H1.06v2.06A8 8 0 0 0 8 16z"
                fill="#34A853"
              />
              <path
                d="M3.65 9.66A4.8 4.8 0 0 1 3.4 8c0-.58.1-1.13.25-1.66V4.28H1.06A8 8 0 0 0 0 8c0 1.29.31 2.51.86 3.6l2.79-1.94z"
                fill="#FBBC05"
              />
              <path
                d="M8 3.16c1.18 0 2.23.4 3.06 1.2l2.3-2.3C11.97.79 10.16 0 8 0a8 8 0 0 0-7.14 4.4l2.79 2.16C4.26 4.52 5.98 3.16 8 3.16z"
                fill="#EA4335"
              />
            </svg>
            <span className="text-sm font-semibold text-ink-900">Google ile devam et</span>
          </button>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[10px] text-slate-400 font-mono uppercase">veya</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setMode('magic')}
              className={`flex-1 py-1.5 rounded-full text-xs font-bold ${
                mode === 'magic' ? 'bg-ink-900 text-cream-50' : 'bg-cream-50 text-slate-600'
              }`}
            >
              Magic Link
            </button>
            <button
              onClick={() => setMode('email')}
              className={`flex-1 py-1.5 rounded-full text-xs font-bold ${
                mode === 'email' ? 'bg-ink-900 text-cream-50' : 'bg-cream-50 text-slate-600'
              }`}
            >
              Şifre
            </button>
          </div>

          <form onSubmit={mode === 'magic' ? handleMagic : handleEmail}>
            <input
              type="email"
              placeholder="email@adres.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-cream-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm mb-3"
            />
            {mode === 'email' && (
              <input
                type="password"
                placeholder="Şifre"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-cream-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm mb-3"
              />
            )}
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-ink-900 text-cream-50 rounded-full py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {loading ? 'Gönderiliyor...' : mode === 'magic' ? 'Sihirli Link Gönder' : 'Giriş Yap'}
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-4">
            Hesabın yok mu?{' '}
            <Link href="/signup" className="text-amber-600 underline font-semibold">
              Kayıt ol
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
