'use client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '../../../../../lib/api'

const PLANS = [
  {
    id: 'team',
    name: 'Team',
    price: 4,
    minSeats: 5,
    target: 'Küçük kurslar, özel dersler',
    features: ['Tüm Pro özellikler', 'Sınıf yönetimi', 'Toplu davet', 'Email destek'],
  },
  {
    id: 'business',
    name: 'Business',
    price: 7,
    minSeats: 20,
    target: 'Okullar, dershane',
    features: [
      'Team özellikleri',
      'SSO (Google + MS)',
      'Audit log',
      'Öncelikli destek',
      'SLA 99.5%',
    ],
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: null,
    minSeats: 50,
    target: 'Üniversiteler, kamu',
    features: [
      'Business özellikleri',
      'SCIM 2.0',
      'SAML 2.0',
      'Dedicated CSM',
      'On-premise opsiyonu',
      'Özel kontrat',
    ],
  },
]

export default function BillingPage() {
  const params = useParams()
  const slug = params.slug as string
  const [seatCount, setSeatCount] = useState(20)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

  const { data: org } = useQuery({
    queryKey: ['org', slug],
    queryFn: () => apiFetch<any>(`/api/orgs/${slug}`),
  })

  const orgId = org?.org?.id

  const checkoutMut = useMutation({
    mutationFn: (plan: 'team' | 'business') =>
      apiFetch<{ checkoutUrl: string }>(`/api/orgs/${orgId}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ plan, billingCycle, seatCount }),
      }),
    onSuccess: (res) => {
      window.location.href = res.checkoutUrl
    },
    onError: (e: any) => toast.error(e.message),
  })

  const portalMut = useMutation({
    mutationFn: () =>
      apiFetch<{ portalUrl: string }>(`/api/orgs/${orgId}/portal`, { method: 'POST' }),
    onSuccess: (res) => {
      window.location.href = res.portalUrl
    },
  })

  const contactSalesMut = useMutation({
    mutationFn: (data: { message: string; seatEstimate?: number }) =>
      apiFetch(`/api/orgs/${orgId}/contact-sales`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => toast.success('Satış ekibimiz 24 saat içinde dönecek'),
  })

  const isActive = org?.org?.subscription_status === 'active'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-ink-900">Plan & Faturalandırma</h1>
        <p className="text-sm text-slate-600 mt-1">
          {isActive ? 'Aktif aboneliğin' : 'Plan seç ve ödeme yap'}
        </p>
      </div>

      {isActive && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-emerald-900">
                Aktif: {org?.org?.plan?.toUpperCase()} Plan
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                {org?.org?.seats_used}/{org?.org?.max_seats} koltuk kullanılıyor
              </p>
            </div>
            <button
              onClick={() => portalMut.mutate()}
              className="bg-ink-900 text-cream-50 rounded-full px-4 py-2 text-xs font-bold"
            >
              Aboneliği Yönet
            </button>
          </div>
        </div>
      )}

      {/* Billing cycle */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          onClick={() => setBillingCycle('monthly')}
          className={`px-4 py-2 rounded-full text-xs font-bold ${
            billingCycle === 'monthly'
              ? 'bg-ink-900 text-cream-50'
              : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          Aylık
        </button>
        <button
          onClick={() => setBillingCycle('yearly')}
          className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 ${
            billingCycle === 'yearly'
              ? 'bg-ink-900 text-cream-50'
              : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          Yıllık
          <span className="text-[9px] bg-amber-500 text-ink-900 px-1.5 py-0.5 rounded-full">
            2 AY ÜCRETSİZ
          </span>
        </button>
      </div>

      {/* Seat slider */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <p className="font-serif text-lg text-ink-900">Koltuk Sayısı</p>
          <span className="font-mono text-2xl text-ink-900">{seatCount}</span>
        </div>
        <input
          type="range"
          min="5"
          max="500"
          step="5"
          value={seatCount}
          onChange={(e) => setSeatCount(Number.parseInt(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
          <span>5</span>
          <span>100</span>
          <span>250</span>
          <span>500+</span>
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const monthlyPrice = plan.price ? plan.price * seatCount : null
          const yearlyPrice = plan.price ? plan.price * seatCount * 10 : null
          const displayPrice = billingCycle === 'monthly' ? monthlyPrice : yearlyPrice
          const eligible = seatCount >= plan.minSeats

          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-5 border-2 ${
                plan.popular ? 'border-amber-500 bg-amber-50' : 'border-slate-100 bg-white'
              }`}
            >
              {plan.popular && (
                <p className="text-[10px] font-bold uppercase text-amber-700 mb-2">EN POPÜLER</p>
              )}
              <h3 className="font-serif text-2xl text-ink-900">{plan.name}</h3>
              <p className="text-xs text-slate-500 mt-1">{plan.target}</p>

              <div className="my-4">
                {plan.price ? (
                  <>
                    <p className="font-serif text-3xl text-ink-900">
                      ${displayPrice?.toLocaleString()}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      ${plan.price}/koltuk · {billingCycle === 'monthly' ? 'aylık' : 'yıllık'} · min{' '}
                      {plan.minSeats}
                    </p>
                  </>
                ) : (
                  <p className="font-serif text-2xl text-ink-900">Özel Fiyat</p>
                )}
              </div>

              <ul className="space-y-2 mb-5 min-h-[140px]">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-700">
                    <Check size={12} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {plan.id === 'enterprise' ? (
                <button
                  onClick={() =>
                    contactSalesMut.mutate({ message: 'Enterprise ilgi', seatEstimate: seatCount })
                  }
                  className="w-full bg-ink-900 text-cream-50 rounded-full py-2.5 text-xs font-bold"
                >
                  Satışla Görüş
                </button>
              ) : (
                <button
                  onClick={() => checkoutMut.mutate(plan.id as any)}
                  disabled={!eligible || checkoutMut.isPending}
                  className={`w-full rounded-full py-2.5 text-xs font-bold disabled:opacity-50 ${
                    plan.popular ? 'bg-amber-500 text-ink-900' : 'bg-ink-900 text-cream-50'
                  }`}
                >
                  {!eligible ? `Min ${plan.minSeats} koltuk` : 'Plan Seç'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
