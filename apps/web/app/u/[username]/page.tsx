import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.kavra.app'

async function fetchProfile(username: string) {
  try {
    const res = await fetch(`${API_BASE}/api/profiles/${username}`, {
      next: { revalidate: 120 },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params
  const data = await fetchProfile(username)
  if (!data?.profile) return { title: 'Bulunamadı — Kavra' }

  const p = data.profile
  return {
    title: `${p.full_name ?? p.username} (@${p.username}) — Kavra`,
    description: p.bio ?? `Kavra üyesi @${p.username}`,
    openGraph: {
      title: p.full_name ?? p.username,
      description: p.bio ?? '',
      type: 'profile',
    },
  }
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const data = await fetchProfile(username)

  if (!data?.profile) notFound()

  const p = data.profile
  const stats = data.stats ?? {}
  const notebooks = data.notebooks ?? []
  const achievements = data.achievements ?? []

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Banner */}
      <div style={{ backgroundColor: p.banner_color ?? '#1E1B4B' }} className="h-32 relative">
        <Link href="/gallery" className="absolute top-4 left-4 text-cream-50 text-sm">
          ← Keşfet
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-12">
        {/* Avatar */}
        <div className="bg-white rounded-full p-1 inline-block">
          <div className="w-24 h-24 rounded-full bg-ink-900 flex items-center justify-center">
            <span className="text-amber-500 text-4xl font-bold">
              {(p.full_name ?? p.username).slice(0, 1).toUpperCase()}
            </span>
          </div>
        </div>

        <div className="mt-4">
          <h1 className="font-serif text-3xl text-ink-900">{p.full_name ?? p.username}</h1>
          <p className="text-sm text-slate-500">
            @{p.username}
            {p.pronouns && ` · ${p.pronouns}`}
          </p>
          {p.bio && <p className="text-sm text-ink-900 mt-3 leading-6 max-w-2xl">{p.bio}</p>}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 bg-white border border-slate-100 rounded-3xl p-4 mt-6 max-w-xl">
          <Stat label="Defter" value={stats.public_notebook_count ?? 0} />
          <Stat label="Görüntüleme" value={stats.total_views ?? 0} />
          <Stat label="Kayıt" value={stats.total_saves ?? 0} />
          <Stat label="Takipçi" value={stats.followers_count ?? 0} />
        </div>

        {/* Achievements */}
        {achievements.length > 0 && (
          <section className="mt-8">
            <h2 className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-3">
              Rozetler ({achievements.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {achievements.slice(0, 16).map((a: any) => (
                <div
                  key={a.achievement_id}
                  className="bg-white border border-slate-100 rounded-2xl p-3 w-24 text-center"
                  title={a.achievements?.description}
                >
                  <div className="text-3xl">{a.achievements?.emoji}</div>
                  <p className="text-[10px] text-slate-700 font-bold mt-1.5 line-clamp-2">
                    {a.achievements?.name}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Notebooks */}
        <section className="mt-8 mb-12">
          <h2 className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-3">
            {notebooks.length} Paylaşılan Defter
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {notebooks.map((n: any) => (
              <Link
                key={n.id}
                href={`/n/${n.public_slug}`}
                className="bg-white border border-slate-100 rounded-3xl p-4 hover:border-amber-300 transition-colors"
              >
                <h3 className="font-serif text-base text-ink-900 line-clamp-2">{n.title}</h3>
                {n.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.description}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                  <span>{n.view_count} görüntüleme</span>
                  <span className="text-amber-600 font-semibold">{n.save_count} kayıt</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="font-serif text-2xl text-ink-900">
        {value > 999 ? `${(value / 1000).toFixed(1)}K` : value}
      </p>
      <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
    </div>
  )
}
