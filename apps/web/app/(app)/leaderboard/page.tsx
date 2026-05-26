'use client'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import { apiFetch } from '../../../lib/api'

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly')

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', period],
    queryFn: () => apiFetch<any>(`/api/leaderboard?period=${period}`),
  })

  return (
    <div className="max-w-3xl mx-auto px-8 py-8">
      <header className="mb-6">
        <h1 className="font-serif text-4xl text-ink-900">Liderlik</h1>
        <p className="text-sm text-slate-600 mt-1">
          Sadece public profilli kullanıcılar listede görünür.
        </p>
      </header>

      <div className="flex gap-2 mb-5">
        {(['weekly', 'monthly'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-full text-xs font-bold ${
              period === p
                ? 'bg-ink-900 text-cream-50'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {p === 'weekly' ? 'Bu Hafta' : 'Bu Ay'}
          </button>
        ))}
      </div>

      {data?.myRank && (
        <div className="bg-amber-500 rounded-2xl p-3 mb-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-ink-900 rounded-full flex items-center justify-center">
            <span className="text-cream-50 font-bold text-sm">#{data.myRank.rank}</span>
          </div>
          <div className="flex-1">
            <p className="text-xs text-ink-900 font-bold">Senin Yerin</p>
            <p className="text-[10px] text-ink-900/70">
              {data.myRank.review_count} tekrar · {data.myRank.active_days} aktif gün
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {(data?.entries ?? []).map((e: any) => (
          <Link
            key={e.user_id}
            href={`/u/${e.username}`}
            className="bg-white border border-slate-100 rounded-2xl p-3 flex items-center gap-3 hover:border-amber-300 transition-colors"
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                e.rank === 1
                  ? 'bg-amber-500 text-ink-900'
                  : e.rank === 2
                    ? 'bg-slate-300 text-ink-900'
                    : e.rank === 3
                      ? 'bg-orange-300 text-ink-900'
                      : 'bg-cream-50 text-slate-600 border border-slate-100'
              }`}
            >
              {e.rank}
            </div>

            <div className="w-9 h-9 rounded-full bg-ink-900 flex items-center justify-center">
              <span className="text-amber-500 text-[11px] font-bold">
                {(e.full_name ?? e.username ?? '?').slice(0, 1).toUpperCase()}
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink-900 font-semibold">@{e.username ?? 'anonim'}</p>
              <p className="text-[10px] text-slate-500">
                {e.review_count} tekrar · {e.active_days} aktif gün
              </p>
            </div>

            <div className="text-right">
              <p className="font-mono text-base text-amber-600 font-bold">{Math.round(e.score)}</p>
              <p className="text-[9px] text-slate-500">puan</p>
            </div>
          </Link>
        ))}
      </div>

      {(data?.entries ?? []).length === 0 && !isLoading && (
        <div className="text-center py-16">
          <p className="text-3xl mb-3">📊</p>
          <h2 className="font-serif text-lg text-slate-700">Liderlik henüz boş</h2>
          <p className="text-sm text-slate-500 mt-1">
            İlk listeye girmek için profilini public yap.
          </p>
        </div>
      )}
    </div>
  )
}
