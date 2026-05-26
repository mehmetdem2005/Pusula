// ============================================================================
// Kavra Teaching Engine — Tip Tanımları
// ============================================================================

/**
 * Context: Kullanıcının şu an ne yapmaya çalıştığı.
 * Teknik seçiminin en önemli girdisi.
 */
export type LearningContext =
  | 'first_exposure' // İlk kez karşılaşıyor
  | 'practice' // Öğrendiğini uyguluyor
  | 'review' // Tekrar / aralıklı tekrar
  | 'weak_spot' // Zayıf olduğu konuyu güçlendiriyor
  | 'exam_prep' // Sınav yaklaşıyor
  | 'creativity_block' // Yaratıcı çıkmaz / açık uçlu

/**
 * User intent: Son mesajın amacı.
 * Groq ile sınıflandırılıp cache'lenir.
 */
export type UserIntent =
  | 'learn_new' // "X nedir?"
  | 'deepen' // "Daha detay"
  | 'test_me' // "Sına beni"
  | 'solve_problem' // "Bu soruyu çöz"
  | 'review_mistake' // "Yanlışımı anla"
  | 'explore' // "Bu konuda ne var?"
  | 'chat' // Genel sohbet

/**
 * Behavior: Engine'in arka planda uygulayacağı pedagojik davranış.
 * C1-C10 kategorileri.
 */
export type BehaviorCode =
  | 'C1-desirable-difficulty'
  | 'C1-misconception-mining'
  | 'C2-peak-end'
  | 'C2-loss-framing'
  | 'C2-ikea-effect'
  | 'C3-scaffolding-fading'
  | 'C3-backward-chaining'
  | 'C3-cognitive-apprenticeship'
  | 'C4-concept-blending'
  | 'C4-etymology'
  | 'C5-reappraisal'
  | 'C5-silence-protocol'
  | 'C6-signal-noise'
  | 'C6-multi-perspective'
  | 'C6-question-seeding'
  | 'C7-metaphorical-correction'
  | 'C7-five-whys'
  | 'C9-random-input'
  | 'C9-defamiliarization'
  | 'C10-pre-testing'

/** User modelinin anlık özeti — karar için girdi. */
export interface UserSnapshot {
  userId: string
  localTime: Date
  sessionDurationMinutes: number // Bu seansta ne kadar çalıştı
  streakDays: number
  recentRatings: number[] // Son 5 dersin rating'leri (1-5)
  totalMessagesLast24h: number
  blockedTechniques: string[] // Kullanıcının kapalı tuttukları
  preferredContentTypes: string[] // text/video/diagram
  fatigueSigml: number // 0-1, yorgunluk tahmini
}

/** Concept modelinin anlık özeti. */
export interface ConceptSnapshot {
  conceptId: string
  name: string
  difficulty: number // 1-5
  easeFactor: number // SM-2
  repetitions: number
  masteryScore: number // 0-100
  confidence: number // 0-1, kullanıcının kendine güveni
  lastReviewedAt: Date | null
  isDue: boolean
  prerequisitesMastered: boolean // Önkoşulları tamam mı
}

/** Technique metadata — library'den yüklenir. */
export interface TechniqueMeta {
  id: string
  code: string // "M1-T01"
  name: string
  kind: 'student_facing' | 'engine_behavior'
  suitableFor: LearningContext[]
  contraindications: string[] // ['exam_anxiety', 'fatigue']
  difficultyLevel: number // 1-5
  cognitiveLoad: number // 1-5
  estimatedDurationMinutes?: number
  promptTemplate?: string
  systemPromptFragment?: string
  uiComponent?: string
  tags: string[]
}

/** Bandit arm state. */
export interface ArmState {
  techniqueId: string
  alpha: number
  beta: number
  totalUses: number
  avgRating: number | null
}

/** Engine'in aldığı karar — tam kayıt. */
export interface EngineDecision {
  context: LearningContext
  intent: UserIntent
  selectedTechnique: TechniqueMeta
  activeBehaviors: BehaviorCode[]
  banditScore: number
  ragChunks: RAGChunk[]
  reasoning: DecisionReasoning
}

export interface DecisionReasoning {
  contextSignals: Record<string, unknown>
  candidateCount: number
  filteredOut: Array<{ techniqueId: string; reason: string }>
  banditSamples: Array<{ techniqueId: string; score: number }>
}

export interface RAGChunk {
  documentId: string
  content: string
  pageNumber: number | null
  similarity: number
  documentName?: string
}

/** Compiled system prompt — LLM'e gönderilecek son hali. */
export interface CompiledPrompt {
  systemPrompt: string
  temperature: number
  maxTokens: number
  metadata: {
    techniqueCode: string
    behaviorCodes: BehaviorCode[]
    hasRAG: boolean
  }
}

/** Ders sonrası feedback (bandit update için). */
export interface LessonOutcome {
  lessonId: string
  userId: string
  techniqueId: string
  userRating?: number // 1-5, ders sonu anketi
  duration: number // Saniye
  messageCount: number
  completed: boolean
  quizPerformance?: number // 0-1, o ders içinde quiz yapıldıysa
}
