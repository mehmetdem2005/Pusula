const GROQ_BASE = 'https://api.groq.com/openai/v1'

export class GroqVoiceError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'GroqVoiceError'
  }
}

export interface TranscriptionResult {
  text: string
  language?: string
  duration?: number
  segments?: Array<{ start: number; end: number; text: string }>
}

/**
 * Groq Whisper STT.
 * model: whisper-large-v3-turbo (99 dil, $0.04/saat)
 * languge: ISO-639-1 (tr, en, de vs). Atlanırsa auto-detect.
 */
export async function transcribeAudio(
  apiKey: string,
  audioBuffer: Buffer,
  filename: string,
  language?: string,
): Promise<TranscriptionResult> {
  const form = new FormData()
  const blob = new Blob([audioBuffer])
  form.append('file', blob, filename)
  form.append('model', 'whisper-large-v3-turbo')
  if (language) form.append('language', language)
  form.append('response_format', 'verbose_json')
  form.append('temperature', '0')

  const res = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new GroqVoiceError(err, res.status)
  }

  const json = (await res.json()) as TranscriptionResult
  return json
}
