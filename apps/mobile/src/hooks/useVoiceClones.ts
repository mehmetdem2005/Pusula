import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

export interface VoiceClone {
  id: string
  name: string
  description: string | null
  language: string
  status: 'processing' | 'ready' | 'failed'
  is_default: boolean
  use_count: number
  created_at: string
  ready_at: string | null
}

const VOICE_BASE = process.env.EXPO_PUBLIC_VOICE_BASE_URL ?? 'http://localhost:4002'

export function useVoiceClones() {
  return useQuery({
    queryKey: ['voice-clones'],
    queryFn: async () => {
      const { clones } = await apiFetch<{ clones: VoiceClone[] }>('/api/voice-clones', {})
      return clones
    },
  })
}

/**
 * Voice clone oluşturma 2 aşamalı:
 *   1. /upload-url ile signed URL al
 *   2. Audio'yu PUT et → uploadedSize sıfırdan büyükse OK
 *   3. /voice-clones POST ile kaydı oluştur
 */
export function useCreateVoiceClone() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      audioUri: string // local file uri
      audioBlob?: Blob // web için
      name: string
      description?: string
      referenceText: string
      language?: string
    }) => {
      // 1. Upload URL al
      const uploadInfo = await apiFetch<{
        cloneId: string
        uploadUrl: string
        storagePath: string
        token: string
      }>(`${VOICE_BASE}/api/voice-clones/upload-url`, { method: 'POST' })

      // 2. Audio'yu yükle
      let audioBlob: Blob
      if (input.audioBlob) {
        audioBlob = input.audioBlob
      } else {
        const r = await fetch(input.audioUri)
        audioBlob = await r.blob()
      }

      const uploadRes = await fetch(uploadInfo.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'audio/wav' },
        body: audioBlob,
      })
      if (!uploadRes.ok) throw new Error(`Upload başarısız: ${uploadRes.status}`)

      // 3. Klonu oluştur
      const result = await apiFetch<{ clone: VoiceClone }>(`${VOICE_BASE}/api/voice-clones`, {
        method: 'POST',
        body: JSON.stringify({
          name: input.name,
          description: input.description,
          storagePath: uploadInfo.storagePath,
          durationSeconds: 30, // estimate; gerçek validation server'da
          referenceText: input.referenceText,
          language: input.language ?? 'tr',
        }),
      })

      return result.clone
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['voice-clones'] }),
  })
}

export function useSetDefaultVoiceClone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      apiFetch(`${VOICE_BASE}/api/voice-clones/${id}/default`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['voice-clones'] }),
  })
}

export function useDeleteVoiceClone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      apiFetch(`${VOICE_BASE}/api/voice-clones/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['voice-clones'] }),
  })
}
