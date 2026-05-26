'use client'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  FileText,
  GraduationCap,
  Receipt,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { apiFetch } from '../../../../lib/api'

const NAV = [
  { href: '', label: 'Dashboard', icon: Building2 },
  { href: '/members', label: 'Üyeler', icon: Users },
  { href: '/classes', label: 'Sınıflar', icon: GraduationCap },
  { href: '/billing', label: 'Faturalandırma', icon: Receipt },
  { href: '/sso', label: 'SSO & SCIM', icon: ShieldCheck },
  { href: '/audit', label: 'Audit Log', icon: FileText },
  { href: '/settings', label: 'Ayarlar', icon: Settings },
]

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const pathname = usePathname()
  const slug = params.slug as string

  const { data: org } = useQuery({
    queryKey: ['org', slug],
    queryFn: () => apiFetch<any>(`/api/orgs/${slug}`),
    enabled: !!slug,
  })

  const baseHref = `/orgs/${slug}`

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Org header */}
      <div className="bg-white border-b border-slate-100 px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {org?.org?.logo_url ? (
              <img src={org.org.logo_url} alt="" className="w-10 h-10 rounded-xl" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-ink-900 flex items-center justify-center">
                <span className="text-amber-500 font-bold">
                  {(org?.org?.name ?? '?').slice(0, 1).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <h1 className="font-serif text-xl text-ink-900">
                {org?.org?.name ?? 'Organizasyon'}
              </h1>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span className="font-mono uppercase">{org?.org?.plan ?? 'team'}</span>
                <span>·</span>
                <span>
                  {org?.org?.seats_used ?? 0}/{org?.org?.max_seats ?? 0} koltuk
                </span>
                {org?.org?.subscription_status === 'trialing' && (
                  <>
                    <span>·</span>
                    <span className="text-amber-600 font-bold">DENEME</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Link href="/library" className="text-xs text-slate-600 hover:text-ink-900">
            ← Kişisel
          </Link>
        </div>

        {/* Nav tabs */}
        <div className="max-w-6xl mx-auto flex gap-1 mt-4 -mb-px overflow-x-auto">
          {NAV.map((n) => {
            const Icon = n.icon
            const href = baseHref + n.href
            const active = pathname === href
            return (
              <Link
                key={n.href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs border-b-2 whitespace-nowrap transition-colors ${
                  active
                    ? 'border-amber-500 text-ink-900 font-bold'
                    : 'border-transparent text-slate-500 hover:text-ink-900'
                }`}
              >
                <Icon size={14} />
                {n.label}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-6">{children}</div>
    </div>
  )
}
