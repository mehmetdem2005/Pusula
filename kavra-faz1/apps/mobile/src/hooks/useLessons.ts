import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef, useState } from 'react'
import { apiStream } from '../lib/api'
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
        .select('*, techniques(*), personalities(*)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Lesson
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lessons'] })
    },
  })
}

/**
 * Streaming mesaj gönderme hook'u.
 * Kullanıcı mesajı yazar → gönderilir → asistan yanıtı stream gelir.
 * streamingText state'i UI'da anlık gösterilir, bittiğinde messages cache'i invalide edilir.
 */
export function useSendMessage(lessonId: string | null) {
  const qc = useQueryClient()
  const [streamingText, setStreamingText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(
    async (content: string, modelId?: string) => {
      if (!lessonId) return
      setError(null)
      setIsStreaming(true)
      setStreamingText('')

      // Optimistic: kullanıcı mesajını hemen cache'e ekle
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
          (delta) => {
            fullText += delta
            setStreamingText(fullText)
          },
          controller.signal,
        )
        // Stream bitti → backend kendi kaydetti → yeniden yükle
        await qc.invalidateQueries({ queryKey: ['messages', lessonId] })
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

  return { send, cancel, streamingText, isStreaming, error }
}
