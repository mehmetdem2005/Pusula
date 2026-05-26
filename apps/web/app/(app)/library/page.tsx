'use client'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Bookmark, Eye, Globe2, Lock, Plus } from 'lucide-react'
import Link from 'next/link'
import { apiFetch } from '../../../lib/api'

interface Notebook {
  id: string
  title: string
  description: string | null
  language: string
  source_count: number
  total_words: number
  is_public: boolean
  view_count: number
  save_count: number
  category: string | null
  created_at: string
  updated_at: string
}

export default function LibraryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['notebooks'],
    queryFn: () => apiFetch<{ notebooks: Notebook[] }>('/api/notebooks'),
  })

  const notebooks = data?.notebooks ?? []

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      <header className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-serif text-4xl text-ink-900">Defterlerim</h1>
          <p className="text-sm text-slate-600 mt-1">
            {notebooks.length} defter — kavradığın her şey burada
          </p>
        </div>
        <Link
          href="/notebooks/new"
          className="bg-ink-900 text-cream-50 rounded-full py-2.5 px-5 text-sm font-semibold flex items-center gap-2 hover:bg-ink-950"
        >
          <Plus size={16} />
          Yeni Defter
        </Link>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl p-5 border border-slate-100 animate-pulse h-44"
            />
          ))}
        </div>
      ) : notebooks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notebooks.map((n) => (
            <Link
              key={n.id}
              href={`/notebooks/${n.id}`}
              className="bg-white rounded-3xl p-5 border border-slate-100 hover:border-amber-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-cream-50 flex items-center justify-center">
                  <BookOpen size={18} className="text-ink-900" />
                </div>
                {n.is_public ? (
                  <Globe2 size={14} className="text-amber-500" />
                ) : (
                  <Lock size={14} className="text-slate-300" />
                )}
              </div>

              <h3 className="font-serif text-lg text-ink-900 leading-tight line-clamp-2">
                {n.title}
              </h3>
              {n.description && (
                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2">{n.description}</p>
              )}

              <div className="flex items-center gap-4 mt-4 text-[10px] text-slate-500 font-mono">
                <span>{n.source_count} kaynak</span>
                {n.total_words > 0 && <span>{(n.total_words / 1000).toFixed(0)}k kelime</span>}
                {n.is_public && (
                  <>
                    <span className="flex items-center gap-1">
                      <Eye size={10} /> {n.view_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Bookmark size={10} /> {n.save_count}
                    </span>
                  </>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center">
      <BookOpen size={48} className="text-slate-300 mx-auto mb-3" />
      <h2 className="font-serif text-xl text-ink-900">İlk defterini oluştur</h2>
      <p className="text-sm text-slate-500 mt-1.5 mb-5 max-w-md mx-auto">
        PDF, video, web sayfası, ses kaydı — hepsini bir deftere koy. AI öğrensin, sen sor,
        podcast'e dönüştür.
      </p>
      <Link
        href="/notebooks/new"
        className="inline-block bg-ink-900 text-cream-50 rounded-full py-2.5 px-6 text-sm font-semibold"
      >
        Defter Oluştur
      </Link>
    </div>
  )
}
