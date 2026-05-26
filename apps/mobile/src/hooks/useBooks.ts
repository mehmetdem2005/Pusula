import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../lib/api'

export interface Book {
  id: string
  title: string
  author: string | null
  cover_url: string | null
  language: string
  format: 'epub' | 'pdf' | 'txt'
  storage_path: string | null
  total_pages: number | null
  total_words: number | null
  estimated_minutes: number | null
  current_cfi: string | null
  current_page: number
  current_position: number
  status: 'not_started' | 'reading' | 'finished' | 'archived'
  last_read_at: string | null
  total_reading_seconds: number
  created_at: string
}

export interface BookBookmark {
  id: string
  cfi: string | null
  page: number | null
  position: number | null
  selected_text: string | null
  note: string | null
  color: string
  created_at: string
}

export function useBooks(filter?: { status?: string; language?: string }) {
  return useQuery({
    queryKey: ['books', filter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filter?.status) params.set('status', filter.status)
      if (filter?.language) params.set('language', filter.language)
      const result = await apiFetch<{ books: Book[] }>(`/api/books?${params}`)
      return result.books
    },
  })
}

export function useBook(id: string | null) {
  return useQuery({
    queryKey: ['book', id],
    queryFn: () =>
      apiFetch<{ book: Book; bookmarks: BookBookmark[]; vocabularyCount: number }>(
        `/api/books/${id}`,
      ),
    enabled: !!id,
  })
}

export function useCreateBook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      title: string
      author?: string
      language: string
      format: 'epub' | 'pdf' | 'txt'
      storagePath?: string
      libraryDocumentId?: string
      totalPages?: number
      totalWords?: number
      coverUrl?: string
    }) => apiFetch<{ book: Book }>('/api/books', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books'] }),
  })
}

export function useUpdateBookProgress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      bookId: string
      currentCfi?: string
      currentPage?: number
      currentPosition?: number
      readSeconds?: number
    }) =>
      apiFetch(`/api/books/${input.bookId}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({
          currentCfi: input.currentCfi,
          currentPage: input.currentPage,
          currentPosition: input.currentPosition,
          readSeconds: input.readSeconds ?? 0,
        }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['book', vars.bookId] })
    },
  })
}

export function useDeleteBook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/books/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books'] }),
  })
}

export function useUploadBook() {
  return useMutation({
    mutationFn: async (input: {
      file: Blob
      fileName: string
      format: 'epub' | 'pdf' | 'txt'
    }) => {
      const upload = await apiFetch<{ uploadUrl: string; storagePath: string }>(
        '/api/books/upload-url',
        {
          method: 'POST',
          body: JSON.stringify({ fileName: input.fileName, format: input.format }),
        },
      )

      const uploadRes = await fetch(upload.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': input.format === 'epub' ? 'application/epub+zip' : 'application/pdf',
        },
        body: input.file,
      })
      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`)

      return { storagePath: upload.storagePath }
    },
  })
}

// ===== READING SESSIONS =====

export function useStartReadingSession() {
  return useMutation({
    mutationFn: (input: { bookId: string; startPosition: number }) =>
      apiFetch<{ session: { id: string } }>('/api/reading-sessions/start', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
  })
}

export function useEndReadingSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      sessionId: string
      endPosition: number
      wordsLookedUp?: number
      sentencesTranslated?: number
      wordsAddedToVocab?: number
    }) =>
      apiFetch('/api/reading-sessions/end', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books'] }),
  })
}

// ===== BOOKMARKS =====

export function useCreateBookmark() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      bookId: string
      cfi?: string
      page?: number
      position?: number
      selectedText?: string
      note?: string
      color?: string
    }) =>
      apiFetch<{ bookmark: BookBookmark }>('/api/bookmarks', {
        method: 'POST',
        body: JSON.stringify(input),
      }),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['book', vars.bookId] }),
  })
}

export function useDeleteBookmark() {
  return useMutation({
    mutationFn: (id: string) => apiFetch(`/api/bookmarks/${id}`, { method: 'DELETE' }),
  })
}

// ===== STATS =====

export function useBookStats(bookId: string | null) {
  return useQuery({
    queryKey: ['book-stats', bookId],
    queryFn: () =>
      apiFetch<{
        totalReadingSeconds: number
        progress: number
        estimatedMinutes: number | null
        sessionsCount: number
        totalWordsLookedUp: number
        totalWordsAddedToVocab: number
        recentSessions: Array<{ date: string; duration: number; lookups: number }>
      }>(`/api/books/${bookId}/stats`),
    enabled: !!bookId,
  })
}
