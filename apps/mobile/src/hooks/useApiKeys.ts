import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

export interface ApiKeyRow {
  id: string
  provider: 'groq' | 'openai' | 'anthropic'
  label: string
  key_last4: string
  is_default: boolean
  is_active: boolean
  last_test_success: boolean | null
  last_used_at: string | null
  created_at: string
}

export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: async () => {
      const { keys } = await apiFetch<{ keys: ApiKeyRow[] }>('/api/keys')
      return keys
    },
  })
}

export function useAddApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { label: string; key: string; provider?: string }) =>
      await apiFetch<{ key: ApiKeyRow }>('/api/keys', {
        method: 'POST',
        body: JSON.stringify({
          provider: input.provider ?? 'groq',
          label: input.label,
          key: input.key,
        }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  })
}

export function useDeleteApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => await apiFetch(`/api/keys/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  })
}

export function useTestApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) =>
      await apiFetch<{ success: boolean }>(`/api/keys/${id}/test`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  })
}

export function useSetDefaultApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => await apiFetch(`/api/keys/${id}/default`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['api-keys'] }),
  })
}
