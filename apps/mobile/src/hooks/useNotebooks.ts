import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

// ============ TYPES ============

export interface Notebook {
  id: string
  title: string
  description: string | null
  emoji: string
  color: string
  language: string
  is_archived: boolean
  is_pinned: boolean
  source_count: number
  message_count: number
  generated_content_count: number
  last_accessed_at: string
  created_at: string
}

export interface NotebookSource {
  id: string
  source_type: 'pdf' | 'url' | 'youtube' | 'audio' | 'text' | 'epub' | 'docx'
  title: string
  storage_path: string | null
  external_url: string | null
  language: string | null
  word_count: number | null
  status: 'pending' | 'processing' | 'ready' | 'failed'
  chunk_count: number
  error_message: string | null
  created_at: string
  metadata: any
}

export interface NotebookMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations: Array<{
    chunk_id: string
    source_id: string
    source_title: string
    snippet: string
    page_number: number | null
    start_time_ms: number | null
    end_time_ms: number | null
  }>
  created_at: string
}

export interface GeneratedContent {
  id: string
  content_type: 'audio_overview' | 'flashcards' | 'quiz' | 'slides' | 'summary' | 'infographic'
  title: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
  storage_path: string | null
  raw_content: any
  duration_seconds: number | null
  created_at: string
  ready_at: string | null
  error_message: string | null
}

// ============ NOTEBOOKS ============

export function useNotebooks(archived = false) {
  return useQuery({
    queryKey: ['notebooks', { archived }],
    queryFn: () =>
      apiFetch<{ notebooks: Notebook[] }>(`/api/notebooks?archived=${archived}`).then(
        (r) => r.notebooks,
      ),
  })
}

export function useNotebook(id: string | null) {
  return useQuery({
    queryKey: ['notebook', id],
    queryFn: () =>
      apiFetch<{
        notebook: Notebook
        sources: NotebookSource[]
        generatedContent: GeneratedContent[]
      }>(`/api/notebooks/${id}`),
    enabled: !!id,
    refetchInterval: (query) => {
      // Auto-refetch if any source is processing
      const data = query.state.data
      const hasProcessing = data?.sources?.some(
        (s) => s.status === 'pending' || s.status === 'processing',
      )
      const hasGenerating = data?.generatedContent?.some(
        (g) => g.status === 'pending' || g.status === 'processing',
      )
      return hasProcessing || hasGenerating ? 3000 : false
    },
  })
}

export function useCreateNotebook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      title: string
      description?: string
      emoji?: string
      color?: string
      language?: string
    }) =>
      apiFetch<{ notebook: Notebook }>('/api/notebooks', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notebooks'] }),
  })
}

export function useUpdateNotebook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; updates: Partial<Notebook> }) =>
      apiFetch(`/api/notebooks/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify(input.updates),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['notebooks'] })
      qc.invalidateQueries({ queryKey: ['notebook', vars.id] })
    },
  })
}

export function useDeleteNotebook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/notebooks/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notebooks'] }),
  })
}

// ============ SOURCES ============

export function useUploadSource() {
  return useMutation({
    mutationFn: async (input: { file: Blob; fileName: string }) => {
      const upload = await apiFetch<{ uploadUrl: string; storagePath: string }>(
        '/api/sources/upload-url',
        { method: 'POST', body: JSON.stringify({ fileName: input.fileName }) },
      )

      const res = await fetch(upload.uploadUrl, {
        method: 'PUT',
        body: input.file,
      })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      return { storagePath: upload.storagePath }
    },
  })
}

export function useCreateSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      notebookId: string
      sourceType: NotebookSource['source_type']
      title: string
      storagePath?: string
      externalUrl?: string
      rawText?: string
    }) =>
      apiFetch<{ source: NotebookSource }>('/api/sources', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['notebook', vars.notebookId] })
    },
  })
}

export function useDeleteSource() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; notebookId: string }) =>
      apiFetch(`/api/sources/${input.id}`, { method: 'DELETE' }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['notebook', vars.notebookId] })
    },
  })
}

// ============ CHAT ============

export function useNotebookMessages(notebookId: string | null) {
  return useQuery({
    queryKey: ['notebook-messages', notebookId],
    queryFn: () =>
      apiFetch<{ messages: NotebookMessage[] }>(`/api/notebooks/${notebookId}/messages`).then(
        (r) => r.messages,
      ),
    enabled: !!notebookId,
  })
}

export function useNotebookChat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      notebookId: string
      message: string
      history?: Array<{ role: 'user' | 'assistant'; content: string }>
    }) =>
      apiFetch<{
        content: string
        citations: NotebookMessage['citations']
        model: string
        tokensInput: number
        tokensOutput: number
      }>(`/api/notebooks/${input.notebookId}/chat`, {
        method: 'POST',
        body: JSON.stringify({
          message: input.message,
          history: input.history ?? [],
        }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['notebook-messages', vars.notebookId] })
      qc.invalidateQueries({ queryKey: ['notebook', vars.notebookId] })
    },
  })
}

export function useClearChat() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (notebookId: string) =>
      apiFetch(`/api/notebooks/${notebookId}/messages`, { method: 'DELETE' }),
    onSuccess: (_, notebookId) => {
      qc.invalidateQueries({ queryKey: ['notebook-messages', notebookId] })
    },
  })
}

// ============ STUDIO ============

export function useGenerateContent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      notebookId: string
      contentType: GeneratedContent['content_type']
      config?: {
        duration?: 'short' | 'medium' | 'long'
        style?: string
        language?: string
        cardCount?: number
        slideCount?: number
      }
      sourceIds?: string[]
    }) =>
      apiFetch<{ generated: GeneratedContent }>('/api/studio/generate', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['notebook', vars.notebookId] })
    },
  })
}

export function useGeneratedContent(id: string | null) {
  return useQuery({
    queryKey: ['generated', id],
    queryFn: () => apiFetch<GeneratedContent & { audioUrl?: string }>(`/api/studio/${id}`),
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data
      return data?.status === 'pending' || data?.status === 'processing' ? 3000 : false
    },
  })
}

export function useDeleteGenerated() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; notebookId: string }) =>
      apiFetch(`/api/studio/${input.id}`, { method: 'DELETE' }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['notebook', vars.notebookId] })
    },
  })
}

// ============ PODCAST SYNTHESIS ============

export function useSynthesizePodcast() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (generatedContentId: string) =>
      apiFetch('/api/podcast/synthesize', {
        method: 'POST',
        body: JSON.stringify({ generatedContentId }),
      }),
    onSuccess: (_, id) => qc.invalidateQueries({ queryKey: ['generated', id] }),
  })
}

export interface PodcastManifest {
  totalDurationMs: number
  totalTurns: number
  language: string
  segments: Array<{
    offset: number
    durationMs: number
    speaker: 'A' | 'B'
    text: string
    audioUrl: string
  }>
}

export function usePodcastManifest(generatedContentId: string | null) {
  return useQuery({
    queryKey: ['podcast-manifest', generatedContentId],
    queryFn: () => apiFetch<PodcastManifest>(`/api/podcast/${generatedContentId}/manifest`),
    enabled: !!generatedContentId,
  })
}
