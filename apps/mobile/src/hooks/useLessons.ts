import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { apiFetch, apiStream } from '../lib/api'
import { supabase } from '../lib/supabase'

export interface Lesson {
  id: string
  user_id: string
  subject_id: string | null
  concept_id: string | null
  technique_id: string | null
  personality_id: string | null
  model_id: string | null
  status: 'active' | 'completed' | 'abandoned'
  user_rating: number | null
  started_at: string
  completed_at: string | null
}

export interface Message {
  id: string
  lesson_id: string
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  content_type: string
  created_at: string
  metadata?: any
}

export interface EngineMeta {
  context: string
  intent: string
  techniqueCode: string
  techniqueName: string
  activeBehaviors: string[]
  hasRAG: boolean
  ragSources: Array<{ doc?: string; page?: number; similarity: number }>
}

export function useRecentLessons(limit = 20) {
  return useQuery({
    queryKey: ['lessons', 'recent', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data as Lesson[]
    },
  })
}

export function useLesson(id: string | null) {
  return useQuery({
    queryKey: ['lesson', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('*, techniques(id, code, name), personalities(id, name, emoji)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Lesson & { techniques?: any; personalities?: any }
    },
  })
}

export function useMessages(lessonId: string | null) {
  return useQuery({
    queryKey: ['messages', lessonId],
    enabled: !!lessonId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('lesson_id', lessonId!)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as Message[]
    },
  })
}

export function useCreateLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      subjectId?: string
      conceptId?: string
      techniqueId?: string
      personalityId?: string
      modelId?: string
    }) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Giriş yapılmamış')

      const { data, error } = await supabase
        .from('lessons')
        .insert({
          user_id: userData.user.id,
          subject_id: input.subjectId ?? null,
          concept_id: input.conceptId ?? null,
          technique_id: input.techniqueId ?? null,
          personality_id: input.personalityId ?? null,
          model_id: input.modelId ?? null,
          status: 'active',
        })
        .select()
        .single()
      if (error) throw error
      return data as Lesson
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lessons'] }),
  })
}

/**
 * Streaming mesaj gönderimi.
 * Engine'den gelen meta event'i de yakalar ve state'e yazar.
 */
export function useSendMessage(lessonId: string | null) {
  const qc = useQueryClient()
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [engineMeta, setEngineMeta] = useState<EngineMeta | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(
    async (content: string, modelId?: string) => {
      if (!lessonId) return
      setError(null)
      setIsStreaming(true)
      setStreamingText('')
      setEngineMeta(null)

      qc.setQueryData<Message[]>(['messages', lessonId], (old = []) => [
        ...old,
        {
          id: `temp-${Date.now()}`,
          lesson_id: lessonId,
          role: 'user',
          content,
          content_type: 'text',
          created_at: new Date().toISOString(),
        },
      ])

      const controller = new AbortController()
      abortRef.current = controller

      let fullText = ''
      try {
        await apiStream(
          '/api/chat/stream',
          { lessonId, content, modelId },
          (raw) => {
            // Meta event kontrolü
            try {
              const data = JSON.parse(raw)
              if (data.meta) {
                setEngineMeta(data.meta)
                return
              }
              if (data.delta) {
                fullText += data.delta
                setStreamingText(fullText)
              }
            } catch {
              // Plain delta string
              fullText += raw
              setStreamingText(fullText)
            }
          },
          controller.signal,
        )
        await qc.invalidateQueries({ queryKey: ['messages', lessonId] })
        qc.invalidateQueries({ queryKey: ['lesson', lessonId] })
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setError(e.message ?? 'Beklenmeyen hata')
        }
      } finally {
        setIsStreaming(false)
        setStreamingText('')
        abortRef.current = null
      }
    },
    [lessonId, qc],
  )

  const cancel = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { send, cancel, streamingText, isStreaming, error, engineMeta }
}

/**
 * Ders sonu rating gönder. Engine bandit arm'ları günceller.
 */
export function useRateLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      lessonId: string
      rating: number
      completed?: boolean
    }) => {
      return await apiFetch('/api/engine/outcome', {
        method: 'POST',
        body: JSON.stringify({
          lessonId: input.lessonId,
          userRating: input.rating,
          completed: input.completed ?? true,
        }),
      })
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['lesson', vars.lessonId] })
      qc.invalidateQueries({ queryKey: ['lessons'] })
    },
  })
}
