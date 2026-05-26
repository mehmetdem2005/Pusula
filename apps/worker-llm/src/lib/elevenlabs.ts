/**
 * ElevenLabs v3 Text-to-Dialogue API
 * ====================================
 *
 * Pro+ tier için 2 sunuculu podcast'i tek API call ile üretir.
 * Edge TTS'ten farkı:
 *   - Doğal duygu (gülüş, vurgu, soru tonu)
 *   - Sunucular arası geçiş (overlap, interruption)
 *   - Çok daha doğal — premium podcast kalitesi
 *
 * Maliyet: ~$0.18/dakika audio (10 dk podcast = $1.80)
 * Edge TTS: ücretsiz
 *
 * Kullanım stratejisi:
 *   - Pro: Edge TTS (default)
 *   - Pro+: ElevenLabs v3 (premium quality, opt-in)
 *   - Lifetime: ElevenLabs v3 default
 *
 * Voice ID setup ElevenLabs Studio'dan klon edilmiş Türkçe sesler:
 *   - Ela (kadın, doğal Türkçe)  — voice_id: tr_ela_studio
 *   - Mert (erkek, doğal Türkçe) — voice_id: tr_mert_studio
 */

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY

// Pro v3 voice IDs (ElevenLabs Studio'da clone'lanmış)
export const ELEVENLABS_VOICES: Record<string, { A: string; B: string }> = {
  tr: {
    A: process.env.ELEVENLABS_VOICE_TR_A ?? 'pNInz6obpgDQGcFmaJgB', // Ela
    B: process.env.ELEVENLABS_VOICE_TR_B ?? 'TxGEqnHWrfWFTfGW9XjX', // Mert
  },
  en: {
    A: 'EXAVITQu4vr4xnSDxMaL', // Sarah
    B: 'ErXwobaYiN019PkySvjV', // Antoni
  },
}

interface DialogueTurn {
  speaker: 'A' | 'B'
  text: string
}

interface ElevenLabsTurn {
  text: string
  voice_id: string
}

/**
 * Tüm dialogue'u tek seferde gönder, audio dön.
 * NOT: ElevenLabs v3 dialogue endpoint kullanıyoruz (text_to_dialogue API).
 *
 * Eğer dialogue endpoint mevcut değilse, fallback olarak her turn'ü ayrı sentezler
 * ve back-end'de concatenate eder.
 */
export async function elevenlabsDialogue(
  turns: DialogueTurn[],
  language: string,
): Promise<{ audio: Buffer; method: 'dialogue' | 'concat' }> {
  if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY not configured')

  const voices = ELEVENLABS_VOICES[language] ?? ELEVENLABS_VOICES.en!

  // Önce dialogue API'yi dene (eğer beta'da hesabımıza açıldıysa)
  try {
    const elTurns: ElevenLabsTurn[] = turns.map((t) => ({
      text: t.text,
      voice_id: voices[t.speaker],
    }))

    const res = await fetch('https://api.elevenlabs.io/v1/text-to-dialogue', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: elTurns,
        model_id: 'eleven_v3',
        output_format: 'mp3_44100_128',
      }),
    })

    if (res.ok) {
      const audio = Buffer.from(await res.arrayBuffer())
      return { audio, method: 'dialogue' }
    }

    // Dialogue API yoksa fallback'a düş
    if (res.status === 404 || res.status === 403) {
      throw new Error('dialogue_not_available')
    }

    throw new Error(`ElevenLabs: ${res.status} ${await res.text()}`)
  } catch (e: any) {
    if (e.message !== 'dialogue_not_available') {
      console.warn('ElevenLabs dialogue API hatası, concat fallback:', e.message)
    }

    // Fallback: her turn'ü ayrı sentezle, sonra concat
    return await synthesizeAndConcat(turns, voices)
  }
}

async function synthesizeOne(text: string, voiceId: string): Promise<Buffer> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    },
  )

  if (!res.ok) throw new Error(`ElevenLabs TTS: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function synthesizeAndConcat(
  turns: DialogueTurn[],
  voices: { A: string; B: string },
): Promise<{ audio: Buffer; method: 'concat' }> {
  // Her turn'ü ayrı sentezle (parallel max 4)
  const PARALLEL = 4
  const audioBuffers: Buffer[] = new Array(turns.length)

  for (let i = 0; i < turns.length; i += PARALLEL) {
    const batch = turns.slice(i, i + PARALLEL)
    const results = await Promise.all(batch.map((t) => synthesizeOne(t.text, voices[t.speaker])))
    results.forEach((buf, j) => {
      audioBuffers[i + j] = buf
    })
  }

  // Buffer concat (mp3 frame-aligned)
  const totalLength = audioBuffers.reduce((sum, b) => sum + b.length, 0)
  const combined = Buffer.concat(audioBuffers, totalLength)

  return { audio: combined, method: 'concat' }
}

/**
 * Tek turn ElevenLabs (parallel synthesis için)
 */
export async function elevenlabsSingle(text: string, voiceId: string): Promise<Buffer> {
  return await synthesizeOne(text, voiceId)
}

/**
 * Maliyet hesabı (ElevenLabs character billing)
 * - eleven_multilingual_v2: 1 char = 1 credit
 * - eleven_v3: 1 char = 0.5 credit (yeni model)
 *
 * Pro plan: 100k credits/ay = $22 → 1000 user × 1000 char/podcast = ~10 podcast/user/ay
 */
export function estimateCredits(turns: DialogueTurn[]): number {
  return turns.reduce((sum, t) => sum + t.text.length, 0)
}
