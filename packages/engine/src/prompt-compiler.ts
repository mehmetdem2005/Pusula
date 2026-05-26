import { BEHAVIORS } from './behaviors.js'
import type {
  BehaviorCode,
  CompiledPrompt,
  ConceptSnapshot,
  LearningContext,
  RAGChunk,
  TechniqueMeta,
} from './types.js'

const BASE_IDENTITY = `Sen Kavra'sın — 150 pedagojik teknikle donanmış Türkçe konuşan kişisel öğrenme AI'ısın.
Hedefin kullanıcıya sadece bilgi aktarmak değil, o bilgiyi gerçekten KAVRAMAsını sağlamaktır.

Temel ilkelerin:
• Önce anla, sonra anlat — öğrencinin seviyesi ve amacı ilk.
• Somutla — soyut kavramlar günlük örneklerle, analojilerle.
• Soru sor — pasif dinleme değil, aktif düşünme.
• Kısa cümleler, temiz Türkçe. Jargon'u gerekiyorsa açıkla.
• Uzun yanıtlarda markdown kullan (## başlık, - liste, \`kod\`).
• Kullanıcıyla saygılı ve sıcak ol ama yağ çekme; gerçekten sana anlattığı şeye ilgi duy.

İFADE STİLİ — DOĞAL VE SAMİMİ:
• Çoğu zaman text emoji kullan: :), :D, :(, :/, ;), xd
• Ünlem yerine "yaa", "of", "vay" gibi doğal sözcükler de olabilir
• AŞIRI EMOJİ KULLANMA — bir mesajda en fazla 1-2 yerde, bağlama uygun
• Resmi grafik emojiler (🎯 📊 ✨) sadece konu başlıklarında ya da kategori belirtirken
• Şaka/hafiflik anında: xd, :D, ;)
• Anlayış: :), tamam :)
• Sorgulama: :/, hmm
• Üzülme/empati: :( (öğrenci zorlandığını söylediğinde)
• Heyecan: ! ya da :D — heyecan VARSA, ezber olarak değil
• Genel davranış: bir arkadaş gibi yaz, AI gibi değil

ÖRNEK YANLIŞ: "Harika bir soru! 🎉🚀✨ Bu konuyu birlikte ele alalım! 💪"
ÖRNEK DOĞRU: "Güzel soru :) Önce şuradan başlayalım — türev nedir?"

ÖRNEK YANLIŞ: "Türev, fonksiyonun anlık değişim oranıdır. ✨📊 Anlamak için..."
ÖRNEK DOĞRU: "Türev aslında çok zor bir şey değil. Hızölçer örneğini bilirsin değil mi?"`

const PERSONALITY_HEADER = `--- KİŞİLİK ROLÜ ---`
const TECHNIQUE_HEADER = `--- BU OTURUMDA KULLANACAĞIN TEKNİK ---`
const BEHAVIORS_HEADER = `--- GİZLİ PEDAGOJİK TAKTİKLER (öğrenciye söyleme, arka planda uygula) ---`
const RAG_HEADER = `--- REFERANSLAR ---`
const CONCEPT_HEADER = `--- ŞU AN ÇALIŞILAN KAVRAM ---`

export class PromptCompiler {
  compile(params: {
    context: LearningContext
    technique: TechniqueMeta
    behaviorCodes: BehaviorCode[]
    personalityFragment?: string
    personalityTemperature?: number
    ragContext?: string
    concept?: ConceptSnapshot
    recentMistakes?: string[] // Error portfolio'dan
  }): CompiledPrompt {
    const parts: string[] = [BASE_IDENTITY]

    // 1. Kişilik
    if (params.personalityFragment) {
      parts.push(`\n${PERSONALITY_HEADER}\n${params.personalityFragment}`)
    }

    // 2. Seçilen teknik
    if (params.technique.systemPromptFragment) {
      parts.push(
        `\n${TECHNIQUE_HEADER}\n` +
          `TEKNİK: ${params.technique.name} (${params.technique.code})\n\n` +
          params.technique.systemPromptFragment,
      )
    }

    // 3. Behaviors — öğrenciye söylemeden uygulanacak
    if (params.behaviorCodes.length > 0) {
      const behaviorFragments: string[] = []
      for (const code of params.behaviorCodes) {
        const beh = BEHAVIORS.find((b) => b.code === code)
        if (beh) behaviorFragments.push(`• ${beh.promptFragment}`)
      }
      if (behaviorFragments.length > 0) {
        parts.push(`\n${BEHAVIORS_HEADER}\n${behaviorFragments.join('\n\n')}`)
      }
    }

    // 4. Concept bağlamı
    if (params.concept) {
      const masteryBar = this.renderMasteryBar(params.concept.masteryScore)
      parts.push(
        `\n${CONCEPT_HEADER}\n` +
          `Kavram: ${params.concept.name}\n` +
          `Zorluk: ${'⭐'.repeat(params.concept.difficulty)}\n` +
          `Mastery: ${masteryBar} (%${Math.round(params.concept.masteryScore)})\n` +
          `Tekrar sayısı: ${params.concept.repetitions}\n` +
          (params.recentMistakes?.length
            ? `Öğrencinin son hataları:\n${params.recentMistakes.map((m) => `• ${m}`).join('\n')}`
            : ''),
      )
    }

    // 5. RAG context
    if (params.ragContext) {
      parts.push(`\n${params.ragContext}`)
    }

    return {
      systemPrompt: parts.join('\n'),
      temperature: params.personalityTemperature ?? 0.7,
      maxTokens: 2048,
      metadata: {
        techniqueCode: params.technique.code,
        behaviorCodes: params.behaviorCodes,
        hasRAG: !!params.ragContext,
      },
    }
  }

  private renderMasteryBar(score: number): string {
    const filled = Math.round((score / 100) * 10)
    return '█'.repeat(filled) + '░'.repeat(10 - filled)
  }
}
