import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as FileSystem from 'expo-file-system'
import { apiFetch } from '../lib/api'
import { supabase } from '../lib/supabase'

export interface Document {
  id: string
  user_id: string
  subject_id: string | null
  filename: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  page_count: number | null
  status: 'processing' | 'ready' | 'failed'
  error_message: string | null
  created_at: string
}

export interface ExtractedConcept {
  name: string
  description: string
  difficulty: number
  prerequisites?: string[]
}

export interface GeneratedFlashcard {
  id: string
  document_id: string
  front: string
  back: string
  hint: string | null
  difficulty: number
  status: 'pending' | 'accepted' | 'rejected' | 'edited'
  created_at: string
}

const PDF_BASE_URL = process.env.EXPO_PUBLIC_PDF_BASE_URL ?? 'http://localhost:4003'

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Document[]
    },
  })
}

export function useDocument(id: string | null) {
  return useQuery({
    queryKey: ['document', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from('documents').select('*').eq('id', id!).single()
      if (error) throw error
      return data as Document
    },
    refetchInterval: (q) => {
      const status = (q.state.data as Document | undefined)?.status
      return status === 'processing' ? 2000 : false
    },
  })
}

/**
 * PDF/resim Storage'a yükle.
 * Kullanıcı expo-document-picker veya image-picker'dan seçtiği dosyanın URI'sini verir.
 */
export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      uri: string
      filename: string
      mimeType: string
      sizeBytes: number
      subjectId?: string
    }) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Oturum yok')
      const userId = userData.user.id

      // 1. Dosyayı base64 olarak oku
      const base64 = await FileSystem.readAsStringAsync(input.uri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

      // 2. Storage'a yükle
      const ext = input.filename.split('.').pop() ?? 'pdf'
      const storagePath = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('user-documents')
        .upload(storagePath, bytes.buffer, {
          contentType: input.mimeType,
          upsert: false,
        })
      if (uploadErr) throw uploadErr

      // 3. documents tablosuna kayıt
      const { data: doc, error: insertErr } = await supabase
        .from('documents')
        .insert({
          user_id: userId,
          subject_id: input.subjectId ?? null,
          filename: input.filename,
          storage_path: storagePath,
          mime_type: input.mimeType,
          size_bytes: input.sizeBytes,
          status: 'processing',
        })
        .select()
        .single()
      if (insertErr) throw insertErr

      // 4. Worker-pdf'e işleme tetikleme
      try {
        await apiFetch(`${PDF_BASE_URL}/api/documents/process`, {
          method: 'POST',
          body: JSON.stringify({ documentId: doc.id }),
        })
      } catch (e: any) {
        // Worker bağlantı sorunu olsa bile yükleme oldu, status'ü kontrol edebilir
        console.warn('Process tetiklenemedi:', e.message)
      }

      // Yerel dosyayı temizle
      FileSystem.deleteAsync(input.uri, { idempotent: true }).catch(() => {})

      return doc as Document
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  })
}

export function useExtractConcepts() {
  return useMutation({
    mutationFn: async (documentId: string) => {
      const result = await apiFetch<{ documentId: string; concepts: ExtractedConcept[] }>(
        `${PDF_BASE_URL}/api/documents/extract-concepts`,
        { method: 'POST', body: JSON.stringify({ documentId }) },
      )
      return result.concepts
    },
  })
}

export function useGenerateFlashcards() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { documentId: string; maxPerChunk?: number }) => {
      return await apiFetch<{ ok: boolean; generated: number }>(
        `${PDF_BASE_URL}/api/documents/generate-flashcards`,
        { method: 'POST', body: JSON.stringify(input) },
      )
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['generated-flashcards'] }),
  })
}

export function usePendingFlashcards(documentId: string | null) {
  return useQuery({
    queryKey: ['generated-flashcards', documentId],
    enabled: !!documentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generated_flashcards')
        .select('*')
        .eq('document_id', documentId!)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as GeneratedFlashcard[]
    },
  })
}

export function useAcceptFlashcard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (cardId: string) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Oturum yok')

      const { data: card } = await supabase
        .from('generated_flashcards')
        .select('*')
        .eq('id', cardId)
        .single()
      if (!card) throw new Error('Kart bulunamadı')

      // flashcards tablosuna kopyala
      const { data: newCard, error: insErr } = await supabase
        .from('flashcards')
        .insert({
          user_id: userData.user.id,
          front: card.front,
          back: card.back,
          hint: card.hint,
          created_by: 'ai',
        })
        .select()
        .single()
      if (insErr) throw insErr

      // generated_flashcards'ı 'accepted' işaretle
      await supabase
        .from('generated_flashcards')
        .update({ status: 'accepted', accepted_flashcard_id: newCard.id })
        .eq('id', cardId)

      return newCard
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['generated-flashcards'] })
      qc.invalidateQueries({ queryKey: ['flashcards'] })
    },
  })
}

export function useRejectFlashcard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from('generated_flashcards')
        .update({ status: 'rejected' })
        .eq('id', cardId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['generated-flashcards'] }),
  })
}
