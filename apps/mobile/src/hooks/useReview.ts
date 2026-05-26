import type { FlashcardChoice } from '@kavra/engine'
import { CHOICE_TO_QUALITY } from '@kavra/engine'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

export interface DueFlashcard {
  id: string
  front: string
  back: string
  hint: string | null
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review_at: string
  total_reviews: number
  lapses: number
  concept_id: string | null
  is_new: boolean
}

export interface ReviewStats {
  todayReviews: number
  weekReviews: number
  totalCards: number
  dueNow: number
}

export function useDueFlashcards(subjectId?: string) {
  return useQuery({
    queryKey: ['review-due', subjectId ?? 'all'],
    queryFn: async () => {
      const qs = subjectId ? `?subjectId=${subjectId}` : ''
      const { cards } = await apiFetch<{ cards: DueFlashcard[] }>(`/api/review/due${qs}`)
      return cards
    },
  })
}

export function useReviewStats() {
  return useQuery({
    queryKey: ['review-stats'],
    queryFn: async () => await apiFetch<ReviewStats>('/api/review/stats'),
    staleTime: 30_000,
  })
}

export function useGradeFlashcard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      flashcardId: string
      choice: FlashcardChoice
      timeSpentMs?: number
    }) => {
      return await apiFetch('/api/review/grade', {
        method: 'POST',
        body: JSON.stringify({
          flashcardId: input.flashcardId,
          quality: CHOICE_TO_QUALITY[input.choice],
          timeSpentMs: input.timeSpentMs,
        }),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review-due'] })
      qc.invalidateQueries({ queryKey: ['review-stats'] })
    },
  })
}
