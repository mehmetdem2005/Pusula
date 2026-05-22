/**
 * Intent Classifier — kullanıcı mesajından intent çıkarır.
 * docs/12-konusmasal-mod-spec.md §5'e uygun.
 *
 * Strateji (cascade):
 *  1. Slash command parser
 *  2. URL detection (1 URL → analyze, 2-5 → compare)
 *  3. Anahtar kelime kural-tabanlı (Türkçe lexicon)
 *  4. LLM classifier (low confidence fallback)
 */
import type { IntentClass } from '../contracts/common.js';

export interface IntentResult {
  intent: IntentClass;
  confidence: number; // 0-1
  reasoning: string;
  extracted_entities: {
    urls: string[];
    locations: string[];
    budget: number | null;
    room_count: string | null;
  };
}

const URL_PATTERN = /https?:\/\/[^\s]+/g;
const SLASH_PATTERN = /^\/(\w+)/;

const KEYWORDS_MAP: { patterns: RegExp[]; intent: IntentClass; confidence: number }[] = [
  // persona belirleme
  {
    patterns: [/\b(alıcı|alıyorum|alacağım|satın al)\b/i],
    intent: 'persona.buyer',
    confidence: 0.85,
  },
  {
    patterns: [/\b(emlakçı|satıyorum|satıcı|portföy)\b/i],
    intent: 'persona.seller',
    confidence: 0.85,
  },
  {
    patterns: [/\b(yatırım|yatırımcı|kira getirisi|roi)\b/i],
    intent: 'persona.investor',
    confidence: 0.85,
  },
  {
    patterns: [/\b(araştır|pazar|trend|makro)\b/i],
    intent: 'persona.researcher',
    confidence: 0.75,
  },
  // task
  {
    patterns: [/\b(pazarlık|müzakere|indirim al)\b/i],
    intent: 'task.negotiation_advice',
    confidence: 0.85,
  },
  {
    patterns: [/\b(yaz|metin|post|caption|açıklama)\b/i],
    intent: 'task.create_marketing',
    confidence: 0.75,
  },
  {
    patterns: [/\b(karşılaştır|kıyas|hangisi daha)\b/i],
    intent: 'task.compare_listings',
    confidence: 0.85,
  },
  {
    patterns: [/\b(mahalle|ilçe|bölge|trend)\b/i],
    intent: 'task.market_research',
    confidence: 0.75,
  },
  {
    patterns: [/\b(kira getirisi|roi|geri ödeme)\b/i],
    intent: 'task.financial_simulation',
    confidence: 0.85,
  },
  { patterns: [/\b(bildirim|uyarı|alarm)\b/i], intent: 'task.set_alert', confidence: 0.85 },
  // meta
  { patterns: [/\b(yardım|nasıl|ne yapabil)\b/i], intent: 'meta.help', confidence: 0.65 },
  {
    patterns: [/\b(görüşürüz|sağol|tamam teşekkür)\b/i],
    intent: 'meta.farewell',
    confidence: 0.75,
  },
];

export class IntentClassifier {
  /**
   * Kural tabanlı + heuristic classifier. LLM fallback için Orchestrator
   * `intent.confidence < 0.65` olduğunda LLM çağırır.
   */
  classify(message: string, _hasPersona: boolean): IntentResult {
    // 1. Slash command
    const slashMatch = SLASH_PATTERN.exec(message);
    if (slashMatch) {
      const cmd = slashMatch[1]?.toLowerCase();
      return this.slashToIntent(cmd ?? '', message);
    }

    // 2. URL extraction
    const urls = message.match(URL_PATTERN) ?? [];
    if (urls.length === 1) {
      return {
        intent: 'task.analyze_listing',
        confidence: 0.95,
        reasoning: 'Tek URL tespit edildi',
        extracted_entities: { urls, locations: [], budget: null, room_count: null },
      };
    }
    if (urls.length >= 2 && urls.length <= 5) {
      return {
        intent: 'task.compare_listings',
        confidence: 0.95,
        reasoning: 'Birden fazla URL tespit edildi',
        extracted_entities: { urls, locations: [], budget: null, room_count: null },
      };
    }

    // 3. Keyword
    for (const rule of KEYWORDS_MAP) {
      for (const pattern of rule.patterns) {
        if (pattern.test(message)) {
          return {
            intent: rule.intent,
            confidence: rule.confidence,
            reasoning: `Anahtar kelime eşleşti: ${pattern.source}`,
            extracted_entities: { urls, locations: [], budget: null, room_count: null },
          };
        }
      }
    }

    // 4. LLM fallback işareti — confidence düşük
    return {
      intent: 'unknown',
      confidence: 0.3,
      reasoning: 'Kural tabanlı tespit başarısız, LLM classifier gerekli',
      extracted_entities: { urls, locations: [], budget: null, room_count: null },
    };
  }

  private slashToIntent(cmd: string, fullMessage: string): IntentResult {
    const urls = fullMessage.match(URL_PATTERN) ?? [];
    const map: Record<string, IntentClass> = {
      analiz: 'task.analyze_listing',
      kıyas: 'task.compare_listings',
      kiyas: 'task.compare_listings',
      pazarla: 'task.create_marketing',
      pazarlık: 'task.negotiation_advice',
      pazarlik: 'task.negotiation_advice',
      uyarıver: 'task.set_alert',
      uyariver: 'task.set_alert',
      mahalle: 'task.market_research',
      kredi: 'task.financial_simulation',
      persona: 'meta.change_persona',
      sıfırla: 'meta.reset',
      sifirla: 'meta.reset',
      yardım: 'meta.help',
      yardim: 'meta.help',
      şikayet: 'meta.feedback',
      sikayet: 'meta.feedback',
    };
    const intent = map[cmd] ?? 'unknown';
    return {
      intent,
      confidence: intent === 'unknown' ? 0.0 : 1.0,
      reasoning: `Slash command: /${cmd}`,
      extracted_entities: { urls, locations: [], budget: null, room_count: null },
    };
  }
}
