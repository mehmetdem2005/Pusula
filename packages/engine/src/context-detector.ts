import { createHash } from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConceptSnapshot, LearningContext, UserIntent, UserSnapshot } from './types.js'

/**
 * Kullanıcı ve konu verisinden "context" çıkaran detektör.
 * Context, sonraki adımda teknik seçiminin en kritik girdisi.
 *
 * Algoritma: KURAL TABANLI ÇNCELIK + LLM FALLBACK
 * Kural tabanlı çünkü deterministik, hızlı, debug edilebilir.
 * LLM sadece intent classification için (cache'li).
 */
export class ContextDetector {
  constructor(private supabase: SupabaseClient<any>) {}

  async detect(params: {
    user: UserSnapshot
    concept?: ConceptSnapshot
    subjectId?: string
    messageContent: string
    groqApiKey?: string // Intent classification için
  }): Promise<{
    context: LearningContext
    intent: UserIntent
    signals: Record<string, unknown>
  }> {
    const { user, concept, subjectId, messageContent, groqApiKey } = params

    // 1. Intent sınıflandırması — cache'li
    const intent = groqApiKey
      ? await this.classifyIntent(messageContent, groqApiKey)
      : this.classifyIntentHeuristic(messageContent)

    const signals: Record<string, unknown> = {
      intent,
      timeOfDay: this.timeOfDay(user.localTime),
      sessionDurationMinutes: user.sessionDurationMinutes,
      fatigue: user.fatigueSigml,
      avgRecentRating: user.recentRatings.length
        ? user.recentRatings.reduce((a, b) => a + b, 0) / user.recentRatings.length
        : null,
    }

    // 2. Sınav hazırlığı kontrolü (öncelik yüksek)
    if (subjectId) {
      const { data: subject } = await this.supabase
        .from('subjects')
        .select('exam_date')
        .eq('id', subjectId)
        .single()

      if (subject?.exam_date) {
        const daysUntil = Math.ceil(
          (new Date(subject.exam_date).getTime() - user.localTime.getTime()) /
            (1000 * 60 * 60 * 24),
        )
        signals.daysUntilExam = daysUntil
        if (daysUntil >= 0 && daysUntil <= 14) {
          return { context: 'exam_prep', intent, signals }
        }
      }
    }

    // 3. Concept bazlı context
    if (concept) {
      signals.conceptMastery = concept.masteryScore
      signals.conceptRepetitions = concept.repetitions
      signals.conceptEase = concept.easeFactor
      signals.isDue = concept.isDue

      // Zayıf nokta: düşük ease + birkaç denemede
      if (concept.easeFactor < 2.0 && concept.repetitions >= 2) {
        return { context: 'weak_spot', intent, signals }
      }

      // İlk karşılaşma
      if (concept.repetitions === 0) {
        return { context: 'first_exposure', intent, signals }
      }

      // Review zamanı geldi mi
      if (concept.isDue) {
        return { context: 'review', intent, signals }
      }

      // Konu biliniyor, practice yapalım
      if (concept.masteryScore > 60) {
        return { context: 'practice', intent, signals }
      }
    }

    // 4. Yaratıcı mod — kullanıcı "fikir" "öneri" "düşünce" gibi kelimeler kullanmış
    if (/(\bfikir|öner|tıkandım|bloke|yarat|ilham)/i.test(messageContent)) {
      return { context: 'creativity_block', intent, signals }
    }

    // 5. Intent'ten context çıkar
    const fromIntent: Record<UserIntent, LearningContext> = {
      learn_new: 'first_exposure',
      deepen: 'practice',
      test_me: 'practice',
      solve_problem: 'practice',
      review_mistake: 'weak_spot',
      explore: 'first_exposure',
      chat: 'first_exposure',
    }

    return { context: fromIntent[intent], intent, signals }
  }

  /**
   * Intent'i LLM ile sınıflandır. Cache kullanır — aynı mesaj 2. kez gelirse DB'den döner.
   * Maliyet: Llama-3.1-8b-instant (çok ucuz, ~100 token çıktı).
   */
  private async classifyIntent(message: string, groqApiKey: string): Promise<UserIntent> {
    const hash = createHash('sha256').update(message.toLowerCase().trim()).digest('hex')

    // Cache kontrol
    const { data: cached } = await this.supabase
      .from('intent_cache')
      .select('intent')
      .eq('message_hash', hash)
      .single()

    if (cached?.intent) return cached.intent as UserIntent

    // LLM classify
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          temperature: 0,
          max_tokens: 20,
          messages: [
            {
              role: 'system',
              content: `Kullanıcı mesajının amacını sınıflandır. SADECE şu değerlerden birini tek kelime olarak yaz:
- learn_new: Yeni konu soruyor ("X nedir?", "anlat bana")
- deepen: Detay istiyor ("daha fazla anlat", "neden?")
- test_me: Kendini sınatmak istiyor ("sına beni", "quiz yap")
- solve_problem: Somut bir problem çözülmesini istiyor
- review_mistake: Yanlışını anlamak istiyor
- explore: Genel keşif ("bu konuda ne var?", "nereden başlayayım")
- chat: Genel sohbet, selamlama, vs

Cevap: sadece bir kelime, başka hiçbir şey.`,
            },
            { role: 'user', content: message.slice(0, 1000) },
          ],
        }),
      })

      if (!res.ok) throw new Error(`Intent classify failed: ${res.status}`)
      const json: any = await res.json()
      const raw = (json.choices[0]?.message?.content ?? '').trim().toLowerCase()

      const valid: UserIntent[] = [
        'learn_new',
        'deepen',
        'test_me',
        'solve_problem',
        'review_mistake',
        'explore',
        'chat',
      ]
      const intent = valid.find((v) => raw.includes(v)) ?? 'learn_new'

      // Cache'e yaz
      await this.supabase.from('intent_cache').upsert({
        message_hash: hash,
        intent,
        confidence: 0.85,
      })

      return intent
    } catch {
      // LLM hata verirse heuristic'e düş
      return this.classifyIntentHeuristic(message)
    }
  }

  /** LLM yoksa / hata verirse regex fallback. */
  private classifyIntentHeuristic(message: string): UserIntent {
    const m = message.toLowerCase()

    if (/\b(nedir|tanım|anlat.*bana|açıkla|explain)\b/.test(m)) return 'learn_new'
    if (/\b(daha|detay|derin|deeply|more)\b/.test(m)) return 'deepen'
    if (/\b(sına|test|quiz|soru sor|sınav)\b/.test(m)) return 'test_me'
    if (/\b(çöz|solve|hesapla|bul)\b/.test(m)) return 'solve_problem'
    if (/\b(yanlış|hata|neden yanlış)\b/.test(m)) return 'review_mistake'
    if (/\b(nereden|başla|başlangıç|öner)\b/.test(m)) return 'explore'

    return 'learn_new'
  }

  private timeOfDay(d: Date): 'morning' | 'afternoon' | 'evening' | 'night' {
    const h = d.getHours()
    if (h < 6) return 'night'
    if (h < 12) return 'morning'
    if (h < 18) return 'afternoon'
    if (h < 22) return 'evening'
    return 'night'
  }
}
