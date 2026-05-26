import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

export interface Achievement {
  id: string
  name: string
  description: string
  emoji: string
  category: string
  threshold: number | null
  earned: boolean
  earned_at: string | null
  display_order: number
}

export interface Goal {
  id: string
  user_id: string
  subject_id: string | null
  wish: string
  outcome: string
  obstacle: string | null
  plan: string | null
  target_date: string | null
  completed: boolean
  completed_at: string | null
  created_at: string
  subjects?: { name: string; icon: string }
}

export interface FocusSession {
  id: string
  type: 'pomodoro' | 'deep_work' | 'review_block'
  planned_duration_minutes: number
  actual_duration_minutes: number | null
  completed: boolean
  interrupted_count: number
  notes: string | null
  started_at: string
  completed_at: string | null
}

// ============ ACHIEVEMENTS ============

export function useAchievements() {
  return useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      return await apiFetch<{
        achievements: Achievement[]
        earnedCount: number
        totalCount: number
      }>('/api/achievements')
    },
  })
}

export function useCheckAchievements() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      return await apiFetch<{ newAchievements: Achievement[] }>('/api/achievements/check', {
        method: 'POST',
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['achievements'] }),
  })
}

// ============ STREAK ============

export function useStreak() {
  return useQuery({
    queryKey: ['streak'],
    queryFn: async () => {
      return await apiFetch<{
        currentStreak: number
        longestStreak: number
        lastActivityDate: string | null
      }>('/api/streak')
    },
    staleTime: 60_000,
  })
}

// ============ GOALS (WOOP) ============

export function useGoals() {
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { goals } = await apiFetch<{ goals: Goal[] }>('/api/goals')
      return goals
    },
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      subjectId?: string
      wish: string
      outcome: string
      obstacle?: string
      plan?: string
      targetDate?: string
    }) => {
      return await apiFetch<{ goal: Goal }>('/api/goals', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useCompleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      return await apiFetch(`/api/goals/${id}/complete`, { method: 'POST' })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

// ============ FOCUS / POMODORO ============

export function useStartFocus() {
  return useMutation({
    mutationFn: async (input: {
      type: 'pomodoro' | 'deep_work' | 'review_block'
      plannedMinutes: number
      subjectId?: string
    }) => {
      return await apiFetch<{ focusId: string }>('/api/focus/start', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
  })
}

export function useCompleteFocus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      focusId: string
      actualMinutes: number
      completed?: boolean
      interruptedCount?: number
      notes?: string
    }) => {
      return await apiFetch('/api/focus/complete', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['focus-today'] })
      qc.invalidateQueries({ queryKey: ['achievements'] })
    },
  })
}

export function useTodayFocus() {
  return useQuery({
    queryKey: ['focus-today'],
    queryFn: async () => {
      return await apiFetch<{ sessions: FocusSession[]; totalMinutes: number }>('/api/focus/today')
    },
  })
}
