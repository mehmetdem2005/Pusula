'use client'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Check, Copy } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '../../../../../lib/api'

export default function SsoPage() {
  const params = useParams()
  const slug = params.slug as string
  const [scimToken, setScimToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const { data: org } = useQuery({
    queryKey: ['org', slug],
    queryFn: () => apiFetch<any>(`/api/orgs/${slug}`),
  })

  const orgId = org?.org?.id

  const generateScimMut = useMutation({
    mutationFn: () =>
      apiFetch<{ token: string; endpoint: string }>(`/api/orgs/${orgId}/scim/generate-token`, {
        method: 'POST',
      }),
    onSuccess: (res) => {
      setScimToken(res.token)
      toast.success('SCIM token oluşturuldu')
    },
  })

  const copyToken = async () => {
    if (!scimToken) return
    await navigator.clipboard.writeText(scimToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl text-ink-900">SSO & SCIM</h1>
        <p className="text-sm text-slate-600 mt-1">
          Tek tıkla giriş ve otomatik kullanıcı sağlama. Enterprise plan gereklidir.
        </p>
      </div>

      {/* SSO setup */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100">
        <h2 className="font-serif text-xl text-ink-900 mb-2">Single Sign-On</h2>
        <p className="text-xs text-slate-500 mb-4">
          Kullanıcılar kurum hesaplarıyla Kavra'ya giriş yapsın.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ProviderCard
            name="Google Workspace"
            icon="🔵"
            status={org?.org?.sso_provider === 'google_workspace' ? 'active' : 'available'}
          />
          <ProviderCard
            name="Microsoft Entra ID"
            icon="🔷"
            status={org?.org?.sso_provider === 'microsoft_entra' ? 'active' : 'available'}
          />
          <ProviderCard
            name="SAML 2.0"
            icon="🔐"
            status={org?.org?.sso_provider === 'saml' ? 'active' : 'available'}
          />
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mt-4">
          <p className="text-[11px] text-amber-900">
            <strong>Kurulum:</strong> Plan'ın Enterprise olması gerekir.{' '}
            <a href={`/orgs/${slug}/billing`} className="underline font-bold">
              Plana Yükselt
            </a>{' '}
            veya{' '}
            <a href="mailto:sales@kavra.app" className="underline font-bold">
              satış ekibiyle
            </a>{' '}
            görüş.
          </p>
        </div>
      </section>

      {/* SCIM Provisioning */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100">
        <h2 className="font-serif text-xl text-ink-900 mb-2">SCIM 2.0 Otomatik Sağlama</h2>
        <p className="text-xs text-slate-500 mb-4">
          IdP'ten Kavra'ya otomatik kullanıcı sync — yeni çalışan eklendiğinde, ayrılan deactive
          olduğunda otomatik.
        </p>

        {!scimToken ? (
          <button
            onClick={() => generateScimMut.mutate()}
            disabled={generateScimMut.isPending}
            className="bg-ink-900 text-cream-50 rounded-full px-5 py-2.5 text-xs font-bold disabled:opacity-50"
          >
            {generateScimMut.isPending ? 'Oluşturuluyor...' : 'SCIM Token Oluştur'}
          </button>
        ) : (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3">
              <p className="text-xs text-amber-900 font-bold mb-2">
                ⚠️ Token sadece bir kez gösterilir
              </p>
              <div className="bg-white border border-amber-300 rounded-xl p-3 flex items-center gap-2">
                <code className="text-xs font-mono text-ink-900 flex-1 break-all">{scimToken}</code>
                <button
                  onClick={copyToken}
                  className="bg-amber-500 rounded-lg p-2 hover:bg-amber-600"
                >
                  {copied ? (
                    <Check size={14} className="text-ink-900" />
                  ) : (
                    <Copy size={14} className="text-ink-900" />
                  )}
                </button>
              </div>
            </div>

            <div className="bg-cream-50 rounded-2xl p-4">
              <p className="text-[10px] uppercase font-mono text-slate-500 mb-2">SCIM Endpoint</p>
              <code className="text-xs font-mono text-ink-900 break-all block">
                https://api.kavra.app/api/scim/v2/orgs/{orgId}/Users
              </code>
            </div>
          </div>
        )}
      </section>

      {/* Domain restriction */}
      <section className="bg-white rounded-3xl p-6 border border-slate-100">
        <h2 className="font-serif text-xl text-ink-900 mb-2">Domain Kısıtlaması</h2>
        <p className="text-xs text-slate-500 mb-4">
          Sadece belirli email domain'lerinden gelenleri kabul et (örn: @okul.k12.tr)
        </p>

        <input
          type="text"
          placeholder="okul.k12.tr"
          defaultValue={org?.org?.sso_domain ?? ''}
          className="bg-cream-50 border border-slate-200 rounded-xl px-3 py-2 text-sm w-full max-w-sm"
        />
      </section>
    </div>
  )
}

function ProviderCard({
  name,
  icon,
  status,
}: { name: string; icon: string; status: 'active' | 'available' }) {
  return (
    <div
      className={`rounded-2xl p-4 border-2 ${
        status === 'active' ? 'bg-emerald-50 border-emerald-300' : 'bg-cream-50 border-slate-200'
      }`}
    >
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-sm font-bold text-ink-900">{name}</p>
      <p
        className={`text-[10px] font-mono uppercase mt-1 ${
          status === 'active' ? 'text-emerald-600' : 'text-slate-500'
        }`}
      >
        {status === 'active' ? '✓ AKTIF' : 'KURMAK İÇIN TIKLA'}
      </p>
    </div>
  )
}
