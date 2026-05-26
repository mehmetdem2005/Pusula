'use client'
import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { apiFetch } from '../../../../../lib/api'

const CATEGORIES = ['', 'auth', 'org', 'user', 'billing', 'class', 'data', 'security']

export default function AuditPage() {
  const params = useParams()
  const slug = params.slug as string
  const [category, setCategory] = useState('')

  const { data: org } = useQuery({
    queryKey: ['org', slug],
    queryFn: () => apiFetch<any>(`/api/orgs/${slug}`),
  })

  const orgId = org?.org?.id

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', orgId, category],
    queryFn: () =>
      apiFetch<any>(`/api/orgs/${orgId}/audit${category ? `?category=${category}` : ''}`),
    enabled: !!orgId,
  })

  const handleExport = async () => {
    const endDate = new Date().toISOString()
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/orgs/${orgId}/audit/export`,
      {
        method: 'POST',
        body: JSON.stringify({ startDate, endDate }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      },
    )
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kavra-audit-${slug}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl text-ink-900">Audit Log</h1>
          <p className="text-sm text-slate-600 mt-1">
            KVKK + GDPR compliance — tüm admin/user eylemleri 2 yıl saklanır
          </p>
        </div>
        <button
          onClick={handleExport}
          className="bg-white border border-slate-200 rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5 hover:border-amber-300"
        >
          <Download size={12} /> 90 Günlük CSV
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${
              category === c
                ? 'bg-ink-900 text-cream-50'
                : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {c === '' ? 'Hepsi' : c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Yükleniyor...</div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-cream-50 text-[10px] uppercase tracking-widest text-slate-500 font-mono">
              <tr>
                <th className="text-left px-4 py-3">Zaman</th>
                <th className="text-left px-4 py-3">Olay</th>
                <th className="text-left px-4 py-3">Kullanıcı</th>
                <th className="text-left px-4 py-3">Hedef</th>
                <th className="text-left px-4 py-3">IP</th>
              </tr>
            </thead>
            <tbody>
              {(data?.logs ?? []).map((l: any) => (
                <tr key={l.id} className="border-t border-slate-100 hover:bg-cream-50">
                  <td className="px-4 py-3 text-[11px] font-mono text-slate-500">
                    {new Date(l.created_at).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3">
                    <code className="bg-cream-50 px-2 py-0.5 rounded text-[10px] font-mono">
                      {l.event_type}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-[11px]">
                    {l.profiles?.full_name ?? l.profiles?.email ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-slate-600">{l.target_type ?? '-'}</td>
                  <td className="px-4 py-3 text-[11px] font-mono text-slate-500">
                    {l.ip_address ?? '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {(data?.logs ?? []).length === 0 && (
            <div className="text-center py-12 text-slate-400 text-sm">Bu kategoride log yok</div>
          )}
        </div>
      )}
    </div>
  )
}
