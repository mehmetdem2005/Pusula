import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import type { VocabularyItem } from './useDictionary'

export interface VocabSRSCard {
  id: string
  vocabulary_id: string
  difficulty: number
  stability: number
  retrievability: number | null
  state: 'new' | 'learning' | 'review' | 'relearning'
  due_at: string
  reps: number
  lapses: number
  card_type: 'recognition' | 'production' | 'cloze' | 'listening'
  user_vocabulary: VocabularyItem
}

export interface VocabReviewStats {
  totalCards: number
  dueCards: number
  masteredWords: number
  retentionRate: number
  reviewsLast30Days: number
  heatmap: Record<string, { count: number; correct: number }>
}

export function useVocabDue(opts?: { lang?: string; limit?: number }) {
  return useQuery({
    queryKey: ['vocab-due', opts],
    queryFn: () => {
      const p = new URLSearchParams()
      if (opts?.lang) p.set('lang', opts.lang)
      if (opts?.limit) p.set('limit', String(opts.limit))
      return apiFetch<{ cards: VocabSRSCard[]; count: number }>(`/api/vocab-review/due?${p}`)
    },
  })
}

export function useVocabQueue(opts?: { lang?: string; limit?: number; newRatio?: number }) {
  return useQuery({
    queryKey: ['vocab-queue', opts],
    queryFn: () => {
      const p = new URLSearchParams()
      if (opts?.lang) p.set('lang', opts.lang)
      if (opts?.limit) p.set('limit', String(opts.limit))
      if (opts?.newRatio !== undefined) p.set('newRatio', String(opts.newRatio))
      return apiFetch<{ cards: VocabSRSCard[]; dueCount: number; newCount: number }>(
        `/api/vocab-review/queue?${p}`,
      )
    },
  })
}

export function useRateVocabCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { cardId: string; rating: 1 | 2 | 3 | 4; durationMs?: number }) =>
      apiFetch<{
        ok: boolean
        nextDue: string
        intervalDays: number
        state: string
        newStatus: string
      }>(`/api/vocab-review/${input.cardId}/rate`, {
        method: 'POST',
        body: JSON.stringify({ rating: input.rating, durationMs: input.durationMs }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vocab-due'] })
      qc.invalidateQueries({ queryKey: ['vocab-queue'] })
      qc.invalidateQueries({ queryKey: ['vocab-stats'] })
      qc.invalidateQueries({ queryKey: ['vocabulary'] })
    },
  })
}

export function useVocabPreview(cardId: string | null) {
  return useQuery({
    queryKey: ['vocab-preview', cardId],
    queryFn: () =>
      apiFetch<{ intervals: Record<string, string> }>(`/api/vocab-review/preview/${cardId}`),
    enabled: !!cardId,
  })
}

export function useVocabStats() {
  return useQuery({
    queryKey: ['vocab-stats'],
    queryFn: () => apiFetch<VocabReviewStats>('/api/vocab-review/stats'),
  })
}
