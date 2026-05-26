import type { SupabaseClient } from '@supabase/supabase-js'
import type { RAGChunk } from './types.js'

const OPENAI_BASE = 'https://api.openai.com/v1'

export class RAGEngine {
  constructor(
    private supabase: SupabaseClient<any>,
    private openaiKey: string,
  ) {}

  /**
   * Kullanıcı mesajını embed et → pgvector'de similarity search yap
   * → subject'e bağlı dokümanlardan en ilgili N chunk'ı döndür.
   */
  async retrieveContext(params: {
    userId: string
    subjectId?: string
    query: string
    topK?: number
    threshold?: number
  }): Promise<RAGChunk[]> {
    const { userId, subjectId, query, topK = 5, threshold = 0.72 } = params

    // Query embedding
    const embedding = await this.embed(query)

    // Supabase RPC çağrısı (match_document_chunks fonksiyonu migration 0004'te tanımlı)
    const { data, error } = await this.supabase.rpc('match_document_chunks', {
      query_embedding: embedding as any,
      match_user_id: userId,
      match_subject_id: subjectId ?? null,
      match_threshold: threshold,
      match_count: topK,
    })

    if (error || !data) return []

    // Doküman isimlerini al (gösterimde kullanılacak)
    const docIds = [...new Set((data as any[]).map((d) => d.document_id))]
    const { data: docs } = await this.supabase
      .from('documents')
      .select('id, filename')
      .in('id', docIds)

    const docNameById = new Map((docs ?? []).map((d: any) => [d.id, d.filename]))

    return (data as any[]).map((row) => ({
      documentId: row.document_id,
      content: row.content,
      pageNumber: row.page_number,
      similarity: Number(row.similarity),
      documentName: docNameById.get(row.document_id),
    }))
  }

  /**
   * Kavram eşleşmesi — kullanıcının mevcut kavramları arasında bu soruyu en iyi
   * hangi konu(lar) kapsıyor?
   */
  async matchConcepts(params: {
    userId: string
    subjectId?: string
    query: string
    topK?: number
  }): Promise<Array<{ conceptId: string; name: string; similarity: number }>> {
    const embedding = await this.embed(params.query)

    const { data } = await this.supabase.rpc('match_concepts', {
      query_embedding: embedding as any,
      match_user_id: params.userId,
      match_subject_id: params.subjectId ?? null,
      match_threshold: 0.7,
      match_count: params.topK ?? 3,
    })

    return ((data as any[]) ?? []).map((row) => ({
      conceptId: row.concept_id,
      name: row.name,
      similarity: Number(row.similarity),
    }))
  }

  /**
   * RAG chunk'larını system prompt'a dönüştür.
   * Kaynak göstermeli ki LLM "bu PDF'in 12. sayfasında" diyebilsin.
   */
  formatAsContext(chunks: RAGChunk[]): string {
    if (chunks.length === 0) return ''

    const formatted = chunks
      .map((c, i) => {
        const source = c.documentName
          ? `${c.documentName}${c.pageNumber ? `, s.${c.pageNumber}` : ''}`
          : `Kaynak ${i + 1}`
        return `[${source}]\n${c.content}`
      })
      .join('\n\n---\n\n')

    return `
REFERANSLARIN: Kullanıcının kendi dokümanlarından aşağıdaki bölümler soruyla ilgili.
Cevabını MÜMKÜNSE bu referansları kullanarak oluştur. Bir şey söylerken hangi kaynaktan
aldığını belirt ("X kitabının 12. sayfasında..." gibi). Eğer referanslar soruyla alakasızsa
kendi genel bilginle cevapla, ama bunu açıkça söyle.

====== REFERANSLAR ======
${formatted}
====== REFERANSLAR SONU ======
`.trim()
  }

  private async embed(text: string): Promise<number[]> {
    const res = await fetch(`${OPENAI_BASE}/embeddings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000),
        encoding_format: 'float',
      }),
    })

    if (!res.ok) throw new Error(`Embed failed: ${res.status}`)
    const json: any = await res.json()
    return json.data[0].embedding
  }
}
