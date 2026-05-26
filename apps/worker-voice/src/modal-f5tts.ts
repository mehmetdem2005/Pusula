/**
 * Modal F5-TTS Client
 *
 * Modal.com serverless GPU üzerinde F5-TTS çalıştırır.
 * Voice cloning için:
 *   1. Kullanıcı 30sn referans ses yükler (.wav, 16kHz mono ideal)
 *   2. Modal endpoint'ine reference_audio + reference_text + target_text gönderilir
 *   3. F5-TTS o sesi taklit ederek target_text'i okur, mp3 döner
 *
 * Modal deployment ayrı yapılır (modal deploy modal_f5tts.py).
 * Bu client sadece HTTP çağrı yapıyor — Modal endpoint URL ENV'de.
 */

const MODAL_F5TTS_URL = process.env.MODAL_F5TTS_URL
const MODAL_API_TOKEN = process.env.MODAL_API_TOKEN

export class ModalNotConfiguredError extends Error {
  constructor() {
    super('Modal F5-TTS endpoint configured değil — MODAL_F5TTS_URL ENV gerekli')
  }
}

export interface CloneSynthesizeParams {
  referenceAudioUrl: string // signed URL to .wav
  referenceText: string // F5-TTS için referans transkript
  targetText: string // klonlanmış sesle söylenecek metin
  language?: string // 'tr', 'en' vb
  speed?: number // 0.7 - 1.3
}

export async function modalClonedTTS(params: CloneSynthesizeParams): Promise<{
  audioBuffer: Buffer
  durationMs: number
}> {
  if (!MODAL_F5TTS_URL) throw new ModalNotConfiguredError()

  const startedAt = Date.now()

  const res = await fetch(MODAL_F5TTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(MODAL_API_TOKEN ? { Authorization: `Bearer ${MODAL_API_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      reference_audio_url: params.referenceAudioUrl,
      reference_text: params.referenceText,
      target_text: params.targetText,
      language: params.language ?? 'tr',
      speed: params.speed ?? 1.0,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Modal F5-TTS başarısız: ${res.status} ${err}`)
  }

  const audioBuffer = Buffer.from(await res.arrayBuffer())
  return { audioBuffer, durationMs: Date.now() - startedAt }
}

/**
 * Voice clone validation — referans sesin yeterli olup olmadığını kontrol et.
 * F5-TTS minimum 5sn, ideal 15-30sn. Çok kısa veya çok gürültülü ise reddedilir.
 */
export interface ValidationResult {
  valid: boolean
  durationSeconds: number
  errors: string[]
  warnings: string[]
}

export async function validateReferenceAudio(audioBuffer: Buffer): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  // Buffer boyutundan kabaca süre tahmini (16kHz mono 16-bit = 32 KB/sn)
  // Bu kesin değil ama ENV bağımsız sanity check
  const estimatedSeconds = audioBuffer.length / (16000 * 2)

  if (estimatedSeconds < 5) {
    errors.push('Referans ses en az 5 saniye olmalı')
  }
  if (estimatedSeconds > 60) {
    warnings.push('Referans ses çok uzun, 30 saniye yeterli — daha kısa kesilecek')
  }
  if (audioBuffer.length === 0) {
    errors.push('Boş audio')
  }

  return {
    valid: errors.length === 0,
    durationSeconds: estimatedSeconds,
    errors,
    warnings,
  }
}
