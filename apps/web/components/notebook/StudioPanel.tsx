'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BookOpen, FileText, Headphones, Image, Layers, Lightbulb } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '../../lib/api'

interface Source {
  id: string
  status: string
}

const STUDIO_TYPES = [
  {
    value: 'audio_overview',
    label: 'Sesli Özet',
    emoji: '🎙️',
    description: 'Türkçe 2 sunuculu podcast',
    icon: Headphones,
    pro: true,
  },
  {
    value: 'summary',
    label: 'Özet',
    emoji: '📜',
    description: '3 paragraf + anahtar noktalar',
    icon: FileText,
    pro: false,
  },
  {
    value: 'flashcards',
    label: 'Flashcard',
    emoji: '🃏',
    description: '15 kart soru-cevap',
    icon: Layers,
    pro: false,
  },
  {
    value: 'quiz',
    label: 'Quiz',
    emoji: '🎯',
    description: '10 çoktan seçmeli + açıklama',
    icon: Lightbulb,
    pro: false,
  },
  {
    value: 'slides',
    label: 'Slaytlar',
    emoji: '🪧',
    description: '10 slayt + konuşma notları',
    icon: BookOpen,
    pro: false,
  },
  {
    value: 'infographic',
    label: 'İnfografik',
    emoji: '📊',
    description: 'Mermaid diyagram',
    icon: Image,
    pro: false,
  },
] as const

export function StudioPanel({ notebookId, sources }: { notebookId: string; sources: Source[] }) {
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['notebook-studio', notebookId],
    queryFn: () => apiFetch<{ items: any[] }>(`/api/notebooks/${notebookId}/studio`),
  })

  const items = data?.items ?? []
  const readySources = sources.filter((s) => s.status === 'ready').length

  const generateMut = useMutation({
    mutationFn: (contentType: string) =>
      apiFetch(`/api/notebooks/${notebookId}/studio`, {
        method: 'POST',
        body: JSON.stringify({ contentType }),
      }),
    onSuccess: (_, contentType) => {
      qc.invalidateQueries({ queryKey: ['notebook-studio', notebookId] })
      toast.success(`${STUDIO_TYPES.find((t) => t.value === contentType)?.label} üretiliyor...`)
    },
    onError: (e: any) => toast.error(e.message),
  })

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-slate-100">
        <h2 className="font-mono text-[10px] text-slate-500 tracking-widest uppercase">Stüdyo</h2>
        <p className="text-[11px] text-slate-400 mt-1">AI ile özet, podcast, flashcard üret</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {readySources === 0 ? (
          <div className="bg-cream-50 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500">Önce kaynak ekle ve işlenmesini bekle.</p>
          </div>
        ) : (
          STUDIO_TYPES.map((t) => {
            const existing = items.find((i: any) => i.content_type === t.value)
            const Icon = t.icon
            return (
              <button
                key={t.value}
                onClick={() =>
                  existing
                    ? (window.location.href = `/notebooks/${notebookId}/studio/${existing.id}`)
                    : generateMut.mutate(t.value)
                }
                disabled={generateMut.isPending}
                className="w-full bg-cream-50 hover:bg-amber-50 border border-transparent hover:border-amber-200 rounded-xl p-3 text-left transition-all disabled:opacity-50"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                    <Icon size={14} className="text-ink-900" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold text-ink-900">{t.label}</h3>
                      {t.pro && (
                        <span className="text-[8px] bg-amber-500 text-ink-900 px-1.5 py-0.5 rounded-full font-bold">
                          PRO
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{t.description}</p>
                    {existing && (
                      <p className="text-[10px] text-emerald-600 font-bold mt-1">
                        ✓ {existing.status === 'ready' ? 'Hazır — aç' : 'Üretiliyor...'}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
