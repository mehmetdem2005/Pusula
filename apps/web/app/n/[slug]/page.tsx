import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.kavra.app'

async function fetchPublicNotebook(slug: string) {
  try {
    const res = await fetch(`${API_BASE}/api/n/${slug}`, {
      next: { revalidate: 60 }, // ISR — 60sn cache
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const data = await fetchPublicNotebook(slug)
  if (!data?.notebook) return { title: 'Bulunamadı — Kavra' }

  const nb = data.notebook
  return {
    title: `${nb.title} — Kavra`,
    description:
      nb.description ??
      `${nb.source_count} kaynaklı defter, @${nb.profiles?.username ?? 'anonim'} tarafından paylaşıldı.`,
    openGraph: {
      title: nb.title,
      description: nb.description ?? '',
      type: 'article',
      authors: [nb.profiles?.full_name ?? nb.profiles?.username ?? 'Kavra Kullanıcısı'],
    },
    twitter: {
      card: 'summary',
      title: nb.title,
      description: nb.description ?? '',
    },
  }
}

export default async function PublicNotebookPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await fetchPublicNotebook(slug)

  if (!data?.notebook) notFound()

  const nb = data.notebook
  const author = nb.profiles
  const sources = data.sources ?? []
  const studio = data.studio ?? []

  return (
    <div className="min-h-screen bg-cream-50">
      {/* Top nav */}
      <nav className="bg-white border-b border-slate-100 px-6 py-3 flex items-center justify-between">
        <Link href="/" className="font-serif text-xl text-ink-900">
          Kavra
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/gallery" className="text-sm text-slate-600 hover:text-ink-900">
            Keşfet
          </Link>
          <Link
            href="/login"
            className="bg-ink-900 text-cream-50 rounded-full px-4 py-1.5 text-xs font-semibold"
          >
            Giriş
          </Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-10">
        {nb.category && (
          <p className="font-mono text-[10px] text-amber-600 tracking-widest uppercase mb-2">
            {nb.category}
          </p>
        )}
        <h1 className="font-serif text-4xl text-ink-900 leading-tight">{nb.title}</h1>
        {nb.description && (
          <p className="text-base text-slate-600 mt-3 leading-7">{nb.description}</p>
        )}

        <div className="flex items-center gap-3 mt-6 pb-6 border-b border-slate-100">
          {author?.username && (
            <Link
              href={`/u/${author.username}`}
              className="flex items-center gap-2 hover:opacity-70"
            >
              <div className="w-9 h-9 rounded-full bg-ink-900 flex items-center justify-center">
                <span className="text-amber-500 text-xs font-bold">
                  {(author.full_name ?? author.username).slice(0, 1).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm text-ink-900 font-semibold">@{author.username}</p>
                <p className="text-[10px] text-slate-500">
                  {new Date(nb.shared_at).toLocaleDateString('tr-TR')}
                </p>
              </div>
            </Link>
          )}
          <div className="flex-1" />
          <div className="flex gap-4 text-xs text-slate-500">
            <span>
              <strong className="text-ink-900">{nb.view_count}</strong> görüntülenme
            </span>
            <span>
              <strong className="text-amber-600">{nb.save_count}</strong> kayıt
            </span>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 mt-6 text-center">
          <p className="text-sm text-ink-900 font-semibold">Bu defteri kütüphanene ekle</p>
          <p className="text-xs text-slate-600 mt-1 mb-4">
            Sohbet et, sınav yap, podcast'e dönüştür. Free tier'da bile çalışır.
          </p>
          <Link
            href={`/login?next=/n/${slug}`}
            className="inline-block bg-ink-900 text-cream-50 rounded-full px-5 py-2 text-sm font-semibold"
          >
            Giriş Yap & Kaydet
          </Link>
        </div>

        {/* Sources */}
        <div className="mt-10">
          <h2 className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-3">
            {sources.length} Kaynak
          </h2>
          <div className="space-y-2">
            {sources.map((s: any) => (
              <div
                key={s.id}
                className="bg-white border border-slate-100 rounded-2xl p-3 flex items-center gap-3"
              >
                <span className="text-xl">
                  {s.source_type === 'pdf'
                    ? '📄'
                    : s.source_type === 'youtube'
                      ? '📺'
                      : s.source_type === 'audio'
                        ? '🎙️'
                        : s.source_type === 'url'
                          ? '🔗'
                          : '📝'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink-900 font-semibold truncate">{s.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {s.source_type}
                    {s.youtube_duration_seconds
                      ? ` · ${Math.round(s.youtube_duration_seconds / 60)} dk`
                      : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Studio outputs */}
        {studio.length > 0 && (
          <div className="mt-8">
            <h2 className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-3">
              Hazır Üretimler
            </h2>
            <div className="space-y-2">
              {studio.map((s: any) => (
                <div
                  key={s.id}
                  className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3"
                >
                  <span className="text-xl">
                    {s.content_type === 'audio_overview' ? '🎙️' : '📜'}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm text-ink-900 font-semibold">{s.title}</p>
                    <p className="text-[10px] text-amber-700 mt-0.5">
                      {s.content_type === 'audio_overview' ? 'Sesli Özet' : 'Özet'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-500">
            Kaynak içeriği gizlidir — sadece sahibi görür. Defteri klonlayan üyeler kendi
            kaynaklarını işler.
          </p>
        </div>
      </article>
    </div>
  )
}
