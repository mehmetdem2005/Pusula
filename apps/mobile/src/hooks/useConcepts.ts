import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'
import { supabase } from '../lib/supabase'

export interface Concept {
  id: string
  subject_id: string
  parent_concept_id: string | null
  name: string
  description: string | null
  difficulty: number
  prerequisites: string[]
  created_at: string
}

export interface Progress {
  concept_id: string
  mastery_score: number
  ease_factor: number
  interval_days: number
  repetitions: number
  confidence: number
  next_review_at: string | null
  last_reviewed_at: string | null
}

export interface ConceptWithProgress extends Concept {
  progress?: Progress
}

export function useConcepts(subjectId: string | null) {
  return useQuery({
    queryKey: ['concepts', subjectId],
    enabled: !!subjectId,
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Oturum yok')

      const [conceptsResp, progressResp] = await Promise.all([
        supabase
          .from('concepts')
          .select('*')
          .eq('subject_id', subjectId!)
          .order('created_at', { ascending: true }),
        supabase.from('progress').select('*').eq('user_id', userData.user.id),
      ])

      if (conceptsResp.error) throw conceptsResp.error

      const progressMap = new Map((progressResp.data ?? []).map((p: any) => [p.concept_id, p]))

      return (conceptsResp.data ?? []).map((c: any) => ({
        ...c,
        progress: progressMap.get(c.id),
      })) as ConceptWithProgress[]
    },
  })
}

export function useConcept(id: string | null) {
  return useQuery({
    queryKey: ['concept', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('concepts').select('*').eq('id', id!).single()
      if (error) throw error
      return data as Concept
    },
  })
}

export function useCreateConcept() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      subjectId: string
      name: string
      description?: string
      difficulty?: number
      parentConceptId?: string | null
      prerequisites?: string[]
    }) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Oturum yok')

      const { data, error } = await supabase
        .from('concepts')
        .insert({
          subject_id: input.subjectId,
          name: input.name,
          description: input.description ?? null,
          difficulty: input.difficulty ?? 1,
          parent_concept_id: input.parentConceptId ?? null,
          prerequisites: input.prerequisites ?? [],
        })
        .select()
        .single()
      if (error) throw error

      // Auto-embed — arka planda, hata verse de umursama
      apiFetch(`/api/concepts/${data.id}/embed`, { method: 'POST' }).catch((e) => {
        console.warn('Concept embed arka planda başarısız:', e.message)
      })

      return data as Concept
    },
    onSuccess: (concept) => {
      qc.invalidateQueries({ queryKey: ['concepts', concept.subject_id] })
    },
  })
}

export function useUpdateConcept() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<Concept> & { id: string }) => {
      const { id, ...rest } = input
      const { data, error } = await supabase
        .from('concepts')
        .update(rest)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error

      // Description değiştiyse re-embed
      if ('description' in rest || 'name' in rest) {
        apiFetch(`/api/concepts/${id}/embed`, { method: 'POST' }).catch(() => {})
      }

      return data as Concept
    },
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ['concepts', c.subject_id] })
      qc.invalidateQueries({ queryKey: ['concept', c.id] })
    },
  })
}

export function useDeleteConcept() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (params: { id: string; subjectId: string }) => {
      const { error } = await supabase.from('concepts').delete().eq('id', params.id)
      if (error) throw error
      return params
    },
    onSuccess: (params) => {
      qc.invalidateQueries({ queryKey: ['concepts', params.subjectId] })
    },
  })
}
