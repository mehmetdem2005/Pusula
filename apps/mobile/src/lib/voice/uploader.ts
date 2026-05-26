import * as FileSystem from 'expo-file-system'
import { supabase } from '../supabase'

/**
 * Yerel ses dosyasını Supabase Storage'a yükle.
 * audio-input bucket'ı altında {userId}/{filename} yolunda.
 */
export async function uploadAudio(localUri: string, userId: string): Promise<string> {
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.m4a`
  const storagePath = `${userId}/${filename}`

  // React Native'de base64 okuma yolu
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  })

  // Base64 -> ArrayBuffer
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  const { error } = await supabase.storage.from('audio-input').upload(storagePath, bytes.buffer, {
    contentType: 'audio/m4a',
    upsert: false,
  })

  if (error) throw error

  // Yerel dosyayı sil (temizlik)
  FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => {})

  return storagePath
}
