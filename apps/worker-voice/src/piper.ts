import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { supabase } from './supabase.js'

const PIPER_BIN = process.env.PIPER_BIN ?? '/opt/piper/piper'
const MODELS_PATH = process.env.PIPER_MODELS_PATH ?? '/opt/piper/models'

export interface SynthesizeInput {
  text: string
  language: string
  voice?: string
  speed?: number
}

/**
 * Dil -> varsayılan voice eşlemesi.
 * Render container'da `/opt/piper/models/` altında bulunmalı.
 */
const DEFAULT_VOICES: Record<string, string> = {
  tr: 'tr_TR-dfki-medium',
  en: 'en_US-lessac-medium',
  de: 'de_DE-thorsten-medium',
  es: 'es_ES-mls-medium',
  fr: 'fr_FR-siwis-medium',
  it: 'it_IT-paola-medium',
  pt: 'pt_BR-faber-medium',
  ru: 'ru_RU-dmitri-medium',
  nl: 'nl_NL-mls-medium',
  pl: 'pl_PL-mls_medium-medium',
  ar: 'ar_JO-kareem-medium',
  fa: 'fa_IR-amir-medium',
  zh: 'zh_CN-huayan-medium',
}

export function resolveVoice(language: string, voice?: string): string {
  return voice ?? DEFAULT_VOICES[language] ?? DEFAULT_VOICES.en!
}

/**
 * Cache için hash üret.
 * Aynı metin + voice + speed kombosu bir kez üretilir, sonra cache'ten gelir.
 */
export function hashText(text: string, voice: string, speed: number): string {
  return createHash('sha256').update(`${voice}::${speed}::${text}`).digest('hex').slice(0, 32)
}

/**
 * Piper'ı subprocess olarak çağırır, WAV çıktısını Buffer döndürür.
 * NOT: Piper CLI 'piper --model <path> --output-raw' ile PCM döner;
 * burada '--output_file' ile WAV üretir.
 */
export async function runPiper(input: SynthesizeInput): Promise<Buffer> {
  const { text, language, voice, speed = 1.0 } = input
  const voiceName = resolveVoice(language, voice)
  const modelPath = path.join(MODELS_PATH, `${voiceName}.onnx`)

  // Geçici output dosyası
  const outFile = path.join(
    tmpdir(),
    `piper-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`,
  )

  return new Promise((resolve, reject) => {
    const args = [
      '--model',
      modelPath,
      '--output_file',
      outFile,
      '--length-scale',
      String(1 / speed), // speed 1.5 => length_scale 0.67 (daha hızlı)
    ]

    const proc = spawn(PIPER_BIN, args, { stdio: ['pipe', 'pipe', 'pipe'] })
    let stderrBuf = ''

    proc.stderr.on('data', (d) => {
      stderrBuf += d.toString()
    })
    proc.on('error', reject)
    proc.on('close', async (code) => {
      if (code !== 0) {
        return reject(new Error(`Piper exited ${code}: ${stderrBuf}`))
      }
      try {
        const wav = await readFile(outFile)
        resolve(wav)
      } catch (e) {
        reject(e)
      }
    })

    // Metni stdin'e yaz
    proc.stdin.write(text)
    proc.stdin.end()
  })
}

/**
 * WAV Buffer'ı Supabase Storage'a yükle, signed URL döndür.
 * Aynı hash varsa cache'ten dön.
 */
export async function synthesizeAndStore(
  input: SynthesizeInput,
  userId: string,
): Promise<{ url: string; cached: boolean }> {
  const voice = resolveVoice(input.language, input.voice)
  const speed = input.speed ?? 1.0
  const hash = hashText(input.text, voice, speed)
  const storagePath = `cache/${hash}.wav`

  // Cache kontrolü
  const { data: existing } = await supabase.storage
    .from('audio-output')
    .list('cache', { search: `${hash}.wav` })

  if (existing && existing.some((f) => f.name === `${hash}.wav`)) {
    const { data: signed } = await supabase.storage
      .from('audio-output')
      .createSignedUrl(storagePath, 60 * 60) // 1 saat
    if (signed) return { url: signed.signedUrl, cached: true }
  }

  // Üret ve yükle
  const wavBuffer = await runPiper({ ...input, voice, speed })

  const { error: uploadErr } = await supabase.storage
    .from('audio-output')
    .upload(storagePath, wavBuffer, {
      contentType: 'audio/wav',
      upsert: true,
    })
  if (uploadErr) throw uploadErr

  const { data: signed } = await supabase.storage
    .from('audio-output')
    .createSignedUrl(storagePath, 60 * 60)
  if (!signed) throw new Error('Signed URL alınamadı')

  return { url: signed.signedUrl, cached: false }
}

/** Piper kurulu mu kontrol (health check için) */
export async function checkPiper(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(PIPER_BIN, ['--help'], { stdio: 'ignore' })
    proc.on('error', () => resolve(false))
    proc.on('close', (code) => resolve(code === 0 || code === 1))
  })
}
