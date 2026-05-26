'use client'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../../lib/api'

const RARITY = {
  common: 'border-slate-300',
  rare: 'border-cyan-400',
  epic: 'border-violet-500',
  legendary: 'border-amber-500',
}

const CATEGORIES = ['milestone', 'learning', 'streak', 'creator', 'social']
const CATEGORY_LABELS: Record<string, string> = {
  milestone: 'Kilometre Taşı',
  learning: 'Öğrenme',
  streak: 'Streak',
  creator: 'Yaratıcı',
  social: 'Sosyal',
}

export default function AchievementsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => apiFetch<any>('/api/achievements'),
  })

  const all = data?.achievements ?? []

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <header className="mb-6">
        <h1 className="font-serif text-4xl text-ink-900">Rozetler</h1>
        <p className="text-sm text-slate-600 mt-1">
          {data?.unlockedCount ?? 0} / {data?.totalCount ?? 0} kazanıldı
        </p>
        <div className="h-2 bg-white rounded-full mt-3 overflow-hidden max-w-md">
          <div
            className="h-full bg-amber-500 transition-all"
            style={{
              width: `${((data?.unlockedCount ?? 0) / Math.max(1, data?.totalCount ?? 1)) * 100}%`,
            }}
          />
        </div>
      </header>

      {CATEGORIES.map((cat) => {
        const items = all.filter((a: any) => a.category === cat)
        if (items.length === 0) return null
        return (
          <section key={cat} className="mb-8">
            <h2 className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-3">
              {CATEGORY_LABELS[cat]} ({items.filter((a: any) => a.isUnlocked).length}/{items.length}
              )
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {items.map((a: any) => (
                <div
                  key={a.id}
                  className={`bg-white rounded-2xl p-3 border-2 text-center transition-all ${
                    a.isUnlocked ? (RARITY as any)[a.rarity] : 'border-slate-100 opacity-40'
                  }`}
                  title={a.description}
                >
                  <div className="text-3xl">{a.isUnlocked ? a.emoji : '🔒'}</div>
                  <p className="text-[10px] text-ink-900 font-bold mt-1.5 line-clamp-2">{a.name}</p>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
