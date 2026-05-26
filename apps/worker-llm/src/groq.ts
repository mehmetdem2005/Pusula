import { GROQ_BASE_URL } from '@kavra/shared/constants'

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GroqChatRequest {
  apiKey: string
  model: string
  messages: GroqMessage[]
  stream?: boolean
  temperature?: number
  max_tokens?: number
}

export class GroqError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'GroqError'
  }
}

/** Stream=true ise Response.body (SSE) döner, false ise JSON. */
export async function groqChat(req: GroqChatRequest): Promise<Response> {
  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${req.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: req.model,
      messages: req.messages,
      stream: req.stream ?? true,
      temperature: req.temperature ?? 0.7,
      max_tokens: req.max_tokens ?? 2048,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new GroqError(err, res.status)
  }
  return res
}

export async function groqListModels(apiKey: string): Promise<GroqModel[]> {
  const res = await fetch(`${GROQ_BASE_URL}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!res.ok) throw new GroqError(await res.text(), res.status)
  const { data } = (await res.json()) as { data: GroqModel[] }
  return data
}

export interface GroqModel {
  id: string
  object: string
  created: number
  owned_by: string
  active?: boolean
  context_window?: number
  public_apps?: unknown
}

export async function groqTestKey(apiKey: string): Promise<boolean> {
  try {
    await groqListModels(apiKey)
    return true
  } catch {
    return false
  }
}

export interface GroqChatJSONRequest {
  apiKey: string
  jsonMode?: boolean
  temperature?: number
  maxTokens?: number
  model?: string
  systemPrompt: string
  userPrompt: string
}

/** JSON modunda Groq chat — mesajı parse edip generic döner. */
export async function groqChatJSON<T>(req: GroqChatJSONRequest): Promise<T> {
  const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${req.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: req.model ?? 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.userPrompt },
      ],
      stream: false,
      temperature: req.temperature ?? 0.5,
      max_tokens: req.maxTokens ?? 2048,
      ...(req.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  })
  if (!res.ok) {
    throw new GroqError(await res.text(), res.status)
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = json.choices?.[0]?.message?.content ?? ''
  try {
    return JSON.parse(content) as T
  } catch (e) {
    throw new GroqError(`Invalid JSON response: ${content.slice(0, 200)}`, 502)
  }
}

// ============================================================================
// Whisper STT (audio transcription)
// ============================================================================
export async function groqTranscribe(
  apiKey: string,
  audioBuffer: Buffer,
  filename: string,
  language?: string,
): Promise<{ text: string; language?: string }> {
  const form = new FormData()
  const blob = new Blob([audioBuffer])
  form.append('file', blob, filename)
  form.append('model', 'whisper-large-v3-turbo')
  if (language) form.append('language', language)
  form.append('response_format', 'verbose_json')

  const res = await fetch(`${GROQ_BASE_URL}/audio/transcriptions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })
  if (!res.ok) throw new GroqError(await res.text(), res.status)
  return (await res.json()) as { text: string; language?: string }
}
