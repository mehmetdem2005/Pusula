import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

export interface ErrorRow {
  id: string
  user_id: string
  concept_id: string | null
  subject_id: string | null
  source_type: 'quiz' | 'flashcard' | 'lesson_self_report' | 'manual'
  user_answer: string | null
  correct_answer: string | null
  mistake_summary: string
  root_causes: {
    root_causes?: string[]
    suggested_action?: string
    connected_concepts?: string[]
  } | null
  resolved: boolean
  created_at: string
}

export interface SubjectStats {
  total_concepts: number
  mastered_concepts: number
  due_flashcards: number
  total_flashcards: number
  total_lessons: number
  total_quiz_attempts: number
  quiz_accuracy: number
  unresolved_errors: number
  last_lesson_at: string | null
  total_minutes: number
}

export function useErrors(opts: { subjectId?: string; conceptId?: string } = {}) {
  return useQuery({
    queryKey: ['errors', opts.subjectId, opts.conceptId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (opts.subjectId) params.set('subjectId', opts.subjectId)
      if (opts.conceptId) params.set('conceptId', opts.conceptId)
      const qs = params.toString()
      const { errors } = await apiFetch<{ errors: ErrorRow[] }>(`/api/errors${qs ? `?${qs}` : ''}`)
      return errors
    },
  })
}

export function useFiveWhys() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (errorId: string) => {
      return await apiFetch<{
        root_causes: string[]
        suggested_action: string
        connected_concepts: string[]
      }>('/api/errors/five-whys', {
        method: 'POST',
        body: JSON.stringify({ errorId }),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['errors'] }),
  })
}

export function useResolveError() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { errorId: string; resolutionLessonId?: string }) => {
      return await apiFetch('/api/errors/resolve', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['errors'] }),
  })
}

export function useSubjectStats(subjectId: string | null) {
  return useQuery({
    queryKey: ['subject-stats', subjectId],
    enabled: !!subjectId,
    queryFn: async () => {
      const { stats } = await apiFetch<{ stats: SubjectStats }>(`/api/subjects/${subjectId}/stats`)
      return stats
    },
  })
}
