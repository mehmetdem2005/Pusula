/**
 * Embedding service tool worker — Tier 3
 *
 * İlanlar için 1536-dim embedding üretir (text-embedding-3-small veya benzeri).
 * pgvector ile similarity search'te kullanılır.
 */

export interface EmbeddingRequest {
  text: string;
  model?: 'text-embedding-3-small' | 'text-embedding-3-large';
}

export async function embed(_req: EmbeddingRequest): Promise<number[]> {
  // TODO: OpenAI veya Cohere veya local sentence-transformers
  // MVP placeholder: 1536-zero
  return new Array(1536).fill(0);
}

export async function embedBatch(_texts: string[]): Promise<number[][]> {
  // TODO: batch embed (cost-efficient)
  return [];
}
