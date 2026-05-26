import { useMutation } from '@tanstack/react-query'
import * as FileSystem from 'expo-file-system'
import { apiFetch } from '../lib/api'
import { supabase } from '../lib/supabase'

const PDF_BASE_URL = process.env.EXPO_PUBLIC_PDF_BASE_URL ?? 'http://localhost:4003'

export type VisionTask =
  | 'solve_math'
  | 'extract_text'
  | 'describe'
  | 'analyze_diagram'
  | 'explain_handwriting'

export function useAnalyzeImage() {
  return useMutation({
    mutationFn: async (input: {
      uri: string
      task: VisionTask
      lessonId?: string
      mimeType?: string
    }) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Oturum yok')
      const userId = userData.user.id

      // 1. Resmi base64 oku
      const base64 = await FileSystem.readAsStringAsync(input.uri, {
        encoding: FileSystem.EncodingType.Base64,
      })

      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)

      // 2. Storage'a yükle
      const ext = input.uri.split('.').pop()?.toLowerCase() ?? 'jpg'
      const mimeType = input.mimeType ?? `image/${ext === 'jpg' ? 'jpeg' : ext}`
      const storagePath = `${userId}/${Date.now()}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('user-images')
        .upload(storagePath, bytes.buffer, { contentType: mimeType })
      if (upErr) throw upErr

      // 3. Worker-pdf'e analiz isteği
      const { result } = await apiFetch<{ result: string }>(`${PDF_BASE_URL}/api/vision/analyze`, {
        method: 'POST',
        body: JSON.stringify({
          storagePath,
          task: input.task,
          lessonId: input.lessonId,
        }),
      })

      // Yerel dosyayı sil
      FileSystem.deleteAsync(input.uri, { idempotent: true }).catch(() => {})

      return { result, storagePath }
    },
  })
}
