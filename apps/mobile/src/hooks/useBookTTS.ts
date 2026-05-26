import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

export interface WordTiming {
  word: string
  startMs: number
  endMs: number
}

export interface SentenceAudio {
  audioUrl: string
  durationMs: number
  wordTimings: WordTiming[]
  source: 'cache' | 'edge' | 'elevenlabs'
}

export interface BookTTSSettings {
  engine: 'edge' | 'piper' | 'elevenlabs' | 'azure'
  voice_id: string | null
  speed: number
  pitch: number
  highlight_color: string
  highlight_mode: 'word' | 'sentence' | 'off'
  auto_advance: boolean
}

export function useSynthesizeSentence() {
  return useMutation({
    mutationFn: (input: {
      text: string
      language: string
      voiceId?: string
      engine?: 'edge' | 'elevenlabs'
      bookId?: string
      sentenceId?: string
    }) =>
      apiFetch<SentenceAudio>('/api/books/tts/sentence', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  })
}

export function usePrefetchChapter() {
  return useMutation({
    mutationFn: (input: {
      bookId: string
      chapterIndex: number
      sentences: Array<{ text: string; sentenceIndex: number }>
      language: string
      voiceId?: string
      engine?: 'edge' | 'elevenlabs'
    }) =>
      apiFetch<{ sentences: Array<{ sentenceIndex: number } & Partial<SentenceAudio>> }>(
        '/api/books/tts/chapter',
        { method: 'POST', body: JSON.stringify(input) },
      ),
  })
}

export function useTTSSettings() {
  return useQuery({
    queryKey: ['tts-settings'],
    queryFn: () => apiFetch<BookTTSSettings>('/api/books/tts/settings'),
  })
}

export function useUpdateTTSSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Partial<BookTTSSettings>) =>
      apiFetch('/api/books/tts/settings', {
        method: 'PUT',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tts-settings'] }),
  })
}
