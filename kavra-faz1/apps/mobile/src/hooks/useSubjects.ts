import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface Subject {
  id: string
  user_id: string
  name: string
  description: string | null
  target_level: string | null
  target_date: string | null
  color: string
  icon: string | null
  is_active: boolean
  created_at: string
}

export interface Personality {
  id: string
  name: string
  system_prompt_fragment: string
  recommended_temperature: number
  recommended_voice: string | null
  emoji: string | null
  is_preset: boolean
}

export function useSubjects() {
  return useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Subject[]
    },
  })
}

export function useCreateSubject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      name: string
      description?: string
      color?: string
      icon?: string
    }) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Giriş yapılmamış')

      const { data, error } = await supabase
        .from('subjects')
        .insert({
          user_id: userData.user.id,
          name: input.name,
          description: input.description ?? null,
          color: input.color ?? '#4F46E5',
          icon: input.icon ?? '📘',
        })
        .select()
        .single()
      if (error) throw error
      return data as Subject
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subjects'] }),
  })
}

export function usePersonalities() {
  return useQuery({
    queryKey: ['personalities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personalities')
        .select('*')
        .order('is_preset', { ascending: false })
      if (error) throw error
      return data as Personality[]
    },
  })
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return null
      const { data, error } = await supabase
        .from('profiles')
        .select('*, user_preferences(*)')
        .eq('id', userData.user.id)
        .single()
      if (error) throw error
      return data
    },
  })
}

export function useUpdateOnboarding() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (completed: boolean) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Giriş yapılmamış')
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: completed })
        .eq('id', userData.user.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })
}
