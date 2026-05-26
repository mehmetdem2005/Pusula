const GROQ_BASE = 'https://api.groq.com/openai/v1'

export class GroqError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'GroqError'
  }
}

interface ChatOptions {
  apiKey: string
  model?: string
  systemPrompt: string
  userPrompt: string
  jsonMode?: boolean
  temperature?: number
  maxTokens?: number
}

/**
 * Tek-shot chat (streaming değil). JSON parse'lı sonuç dönmek için ideal.
 */
export async function groqChatJSON<T = unknown>(opts: ChatOptions): Promise<T> {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model ?? 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: opts.systemPrompt },
        { role: 'user', content: opts.userPrompt },
      ],
      response_format: opts.jsonMode ? { type: 'json_object' } : undefined,
      temperature: opts.temperature ?? 0.5,
      max_tokens: opts.maxTokens ?? 2048,
    }),
  })

  if (!res.ok) {
    throw new GroqError(await res.text(), res.status)
  }

  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  const content = json.choices[0]?.message?.content ?? ''

  if (opts.jsonMode) {
    try {
      return JSON.parse(content) as T
    } catch {
      throw new GroqError(`JSON parse hatası: ${content.slice(0, 200)}`, 500)
    }
  }
  return content as T
}

/**
 * Vision: resim + soru → cevap.
 * Llama 4 Scout veya Maverick için multimodal.
 */
export async function groqVision(opts: {
  apiKey: string
  imageBase64: string
  mimeType: string
  prompt: string
  model?: string
}): Promise<string> {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model ?? 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: opts.prompt },
            {
              type: 'image_url',
              image_url: { url: `data:${opts.mimeType};base64,${opts.imageBase64}` },
            },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 2048,
    }),
  })

  if (!res.ok) throw new GroqError(await res.text(), res.status)
  const json = (await res.json()) as { choices: Array<{ message: { content: string } }> }
  return json.choices[0]?.message?.content ?? ''
}
