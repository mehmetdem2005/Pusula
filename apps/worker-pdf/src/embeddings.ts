const OPENAI_BASE = 'https://api.openai.com/v1'

export class EmbeddingError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'EmbeddingError'
  }
}

/**
 * OpenAI text-embedding-3-small (1536 dim, $0.02/1M token).
 * Batch desteği: 100'lük gruplar halinde.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new EmbeddingError('OPENAI_API_KEY eksik', 500)

  const BATCH_SIZE = 100
  const allEmbeddings: number[][] = []

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE)

    const res = await fetch(`${OPENAI_BASE}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: batch,
        encoding_format: 'float',
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new EmbeddingError(err, res.status)
    }

    const json = (await res.json()) as { data: Array<{ embedding: number[] }> }
    for (const item of json.data) {
      allEmbeddings.push(item.embedding)
    }
  }

  return allEmbeddings
}

export async function embedSingle(text: string): Promise<number[]> {
  const result = await embedTexts([text])
  return result[0]!
}
