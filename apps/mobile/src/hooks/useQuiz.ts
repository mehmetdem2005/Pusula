import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

export interface QuizQuestion {
  id: string
  position: number
  type: 'multiple_choice' | 'true_false' | 'open_ended' | 'fill_blank'
  prompt: string
  choices?: { a: string; b: string; c: string; d: string }
  difficulty: number
}

export interface Quiz {
  id: string
  title: string
  question_count: number
  difficulty_avg: number
  source: string
  created_at: string
}

export interface SubmitResult {
  questionId: string
  isCorrect: boolean
  userAnswer: string
  correctAnswer: string
  explanation: string
}

export function useGenerateQuiz() {
  return useMutation({
    mutationFn: async (input: {
      source: 'concept' | 'document' | 'subject'
      sourceId: string
      questionCount?: number
      difficulty?: 'easy' | 'medium' | 'hard' | 'mixed'
      types?: Array<'multiple_choice' | 'true_false' | 'open_ended'>
    }) => {
      return await apiFetch<{ quizId: string; questionCount: number }>('/api/quiz/generate', {
        method: 'POST',
        body: JSON.stringify(input),
      })
    },
  })
}

export function useQuiz(id: string | null) {
  return useQuery({
    queryKey: ['quiz', id],
    enabled: !!id,
    queryFn: async () => {
      return await apiFetch<{ quiz: Quiz; questions: QuizQuestion[] }>(`/api/quiz/${id}`)
    },
  })
}

export function useSubmitQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      quizId: string
      answers: Array<{ questionId: string; userAnswer: string; timeSpentMs?: number }>
    }) => {
      return await apiFetch<{
        score: number
        total: number
        accuracy: number
        results: SubmitResult[]
      }>('/api/quiz/submit', { method: 'POST', body: JSON.stringify(input) })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['errors'] })
      qc.invalidateQueries({ queryKey: ['stats'] })
    },
  })
}
