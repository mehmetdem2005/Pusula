import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

export interface WordDefinition {
  partOfSpeech: string
  definition: string
  example?: string
  synonyms?: string[]
}

export interface DictResult {
  word: string
  ipa?: string
  pronunciationAudioUrl?: string
  definitions: WordDefinition[]
  translations: string[]
  examples?: Array<{ source: string; translation: string }>
  source: 'cache' | 'free-dict' | 'gemini'
}

export interface VocabularyItem {
  id: string
  word: string
  language: string
  ipa: string | null
  definitions: WordDefinition[] | null
  translations: any
  source_book_id: string | null
  source_sentence: string | null
  encounters: number
  status: 'new' | 'learning' | 'reviewing' | 'mastered' | 'ignored'
  added_at: string
  last_seen_at: string
}

export interface SentenceTranslation {
  translation: string
  alternatives: Array<{ translation: string; note?: string }>
  notes?: string
  source: string
}

export function useLookupWord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      word: string
      sourceLang?: string
      targetLang?: string
      context?: string
      bookId?: string
      sentenceText?: string
      saveToVocab?: boolean
    }) =>
      apiFetch<DictResult>('/api/dictionary/lookup', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocabulary'] }),
  })
}

export function useBatchLookup() {
  return useMutation({
    mutationFn: (input: { words: string[]; sourceLang?: string; targetLang?: string }) =>
      apiFetch<{ results: Array<DictResult & { error?: string }> }>(
        '/api/dictionary/batch-lookup',
        {
          method: 'POST',
          body: JSON.stringify(input),
        },
      ),
  })
}

export function useTranslateSentence() {
  return useMutation({
    mutationFn: (input: {
      text: string
      sourceLang?: string
      targetLang?: string
      literary?: boolean
    }) =>
      apiFetch<SentenceTranslation>('/api/dictionary/translate-sentence', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  })
}

export function useVocabulary(filter?: { status?: string; lang?: string; bookId?: string }) {
  return useQuery({
    queryKey: ['vocabulary', filter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filter?.status) params.set('status', filter.status)
      if (filter?.lang) params.set('lang', filter.lang)
      if (filter?.bookId) params.set('bookId', filter.bookId)
      const result = await apiFetch<{ vocabulary: VocabularyItem[] }>(`/api/vocabulary?${params}`)
      return result.vocabulary
    },
  })
}

export function useUpdateVocabStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      id: string
      status: 'learning' | 'reviewing' | 'mastered' | 'ignored'
    }) =>
      apiFetch(`/api/vocabulary/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: input.status }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocabulary'] }),
  })
}

export function useWordFrequency(language: string, opts?: { limit?: number; cefr?: string }) {
  return useQuery({
    queryKey: ['word-freq', language, opts],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (opts?.limit) params.set('limit', String(opts.limit))
      if (opts?.cefr) params.set('cefr', opts.cefr)
      const result = await apiFetch<{
        words: Array<{ word: string; rank: number; cefr_level: string | null }>
      }>(`/api/word-frequency/${language}?${params}`)
      return result.words
    },
  })
}
