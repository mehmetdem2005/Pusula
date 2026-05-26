'use client'
import { useQuery } from '@tanstack/react-query'
import { Bookmark, Eye, FileText } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { apiFetch } from '../../../lib/api'

const CATEGORIES = [
  { value: null, label: 'Hepsi', emoji: '✨' },
  { value: 'biology', label: 'Biyoloji', emoji: '🧬' },
  { value: 'chemistry', label: 'Kimya', emoji: '⚗️' },
  { value: 'physics', label: 'Fizik', emoji: '⚛️' },
  { value: 'history', label: 'Tarih', emoji: '🏛️' },
  { value: 'literature', label: 'Edebiyat', emoji: '📖' },
  { value: 'turkish', label: 'Türkçe', emoji: '🇹🇷' },
  { value: 'language', label: 'Yabancı Dil', emoji: '🌍' },
  { value: 'math', label: 'Matematik', emoji: '∑' },
  { value: 'cs', label: 'Bilgisayar', emoji: '💻' },
  { value: 'philosophy', label: 'Felsefe', emoji: '🤔' },
  { value: 'art', label: 'Sanat', emoji: '🎨' },
]

const SORTS = [
  { value: 'popular', label: 'Popüler' },
  { value: 'recent', label: 'Yeni' },
  { value: 'most-saved', label: 'En Çok Kaydedilen' },
] as const

export default function GalleryPage() {
  const [category, setCategory] = useState<string | null>(null)
  const [sort, setSort] = useState<(typeof SORTS)[number]['value']>('popular')

  const { data, isLoading } = useQuery({
    queryKey: ['gallery', category, sort],
    queryFn: () =>
      apiFetch<any>(`/api/gallery?sort=${sort}${category ? `&category=${category}` : ''}`),
  })

  return (
    <div className="max-w-6xl mx-auto px-8 py-8">
      <header className="mb-8">
        <h1 className="font-serif text-4xl text-ink-900">Keşfet</h1>
        <p className="text-sm text-slate-600 mt-1">
          Topluluğun paylaştığı defterler. Beğendiğini kaydet, klonla, çalış.
        </p>
      </header>

      <div className="flex flex-wrap gap-2 mb-3">
        {SORTS.map((s) => (
          <button
            key={s.value}
            onClick={() => setSort(s.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
              sort === s.value
                ? 'bg-ink-900 text-cream-50'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-6">
        {CATEGORIES.map((c) => {
          const count = c.value ? (data?.categories?.[c.value] ?? 0) : null
          return (
            <button
              key={c.value ?? 'all'}
              onClick={() => setCategory(c.value)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 ${
                category === c.value
                  ? 'bg-amber-500 text-ink-900'
                  : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
              {count !== null && count > 0 && (
                <span
                  className={`text-[9px] font-mono ${category === c.value ? 'text-ink-900/60' : 'text-slate-400'}`}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-3xl p-5 border border-slate-100 animate-pulse h-32"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(data?.notebooks ?? []).map((n: any) => (
            <Link
              key={n.id}
              href={`/n/${n.public_slug}`}
              className="bg-white rounded-3xl p-5 border border-slate-100 hover:border-amber-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-serif text-lg text-ink-900 line-clamp-2 flex-1">{n.title}</h3>
                {n.category && (
                  <span className="bg-cream-50 rounded-full px-2 py-0.5 text-[10px] font-mono text-slate-700 flex-shrink-0">
                    {n.category}
                  </span>
                )}
              </div>
              {n.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.description}</p>
              )}
              <div className="flex items-center gap-3 mt-3 text-[10px] text-slate-500">
                <span>@{n.profiles?.username ?? 'anonim'}</span>
                <span className="flex items-center gap-0.5">
                  <Eye size={11} /> {n.view_count}
                </span>
                <span className="flex items-center gap-0.5 text-amber-600 font-semibold">
                  <Bookmark size={11} /> {n.save_count}
                </span>
                <span className="flex items-center gap-0.5">
                  <FileText size={11} /> {n.source_count}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {(data?.notebooks ?? []).length === 0 && !isLoading && (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">📚</p>
          <h2 className="font-serif text-xl text-slate-700">Henüz defter yok</h2>
          <p className="text-sm text-slate-500 mt-1">İlk paylaşan sen ol.</p>
        </div>
      )}
    </div>
  )
}
