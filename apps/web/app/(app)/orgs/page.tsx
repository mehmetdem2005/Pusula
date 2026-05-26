'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Plus } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '../../../lib/api'

export default function OrgsPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [billingEmail, setBillingEmail] = useState('')

  const { data } = useQuery({
    queryKey: ['my-orgs'],
    queryFn: () => apiFetch<{ orgs: any[] }>('/api/orgs'),
  })

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch<{ org: any }>('/api/orgs', {
        method: 'POST',
        body: JSON.stringify({
          name,
          slug,
          billingEmail,
          orgType: 'school',
        }),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['my-orgs'] })
      setCreateOpen(false)
      window.location.href = `/orgs/${res.org.slug}`
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <header className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-serif text-4xl text-ink-900">Kurumsal</h1>
          <p className="text-sm text-slate-600 mt-1">
            Okul, dershane, üniversite, şirket — toplu hesap yönetimi
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="bg-amber-500 text-ink-900 rounded-full px-5 py-2.5 text-xs font-bold flex items-center gap-2"
        >
          <Plus size={14} /> Organizasyon Kur
        </button>
      </header>

      {(data?.orgs ?? []).length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-100 text-center">
          <Building2 size={48} className="text-slate-300 mx-auto mb-3" />
          <h2 className="font-serif text-xl text-ink-900">Henüz organizasyonun yok</h2>
          <p className="text-sm text-slate-500 mt-1.5 mb-5 max-w-md mx-auto">
            Kurum hesabı kur, öğretmenleri davet et, sınıflar oluştur. 14 gün ücretsiz dene.
          </p>
          <button
            onClick={() => setCreateOpen(true)}
            className="bg-ink-900 text-cream-50 rounded-full px-5 py-2.5 text-sm font-bold"
          >
            Hemen Kur
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(data?.orgs ?? []).map((m: any) => (
            <Link
              key={m.organizations.id}
              href={`/orgs/${m.organizations.slug}`}
              className="bg-white rounded-3xl p-4 border border-slate-100 hover:border-amber-300 flex items-center gap-3"
            >
              <div className="w-12 h-12 bg-ink-900 rounded-2xl flex items-center justify-center">
                <Building2 size={20} className="text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-lg text-ink-900">{m.organizations.name}</h3>
                <div className="flex items-center gap-2 text-[10px] text-slate-500">
                  <span className="font-mono uppercase">{m.organizations.plan}</span>
                  <span>·</span>
                  <span>
                    {m.organizations.seats_used}/{m.organizations.max_seats} koltuk
                  </span>
                  <span>·</span>
                  <span className="text-amber-600 font-bold uppercase">{m.role}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full">
            <h2 className="font-serif text-2xl text-ink-900 mb-4">Organizasyon Kur</h2>

            <label className="text-[10px] uppercase font-mono text-slate-500 tracking-widest">
              İsim
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Yeditepe Lisesi"
              className="w-full bg-cream-50 border border-slate-200 rounded-xl px-3 py-2 text-sm mb-3 mt-1"
            />

            <label className="text-[10px] uppercase font-mono text-slate-500 tracking-widest">
              Slug
            </label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="yeditepe-lisesi"
              className="w-full bg-cream-50 border border-slate-200 rounded-xl px-3 py-2 text-sm mb-1 mt-1"
            />
            <p className="text-[10px] text-slate-400 mb-3">kavra.app/orgs/{slug || 'slug'}</p>

            <label className="text-[10px] uppercase font-mono text-slate-500 tracking-widest">
              Faturalama Email
            </label>
            <input
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              placeholder="muhasebe@okul.tr"
              className="w-full bg-cream-50 border border-slate-200 rounded-xl px-3 py-2 text-sm mb-4 mt-1"
            />

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4">
              <p className="text-[11px] text-amber-900">
                14 gün ücretsiz deneme · Kart bilgisi gerekmez · İstediğin zaman iptal et
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCreateOpen(false)}
                className="flex-1 py-2.5 text-xs text-slate-600"
              >
                İptal
              </button>
              <button
                onClick={() => createMut.mutate()}
                disabled={!name || !slug || !billingEmail || createMut.isPending}
                className="flex-1 bg-ink-900 text-cream-50 rounded-full py-2.5 text-xs font-bold disabled:opacity-50"
              >
                {createMut.isPending ? 'Oluşturuluyor...' : 'Kur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
