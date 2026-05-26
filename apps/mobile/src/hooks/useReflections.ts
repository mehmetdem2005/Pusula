import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

export interface Reflection {
  id: string
  user_id: string
  date: string
  mood: number | null
  energy: number | null
  what_learned: string | null
  what_struggled: string | null
  tomorrow_focus: string | null
  created_at: string
}

export interface WeeklyReport {
  id: string
  week_start: string
  week_end: string
  total_minutes: number
  total_lessons: number
  total_reviews: number
  total_quiz_attempts: number
  quiz_accuracy: number | null
  highlights: { most_active_subject?: string; best_day?: string } | null
  ai_narrative: string | null
  ai_recommendations: string[] | null
  created_at: string
}

export function useReflections(days = 30) {
  return useQuery({
    queryKey: ['reflections', days],
    queryFn: async () => {
      const { reflections } = await apiFetch<{ reflections: Reflection[] }>(
        `/api/reflections?days=${days}`,
      )
      return reflections
    },
  })
}

export function useTodayReflection() {
  const today = new Date().toISOString().slice(0, 10)
  const q = useReflections(1)
  return {
    ...q,
    data: q.data?.find((r) => r.date === today) ?? null,
  }
}

export function useUpsertReflection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      date: string
      mood?: number
      energy?: number
      what_learned?: string
      what_struggled?: string
      tomorrow_focus?: string
    }) => {
      return await apiFetch('/api/reflections', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reflections'] }),
  })
}

export function useWeeklyReports() {
  return useQuery({
    queryKey: ['weekly-reports'],
    queryFn: async () => {
      const { reports } = await apiFetch<{ reports: WeeklyReport[] }>('/api/reports/weekly')
      return reports
    },
  })
}

export function useGenerateWeeklyReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (weekStart?: string) => {
      return await apiFetch<{ report: WeeklyReport | null; cached?: boolean; message?: string }>(
        '/api/reports/weekly',
        {
          method: 'POST',
          body: JSON.stringify(weekStart ? { weekStart } : {}),
        },
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weekly-reports'] }),
  })
}
