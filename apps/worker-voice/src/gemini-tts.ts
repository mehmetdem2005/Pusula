/**
 * Gemini TTS — Google Generative AI TTS (ücretsiz tier)
 * =====================================================
 *
 * gemini-2.5-flash-preview-tts: çok dilli (Türkçe dahil), kaliteli neural ses,
 * 30+ prebuilt voice. Çıktı: raw PCM (L16, 24kHz, mono) → WAV'a sarılır.
 * HTTP API olduğu için Edge TTS'teki datacenter IP engeli yoktur.
 */

import crypto from 'node:crypto'
import { supabase } from './supabase.js'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const MODEL = process.env.GEMINI_TTS_MODEL ?? 'gemini-2.5-flash-preview-tts'

export interface GeminiVoice {
  id: string
  name: string
  gender: 'Male' | 'Female'
}

// Gemini prebuilt voice'ları çok dilli; Türkçe-dostu etiketlerle sunuyoruz.
export const GEMINI_VOICES: GeminiVoice[] = [
  { id: 'Kore', name: 'Eylül', gender: 'Female' },
  { id: 'Aoede', name: 'Derya', gender: 'Female' },
  { id: 'Leda', name: 'Zeynep', gender: 'Female' },
  { id: 'Puck', name: 'Kaan', gender: 'Male' },
  { id: 'Charon', name: 'Demir', gender: 'Male' },
  { id: 'Fenrir', name: 'Bora', gender: 'Male' },
]

const VALID = new Set(GEMINI_VOICES.map((v) => v.id))
const DEFAULT_VOICE = 'Kore'

export function isGeminiTTSConfigured(): boolean {
  return !!GEMINI_API_KEY
}

export function resolveGeminiVoice(voice?: string): string {
  return voice && VALID.has(voice) ? voice : DEFAULT_VOICE
}

/** 16-bit PCM mono için WAV header üret. */
function wavHeader(dataLen: number, sampleRate = 24000, channels = 1, bits = 16): Buffer {
  const blockAlign = (channels * bits) / 8
  const byteRate = sampleRate * blockAlign
  const buf = Buffer.alloc(44)
  buf.write('RIFF', 0)
  buf.writeUInt32LE(36 + dataLen, 4)
  buf.write('WAVE', 8)
  buf.write('fmt ', 12)
  buf.writeUInt32LE(16, 16)
  buf.writeUInt16LE(1, 20) // PCM
  buf.writeUInt16LE(channels, 22)
  buf.writeUInt32LE(sampleRate, 24)
  buf.writeUInt32LE(byteRate, 28)
  buf.writeUInt16LE(blockAlign, 32)
  buf.writeUInt16LE(bits, 34)
  buf.write('data', 36)
  buf.writeUInt32LE(dataLen, 40)
  return buf
}

export interface GeminiTTSInput {
  text: string
  voice?: string
  speed?: number
  language?: string
}

/**
 * Gemini TTS ile sentezle, WAV'a sar, Supabase Storage'a yükle, signed URL döndür.
 * Aynı metin + ses kombosu cache'ten gelir.
 */
export async function synthesizeGeminiAndStore(
  input: GeminiTTSInput,
): Promise<{ url: string; cached: boolean; engine: 'gemini' }> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY configured değil')

  const voice = resolveGeminiVoice(input.voice)
  const hash = crypto
    .createHash('sha256')
    .update(`gemini::${MODEL}::${voice}::${input.text}`)
    .digest('hex')
    .slice(0, 32)
  const storagePath = `cache/${hash}.wav`

  const { data: existing } = await supabase.storage
    .from('audio-output')
    .list('cache', { search: `${hash}.wav` })
  if (existing?.some((f) => f.name === `${hash}.wav`)) {
    const { data: signed } = await supabase.storage
      .from('audio-output')
      .createSignedUrl(storagePath, 60 * 60)
    if (signed) return { url: signed.signedUrl, cached: true, engine: 'gemini' }
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: input.text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      }),
    },
  )
  if (!res.ok) throw new Error(`Gemini TTS: ${res.status} ${await res.text()}`)

  const data: any = await res.json()
  const part = data?.candidates?.[0]?.content?.parts?.[0]
  const b64: string | undefined = part?.inlineData?.data
  if (!b64) throw new Error('Gemini TTS: ses verisi yok')

  const mime: string = part.inlineData.mimeType ?? ''
  const rateStr = mime.match(/rate=(\d+)/)?.[1]
  const sampleRate = rateStr ? parseInt(rateStr, 10) : 24000

  const pcm = Buffer.from(b64, 'base64')
  const wav = Buffer.concat([wavHeader(pcm.length, sampleRate), pcm])

  const { error: uploadErr } = await supabase.storage
    .from('audio-output')
    .upload(storagePath, wav, { contentType: 'audio/wav', upsert: true })
  if (uploadErr) throw uploadErr

  const { data: signed } = await supabase.storage
    .from('audio-output')
    .createSignedUrl(storagePath, 60 * 60)
  if (!signed) throw new Error('Signed URL alınamadı')

  return { url: signed.signedUrl, cached: false, engine: 'gemini' }
}
