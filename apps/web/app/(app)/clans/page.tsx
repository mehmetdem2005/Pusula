'use client'
import { useQuery } from '@tanstack/react-query'
import { Plus, Users } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { apiFetch } from '../../../lib/api'

export default function ClansPage() {
  const [tab, setTab] = useState<'mine' | 'discover'>('mine')

  const { data: mine } = useQuery({
    queryKey: ['my-clans'],
    queryFn: () => apiFetch<{ memberships: any[] }>('/api/clans'),
  })

  const { data: discover } = useQuery({
    queryKey: ['discover-clans'],
    queryFn: () => apiFetch<{ clans: any[] }>('/api/clans/discover'),
    enabled: tab === 'discover',
  })

  return (
    <div className="max-w-5xl mx-auto px-8 py-8">
      <header className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-serif text-4xl text-ink-900">Klanlar</h1>
          <p className="text-sm text-slate-600 mt-1">
            10 kişilik çalışma grupları. Birlikte streak yap, motive ol.
          </p>
        </div>
        <Link
          href="/clans/new"
          className="bg-amber-500 text-ink-900 rounded-full py-2.5 px-5 text-sm font-bold flex items-center gap-2"
        >
          <Plus size={14} />
          Klan Kur
        </Link>
      </header>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('mine')}
          className={`px-4 py-2 rounded-full text-xs font-bold ${
            tab === 'mine'
              ? 'bg-ink-900 text-cream-50'
              : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          Klanlarım ({mine?.memberships?.length ?? 0})
        </button>
        <button
          onClick={() => setTab('discover')}
          className={`px-4 py-2 rounded-full text-xs font-bold ${
            tab === 'discover'
              ? 'bg-ink-900 text-cream-50'
              : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          Keşfet
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tab === 'mine' &&
          mine?.memberships?.map((m: any) => (
            <Link
              key={m.clan_id}
              href={`/clans/${m.clans.slug}`}
              className="bg-white rounded-3xl p-4 border border-slate-100 hover:border-amber-300 flex items-center gap-3"
              style={{ borderLeftColor: m.clans.color, borderLeftWidth: 4 }}
            >
              <span className="text-3xl">{m.clans.emoji}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-lg text-ink-900">{m.clans.name}</h3>
                <p className="text-xs text-slate-500 truncate">{m.clans.description ?? ''}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                    <Users size={10} />
                    {m.clans.member_count}/{m.clans.max_members}
                  </span>
                  {m.role === 'founder' && (
                    <span className="text-[10px] text-amber-600 font-bold">KURUCU</span>
                  )}
                </div>
              </div>
            </Link>
          ))}

        {tab === 'discover' &&
          discover?.clans?.map((c: any) => (
            <Link
              key={c.id}
              href={`/clans/${c.slug}`}
              className="bg-white rounded-3xl p-4 border border-slate-100 hover:border-amber-300 flex items-center gap-3"
              style={{ borderLeftColor: c.color, borderLeftWidth: 4 }}
            >
              <span className="text-3xl">{c.emoji}</span>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-lg text-ink-900">{c.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2">{c.description ?? ''}</p>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                  {c.member_count}/{c.max_members} üye
                </span>
              </div>
            </Link>
          ))}
      </div>

      {tab === 'mine' && (mine?.memberships?.length ?? 0) === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">⚔️</p>
          <h2 className="font-serif text-xl text-ink-900">Henüz klanın yok</h2>
          <p className="text-sm text-slate-500 mt-1">Birine katıl veya kendi klanını kur.</p>
        </div>
      )}
    </div>
  )
}
