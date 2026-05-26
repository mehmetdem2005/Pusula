import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

export interface LLMModel {
  id: string
  provider: string
  model_id: string
  display_name: string
  description: string | null
  context_window: number | null
  category: 'fast' | 'versatile' | 'vision' | 'reasoning' | 'compound' | 'safety' | 'stt'
  is_recommended: boolean
  is_active: boolean
}

export function useModels() {
  return useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const { models } = await apiFetch<{ models: LLMModel[] }>('/api/models')
      return models
    },
    staleTime: 5 * 60_000, // 5 dk
  })
}

export function useChatModels() {
  const q = useModels()
  return {
    ...q,
    data: q.data?.filter((m) =>
      ['fast', 'versatile', 'vision', 'reasoning', 'compound'].includes(m.category),
    ),
  }
}
