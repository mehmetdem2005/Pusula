import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

export interface AIImage {
  id: string
  prompt: string
  refined_prompt: string | null
  model: string
  image_url: string
  publicUrl: string
  width: number | null
  height: number | null
  created_at: string
}

export interface GenerateImageResult {
  id: string
  imageUrl: string
  prompt: string
  refinedPrompt: string
  model: string
  generationTimeMs: number
  usage: { used: number; limit: number }
}

export function useGenerateImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      prompt: string
      conversationId?: string
      model?: 'flux-schnell' | 'flux-dev' | 'sdxl'
      aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
    }) =>
      apiFetch<GenerateImageResult>('/api/ai-images/generate', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-images'] }),
  })
}

export function useAIImages() {
  return useQuery({
    queryKey: ['ai-images'],
    queryFn: () => apiFetch<{ images: AIImage[] }>('/api/ai-images'),
  })
}

export function useDeleteAIImage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/ai-images/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-images'] }),
  })
}
