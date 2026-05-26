'use client'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, GraduationCap, TrendingUp, Users } from 'lucide-react'
import { useParams } from 'next/navigation'
import { apiFetch } from '../../../../lib/api'

export default function OrgDashboard() {
  const params = useParams()
  const slug = params.slug as string

  const { data } = useQuery({
    queryKey: ['org', slug],
    queryFn: () => apiFetch<any>(`/api/orgs/${slug}`),
    enabled: !!slug,
  })

  const org = data?.org
  const stats = data?.stats ?? {}

  if (!org) return null

  const trialDaysLeft = org.trial_ends_at
    ? Math.max(
        0,
        Math.ceil((new Date(org.trial_ends_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
      )
    : 0

  return (
    <div className="space-y-6">
      {/* Trial banner */}
      {org.subscription_status === 'trialing' && trialDaysLeft > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-amber-900 font-bold">{trialDaysLeft} gün deneme kaldı</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Plan seçip ödeme yapmadan tüm özellikleri deneyebilirsin.
            </p>
          </div>
          <a
            href={`/orgs/${slug}/billing`}
            className="bg-ink-900 text-cream-50 rounded-full px-4 py-2 text-xs font-bold"
          >
            Plan Seç
          </a>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Üye" value={stats.memberCount ?? 0} />
        <StatCard icon={GraduationCap} label="Sınıf" value={stats.classCount ?? 0} />
        <StatCard
          icon={BookOpen}
          label="Koltuk"
          value={`${org.seats_used}/${org.max_seats}`}
          highlight={org.seats_used >= org.max_seats * 0.8}
        />
        <StatCard icon={TrendingUp} label="Plan" value={org.plan?.toUpperCase() ?? 'TEAM'} />
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100">
        <h2 className="font-serif text-lg text-ink-900 mb-4">Hızlı Eylemler</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ActionCard
            href={`/orgs/${slug}/members?invite=1`}
            title="Üye Davet Et"
            description="Email ile veya CSV upload ile toplu davet"
          />
          <ActionCard
            href={`/orgs/${slug}/classes/new`}
            title="Sınıf Oluştur"
            description="Öğretmenler için sınıflar ve atamalar"
          />
          <ActionCard
            href={`/orgs/${slug}/sso`}
            title="SSO Bağla"
            description="Google Workspace / Microsoft Entra ID"
          />
          <ActionCard
            href={`/orgs/${slug}/billing`}
            title="Plan & Faturalama"
            description="Koltuk ekle, abonelik yönet"
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, highlight }: any) {
  return (
    <div
      className={`bg-white rounded-2xl p-4 border ${highlight ? 'border-amber-300' : 'border-slate-100'}`}
    >
      <Icon size={16} className={highlight ? 'text-amber-500' : 'text-slate-400'} />
      <p className="text-2xl font-serif text-ink-900 mt-2">{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mt-1">{label}</p>
    </div>
  )
}

function ActionCard({ href, title, description }: any) {
  return (
    <a
      href={href}
      className="bg-cream-50 rounded-2xl p-3 hover:bg-amber-50 hover:border-amber-200 border border-transparent transition-colors block"
    >
      <h3 className="text-sm font-bold text-ink-900">{title}</h3>
      <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>
    </a>
  )
}
