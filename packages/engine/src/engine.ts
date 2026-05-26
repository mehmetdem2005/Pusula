import type { SupabaseClient } from '@supabase/supabase-js'
import { ThompsonSamplingBandit } from './bandit.js'
import { BehaviorOrchestrator } from './behaviors.js'
import { CandidateSelector } from './candidate-selector.js'
import { ContextDetector } from './context-detector.js'
import { TechniqueFilter } from './filter.js'
import { PromptCompiler } from './prompt-compiler.js'
import { RAGEngine } from './rag.js'
import { enrichTechnique } from './technique-library.js'
import type {
  CompiledPrompt,
  ConceptSnapshot,
  EngineDecision,
  LessonOutcome,
  TechniqueMeta,
  UserSnapshot,
} from './types.js'

/**
 * Teaching Engine — Kavra'nın kalbi.
 *
 * Akış:
 *   1. buildUserSnapshot + buildConceptSnapshot
 *   2. detectContext (kullanıcı + mesaj → LearningContext + Intent)
 *   3. loadAllTechniques (DB'den)
 *   4. candidateSelector (context'e uygun aday teknikler)
 *   5. techniqueFilter (cognitive load, blocked vs.)
 *   6. banditSelect (Thompson sampling)
 *   7. behaviorOrchestrator (gizli pedagojik taktikler)
 *   8. rag (varsa kullanıcı PDF'lerinden ilgili context)
 *   9. promptCompile (son system prompt)
 *  10. logDecision (engine_decisions tablosuna)
 */
export class TeachingEngine {
  private contextDetector: ContextDetector
  private filter: TechniqueFilter
  private bandit: ThompsonSamplingBandit
  private behaviorOrchestrator: BehaviorOrchestrator
  private compiler: PromptCompiler
  private rag: RAGEngine | null

  constructor(
    private supabase: SupabaseClient<any>,
    private options: {
      openaiKey?: string // RAG için gerekli
    } = {},
  ) {
    this.contextDetector = new ContextDetector(supabase)
    this.filter = new TechniqueFilter()
    this.bandit = new ThompsonSamplingBandit(supabase)
    this.behaviorOrchestrator = new BehaviorOrchestrator()
    this.compiler = new PromptCompiler()
    this.rag = options.openaiKey ? new RAGEngine(supabase, options.openaiKey) : null
  }

  /**
   * Ana karar verme metodu.
   * Kullanıcı bir mesaj gönderdiğinde, bu çağrılır → LLM'e gönderilecek system prompt hazırlanır.
   */
  async decide(params: {
    userId: string
    lessonId: string
    messageContent: string
    sessionMessageCount: number
    isSessionEnding?: boolean
    groqApiKey?: string // Intent classification için
    personalityId?: string
  }): Promise<{ prompt: CompiledPrompt; decision: EngineDecision }> {
    const startTime = Date.now()

    // 1. Snapshot'lar
    const user = await this.buildUserSnapshot(params.userId)
    const lesson = await this.loadLesson(params.lessonId)
    const concept = lesson.concept_id
      ? await this.buildConceptSnapshot(params.userId, lesson.concept_id)
      : undefined

    // 2. Context tespiti
    const { context, intent, signals } = await this.contextDetector.detect({
      user,
      concept,
      subjectId: lesson.subject_id ?? undefined,
      messageContent: params.messageContent,
      groqApiKey: params.groqApiKey,
    })

    // 3. Teknikleri yükle
    const allTechniques = await this.loadAllTechniques()
    const availableIds = allTechniques.map((t) => t.id)

    const techMap = new Map<string, TechniqueMeta>()
    for (const t of allTechniques) techMap.set(t.code, t)

    // 4. Aday seçim
    const selector = new CandidateSelector(techMap)
    const candidates = selector.select({
      context,
      user,
      concept,
      availableTechniqueIds: availableIds,
    })

    // 5. Hard filter
    const { passed, filtered } = this.filter.filter(candidates, user)

    // 6. Bandit
    const arms = await this.bandit.loadArms(params.userId, passed)
    const banditResult = this.bandit.select(passed, arms)

    // 7. Behaviors
    const behaviorCtx = {
      learningContext: context,
      user,
      concept,
      sessionMessageCount: params.sessionMessageCount,
      isSessionEnding: params.isSessionEnding ?? false,
      lastAssistantMessageWasLong: await this.lastAssistantLong(params.lessonId),
      recentErrorCount: await this.recentErrorCount(params.userId),
    }
    const activeBehaviors = this.behaviorOrchestrator.selectActive(behaviorCtx, 3)

    // 8. RAG (varsa subject ve OpenAI key)
    let ragChunks: EngineDecision['ragChunks'] = []
    let ragContext: string | undefined
    if (this.rag && lesson.subject_id) {
      try {
        ragChunks = await this.rag.retrieveContext({
          userId: params.userId,
          subjectId: lesson.subject_id,
          query: params.messageContent,
          topK: 4,
        })
        if (ragChunks.length > 0) {
          ragContext = this.rag.formatAsContext(ragChunks)
        }
      } catch (err) {
        // RAG hata verse bile kararı bozma
        console.warn('RAG failed:', err)
      }
    }

    // 9. Personality
    let personalityFragment: string | undefined
    let personalityTemp: number | undefined
    if (params.personalityId) {
      const { data: p } = await this.supabase
        .from('personalities')
        .select('system_prompt_fragment, recommended_temperature')
        .eq('id', params.personalityId)
        .single()
      personalityFragment = p?.system_prompt_fragment
      personalityTemp = p?.recommended_temperature
    } else if (lesson.personality_id) {
      const { data: p } = await this.supabase
        .from('personalities')
        .select('system_prompt_fragment, recommended_temperature')
        .eq('id', lesson.personality_id)
        .single()
      personalityFragment = p?.system_prompt_fragment
      personalityTemp = p?.recommended_temperature
    }

    // 10. Recent mistakes (error portfolio)
    const recentMistakes = await this.recentMistakes(params.userId, concept?.conceptId)

    // 11. Compile
    const prompt = this.compiler.compile({
      context,
      technique: banditResult.selected,
      behaviorCodes: activeBehaviors.map((b) => b.code),
      personalityFragment,
      personalityTemperature: personalityTemp,
      ragContext,
      concept,
      recentMistakes,
    })

    const decision: EngineDecision = {
      context,
      intent,
      selectedTechnique: banditResult.selected,
      activeBehaviors: activeBehaviors.map((b) => b.code),
      banditScore: banditResult.score,
      ragChunks,
      reasoning: {
        contextSignals: signals,
        candidateCount: candidates.length,
        filteredOut: filtered.map((f) => ({
          techniqueId: f.technique.id,
          reason: f.reason,
        })),
        banditSamples: banditResult.allScores,
      },
    }

    // 12. Log decision
    await this.logDecision(params.lessonId, params.userId, decision, Date.now() - startTime)

    return { prompt, decision }
  }

  /**
   * Ders tamamlanınca rating feedback'ini bandit'e ilet.
   * Kullanıcı rating vermese bile implicit sinyaller (ders bitti mi, mesaj sayısı vb.) kullanılır.
   */
  async recordOutcome(outcome: LessonOutcome): Promise<void> {
    if (outcome.userRating) {
      await this.bandit.updateFromRating(outcome.userId, outcome.techniqueId, outcome.userRating)
    } else if (outcome.completed && outcome.messageCount >= 3) {
      await this.bandit.updateFromImplicit(outcome.userId, outcome.techniqueId, 'completed')
    } else if (!outcome.completed) {
      await this.bandit.updateFromImplicit(outcome.userId, outcome.techniqueId, 'abandoned')
    }

    if (outcome.quizPerformance !== undefined) {
      await this.bandit.updateFromImplicit(
        outcome.userId,
        outcome.techniqueId,
        outcome.quizPerformance >= 0.7 ? 'quiz_correct' : 'quiz_wrong',
      )
    }
  }

  // ========== private yardımcılar ==========

  private async buildUserSnapshot(userId: string): Promise<UserSnapshot> {
    const now = new Date()
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [prefsResp, streakResp, recentLessonsResp, recentMsgsResp] = await Promise.all([
      this.supabase
        .from('user_preferences')
        .select('blocked_techniques, preferred_content_types')
        .eq('user_id', userId)
        .single(),
      this.supabase.from('streaks').select('current_streak').eq('user_id', userId).single(),
      this.supabase
        .from('lessons')
        .select('user_rating, started_at')
        .eq('user_id', userId)
        .not('user_rating', 'is', null)
        .order('started_at', { ascending: false })
        .limit(5),
      this.supabase
        .from('messages')
        .select('id, created_at')
        .gte('created_at', since.toISOString()),
    ])

    // Fatigue signal: son 24 saatte çok mesaj + geç saat
    const msgCount = recentMsgsResp.data?.length ?? 0
    const hour = now.getHours()
    const isLate = hour >= 22 || hour < 6
    const fatigue = Math.min(1, (msgCount / 100) * 0.5 + (isLate ? 0.4 : 0))

    // Session duration — son aktif lesson'dan tahmin (basit)
    const sessionDuration = 10 // TODO: gerçek hesaplama

    return {
      userId,
      localTime: now,
      sessionDurationMinutes: sessionDuration,
      streakDays: streakResp.data?.current_streak ?? 0,
      recentRatings: (recentLessonsResp.data ?? []).map((l: any) => l.user_rating).filter(Boolean),
      totalMessagesLast24h: msgCount,
      blockedTechniques: prefsResp.data?.blocked_techniques ?? [],
      preferredContentTypes: prefsResp.data?.preferred_content_types ?? [],
      fatigueSigml: fatigue,
    }
  }

  private async buildConceptSnapshot(
    userId: string,
    conceptId: string,
  ): Promise<ConceptSnapshot | undefined> {
    const [conceptResp, progressResp] = await Promise.all([
      this.supabase.from('concepts').select('*').eq('id', conceptId).single(),
      this.supabase
        .from('progress')
        .select('*')
        .eq('user_id', userId)
        .eq('concept_id', conceptId)
        .maybeSingle(),
    ])

    if (!conceptResp.data) return undefined

    const concept = conceptResp.data
    const progress = progressResp.data

    const nextReview = progress?.next_review_at ? new Date(progress.next_review_at) : null
    const isDue = nextReview ? nextReview <= new Date() : true

    // Prerequisites mastery
    const prereqIds = concept.prerequisites ?? []
    let prereqMastered = true
    if (prereqIds.length > 0) {
      const { data: prereqProgress } = await this.supabase
        .from('progress')
        .select('mastery_score')
        .eq('user_id', userId)
        .in('concept_id', prereqIds)
      const avg = prereqProgress?.length
        ? prereqProgress.reduce((sum: number, p: any) => sum + (p.mastery_score ?? 0), 0) /
          prereqProgress.length
        : 0
      prereqMastered = avg >= 60
    }

    return {
      conceptId: concept.id,
      name: concept.name,
      difficulty: concept.difficulty ?? 1,
      easeFactor: Number(progress?.ease_factor ?? 2.5),
      repetitions: progress?.repetitions ?? 0,
      masteryScore: Number(progress?.mastery_score ?? 0),
      confidence: Number(progress?.confidence ?? 0.5),
      lastReviewedAt: progress?.last_reviewed_at ? new Date(progress.last_reviewed_at) : null,
      isDue,
      prerequisitesMastered: prereqMastered,
    }
  }

  private async loadLesson(lessonId: string) {
    const { data, error } = await this.supabase
      .from('lessons')
      .select('id, user_id, subject_id, concept_id, personality_id')
      .eq('id', lessonId)
      .single()
    if (error || !data) throw new Error(`Lesson ${lessonId} bulunamadı`)
    return data
  }

  private async loadAllTechniques(): Promise<TechniqueMeta[]> {
    const { data } = await this.supabase
      .from('techniques')
      .select('*')
      .eq('is_active', true)
      .eq('kind', 'student_facing')
    return (data ?? []).map(enrichTechnique)
  }

  private async lastAssistantLong(lessonId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('messages')
      .select('content')
      .eq('lesson_id', lessonId)
      .eq('role', 'assistant')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    return (data?.content?.length ?? 0) > 800
  }

  private async recentErrorCount(userId: string): Promise<number> {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count } = await this.supabase
      .from('quiz_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_correct', false)
      .gte('created_at', since)
    return count ?? 0
  }

  private async recentMistakes(userId: string, conceptId?: string): Promise<string[]> {
    let q = this.supabase
      .from('error_portfolio')
      .select('mistake_summary')
      .eq('user_id', userId)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(3)

    if (conceptId) q = q.eq('concept_id', conceptId)

    const { data } = await q
    return (data ?? []).map((r: any) => r.mistake_summary)
  }

  private async logDecision(
    lessonId: string,
    userId: string,
    decision: EngineDecision,
    latencyMs: number,
  ) {
    await this.supabase.from('engine_decisions').insert({
      lesson_id: lessonId,
      user_id: userId,
      detected_context: decision.context,
      candidate_count: decision.reasoning.candidateCount,
      selected_technique_id: decision.selectedTechnique.id,
      selected_behavior_codes: decision.activeBehaviors,
      bandit_sample_score: decision.banditScore,
      rag_chunks_used: decision.ragChunks.length,
      reasoning: {
        ...decision.reasoning,
        intent: decision.intent,
        latencyMs,
      },
    })
  }
}
