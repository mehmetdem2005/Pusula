/**
 * ElevenLabs TTS — Premium Voice (Pro Tier)
 * ============================================
 *
 * ElevenLabs en kaliteli TTS servisi. Pro kullanıcılar için.
 *
 * Free tier: Edge TTS yeterli kalite
 * Pro tier: ElevenLabs (daha doğal, daha duygusal)
 * Pro+ tier: F5-TTS Voice Cloning (kullanıcının kendi sesi)
 *
 * Maliyet: $0.30/1000 karakter (Creator plan)
 * Türkçe için: tr_female_v1 ya da multilingual_v2
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1'

export interface ElevenLabsVoice {
  voiceId: string
  name: string
  category: string
  language: string
  description: string
}

// Multilingual sesler - Türkçe dahil tüm dilleri destekler
export const ELEVENLABS_VOICES: ElevenLabsVoice[] = [
  {
    voiceId: 'XB0fDUnXU5powFXDhCwa',
    name: 'Charlotte',
    category: 'multilingual',
    language: 'multi',
    description: 'Sıcak, anaç bir kadın sesi',
  },
  {
    voiceId: 'IKne3meq5aSn9XLyUdCD',
    name: 'Charlie',
    category: 'multilingual',
    language: 'multi',
    description: 'Genç, dinamik erkek sesi',
  },
  {
    voiceId: 'pFZP5JQG7iQjIQuC4Bku',
    name: 'Lily',
    category: 'multilingual',
    language: 'multi',
    description: 'Yumuşak, eğitimci kadın sesi',
  },
  {
    voiceId: 'JBFqnCBsd6RMkjVDRZzb',
    name: 'George',
    category: 'multilingual',
    language: 'multi',
    description: 'Olgun, güven veren erkek sesi',
  },
]

export interface ElevenLabsTTSParams {
  text: string
  voiceId?: string
  stability?: number // 0-1
  similarityBoost?: number // 0-1
  style?: number // 0-1
  useSpeakerBoost?: boolean
  modelId?: string // 'eleven_multilingual_v2' (Türkçe)
}

export class ElevenLabsNotConfiguredError extends Error {
  constructor() {
    super('ElevenLabs API key configured değil')
  }
}

/**
 * ElevenLabs ile TTS — MP3 stream
 */
export async function elevenLabsTTS(params: ElevenLabsTTSParams): Promise<Buffer> {
  if (!ELEVENLABS_API_KEY) throw new ElevenLabsNotConfiguredError()

  const voiceId = params.voiceId ?? 'XB0fDUnXU5powFXDhCwa' // Charlotte default

  const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: params.text,
      model_id: params.modelId ?? 'eleven_multilingual_v2',
      voice_settings: {
        stability: params.stability ?? 0.5,
        similarity_boost: params.similarityBoost ?? 0.75,
        style: params.style ?? 0,
        use_speaker_boost: params.useSpeakerBoost ?? true,
      },
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`ElevenLabs error: ${response.status} ${err}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

/**
 * Streaming versiyonu — uzun metinler için
 */
export async function elevenLabsTTSStream(
  params: ElevenLabsTTSParams,
  onChunk: (chunk: Buffer) => void,
): Promise<void> {
  if (!ELEVENLABS_API_KEY) throw new ElevenLabsNotConfiguredError()

  const voiceId = params.voiceId ?? 'XB0fDUnXU5powFXDhCwa'

  const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}/stream`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text: params.text,
      model_id: params.modelId ?? 'eleven_multilingual_v2',
      voice_settings: {
        stability: params.stability ?? 0.5,
        similarity_boost: params.similarityBoost ?? 0.75,
      },
    }),
  })

  if (!response.ok) throw new Error(`ElevenLabs stream error: ${response.status}`)
  if (!response.body) throw new Error('No response body')

  const reader = response.body.getReader()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) onChunk(Buffer.from(value))
  }
}
