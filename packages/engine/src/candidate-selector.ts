import type { ConceptSnapshot, LearningContext, TechniqueMeta, UserSnapshot } from './types.js'

/**
 * Her context için o context'e en uygun teknik kodları.
 * Pedagojik literatüre dayanan manuel seçim — bandit bunların içinden seçer.
 * Birden fazla context'e uyan teknikler birden çok listede olabilir.
 */
const CONTEXT_TO_TECHNIQUES: Record<LearningContext, string[]> = {
  // İlk karşılaşma: yeni bilgi kodla, bağlantı kur
  first_exposure: [
    'M1-T04', // Detaylandırarak Kodlama
    'M1-T05', // Çift Kodlama
    'M1-T08', // Metafor Kullanımı
    'M1-T11', // Hikayeleştirme
    'M2-T01', // Feynman
    'M2-T02', // SQ3R
    'M2-T07', // Sokratik
    'M4-T02', // Mind Map
    'M4-T06', // Sketchnoting
    'M5-T05', // AI Sokratik Tutor
    'M5-T11', // Rol Yapma
  ],

  // Uygulama: pekiştir, iç içe geçir
  practice: [
    'M1-T01', // Aktif Geri Çağırma
    'M3-T01', // Problem Çözme
    'M3-T02', // Pratik Testler
    'M3-T03', // Tersine Mühendislik
    'M3-T04', // Vaka Çalışması
    'M3-T05', // İç İçe Geçirme
    'M5-T01', // Akran Öğretimi (AI)
    'M5-T02', // Münazara
    'M2-T09', // Kendine Öğretme
    'M2-T11', // Öngörücü Yazma
  ],

  // Tekrar: SM-2 / Leitner + aktif hatırlama
  review: [
    'M1-T01', // Aktif Geri Çağırma
    'M1-T02', // Aralıklı Tekrar
    'M1-T03', // Leitner
    'M1-T13', // Zincirleme (bağlantılar)
    'M2-T12', // Özet Çıkarma
    'M3-T02', // Pratik Testler
  ],

  // Zayıf nokta: 5 Neden, metaforik düzeltme, tersine mühendislik
  weak_spot: [
    'M7-T02', // Tersine Öğrenme
    'M2-T07', // Sokratik
    'M2-T09', // Kendine Öğretme
    'M1-T08', // Metafor
    'M3-T03', // Tersine Mühendislik
    'M4-T15', // Argüman Haritalama
    'M1-T04', // Detaylandırarak Kodlama
  ],

  // Sınav: WOOP, beyaz sayfa, pratik test
  exam_prep: [
    'M3-T02', // Pratik Testler
    'M1-T01', // Aktif Geri Çağırma
    'M6-T01', // Pomodoro
    'M2-T03', // Öz Değerlendirme
    'M2-T06', // Hedef Belirleme
    'M1-T03', // Leitner
    'M1-T12', // Chunking
  ],

  // Yaratıcı blok: rastgele girdi, Disney, PMI
  creativity_block: [
    'M5-T04', // Brainstorm
    'M5-T06', // 6 Şapka
    'M7-T01', // İlk Prensipler
    'M7-T02', // Tersine Öğrenme
    'M7-T07', // Düşünce Deneyi
    'M1-T08', // Metafor
    'M1-T11', // Hikayeleştirme
  ],
}

export class CandidateSelector {
  constructor(private techniques: Map<string, TechniqueMeta>) {}

  /**
   * Context + user + concept girdisine göre aday teknik listesi döndürür.
   * student_facing olanları alır, engine_behavior'lar ayrı katmandan.
   */
  select(params: {
    context: LearningContext
    user: UserSnapshot
    concept?: ConceptSnapshot
    availableTechniqueIds: string[] // DB'deki gerçek ID'ler (code'dan maplemek için)
  }): TechniqueMeta[] {
    const { context, user, concept, availableTechniqueIds } = params

    const contextCodes = CONTEXT_TO_TECHNIQUES[context] ?? []

    // Teknikleri yükle
    const candidates: TechniqueMeta[] = []
    for (const code of contextCodes) {
      const tech = this.techniques.get(code)
      if (!tech) continue
      if (tech.kind !== 'student_facing') continue
      if (!availableTechniqueIds.includes(tech.id)) continue
      candidates.push(tech)
    }

    // Fallback: eğer context'ten hiç teknik bulunamazsa genel first_exposure
    if (candidates.length === 0 && context !== 'first_exposure') {
      return this.select({
        ...params,
        context: 'first_exposure',
      })
    }

    return candidates
  }

  /**
   * Debug için: bir teknik hangi context'lere uygun?
   */
  getContextsForTechnique(code: string): LearningContext[] {
    const contexts: LearningContext[] = []
    for (const [ctx, codes] of Object.entries(CONTEXT_TO_TECHNIQUES) as [
      LearningContext,
      string[],
    ][]) {
      if (codes.includes(code)) contexts.push(ctx)
    }
    return contexts
  }
}
