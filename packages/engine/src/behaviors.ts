import type { BehaviorCode, ConceptSnapshot, LearningContext, UserSnapshot } from './types.js'

/**
 * Engine behaviors (C1-C10): öğrenciye açıkça söylenmeyen,
 * arka planda uygulanan pedagojik taktikler.
 *
 * Her behavior'ın:
 * - "should activate" kuralı (koşullar)
 * - system prompt'a enjekte edeceği fragment
 */

export interface BehaviorContext {
  learningContext: LearningContext
  user: UserSnapshot
  concept?: ConceptSnapshot
  sessionMessageCount: number
  isSessionEnding: boolean
  lastAssistantMessageWasLong: boolean
  recentErrorCount: number // Son N quiz'de kaç yanlış
}

interface Behavior {
  code: BehaviorCode
  shouldActivate: (ctx: BehaviorContext) => boolean
  promptFragment: string
  priority: number // Yüksek = daha önce injekte et
}

const BEHAVIORS: Behavior[] = [
  {
    code: 'C2-peak-end',
    priority: 100,
    shouldActivate: (ctx) => ctx.isSessionEnding,
    promptFragment:
      'SESSION SONU KURALI (Peak-End): Bu yanıtını öğrencinin hafızasında olumlu kalacak şekilde bitir. Son cümlelerde küçük bir başarı hissi yarat — öğrencinin ne öğrendiğini özetle ve bir merak tohumu bırak. Kuru kapatma yok.',
  },

  {
    code: 'C6-question-seeding',
    priority: 95,
    shouldActivate: (ctx) =>
      ctx.learningContext === 'first_exposure' && ctx.sessionMessageCount <= 1,
    promptFragment:
      'BAŞLANGIÇ KURALI (Question Seeding): Yanıtına doğrudan tanımla değil, merak uyandıran küçük bir soru ya da günlük hayattan çarpıcı bir örnekle başla. Öğrencinin "hmm, bu ilginçmiş" demesini istiyorsun.',
  },

  {
    code: 'C10-pre-testing',
    priority: 90,
    shouldActivate: (ctx) =>
      ctx.learningContext === 'first_exposure' && ctx.sessionMessageCount === 0,
    promptFragment:
      'ÖN-TEST ETKİSİ: Konuyu anlatmadan önce, ilgili bir sorunun cevabını öğrencinin tahmin etmesini iste. Yanlış tahmin bile sonraki öğrenmeyi %20 artırır. Tahmin aldıktan sonra konuya geç.',
  },

  {
    code: 'C3-scaffolding-fading',
    priority: 85,
    shouldActivate: (ctx) =>
      ctx.learningContext === 'practice' && !!ctx.concept && ctx.concept.repetitions >= 2,
    promptFragment:
      'KADEMELİ İPUCU (Scaffolding Fading): Öğrenci bu konuyu daha önce görmüş. Direkt cevap verme — önce %10 ipucu ver, sonra gerekiyorsa %50, en son tam cevap. Öğrencinin kendi düşünmesine yer bırak.',
  },

  {
    code: 'C1-misconception-mining',
    priority: 85,
    shouldActivate: (ctx) => ctx.learningContext === 'weak_spot' && ctx.recentErrorCount >= 2,
    promptFragment:
      'YANLIŞ KAVRAMSALLAŞTIRMA TARAMASI: Öğrenci bu konuda tekrarlayan hatalar yapıyor. Önce SENARYOLAR üzerinden "şunu mu karıştırıyorsun?" diye sor. Hatanın kökündeki kavramsal yanlışı bul, sonra düzelt.',
  },

  {
    code: 'C7-metaphorical-correction',
    priority: 80,
    shouldActivate: (ctx) => ctx.learningContext === 'weak_spot',
    promptFragment:
      'METAFORİK DÜZELTME: Yanlışı söylerken kuru "yanlış" deme. Bir benzetme kullan — "bu mantıkla gidersen köprü çöker, ama doğrusu şu şekilde sağlam durur" tipi. Hata somutlaşsın.',
  },

  {
    code: 'C5-reappraisal',
    priority: 75,
    shouldActivate: (ctx) => {
      const lastAvg = ctx.user.recentRatings.length
        ? ctx.user.recentRatings.slice(-3).reduce((a, b) => a + b, 0) / 3
        : 5
      return lastAvg < 3 // Öğrenci zorlanıyor
    },
    promptFragment:
      'BİLİŞSEL YENİDEN DEĞERLENDİRME: Öğrenci son seanslarda zorlanmış. Konunun "sıkıcı/zor" algısını kırmak için bu konunun en tuhaf/şaşırtıcı bir gerçeğini paylaş. Merak → motivasyon.',
  },

  {
    code: 'C3-cognitive-apprenticeship',
    priority: 70,
    shouldActivate: (ctx) => ctx.learningContext === 'practice',
    promptFragment:
      'BİLİŞSEL ÇIRAKLIK: Problem çözerken "benim aklıma ilk gelen şey..." diyerek DÜŞÜNCE SESİNİ aç. Hangi ipucu seni yönlendirdi, neden bu yolu seçtin — öğrenciye uzman düşüncesini göster.',
  },

  {
    code: 'C4-concept-blending',
    priority: 60,
    shouldActivate: (ctx) => ctx.learningContext === 'first_exposure' && !!ctx.concept,
    promptFragment:
      'KAVRAM MELEZLEME: Eğer öğrenci konuyu anlamakta zorlanırsa, farklı bir alandan bir örnekle açıkla (fizik ↔ tarih, müzik ↔ matematik vb.). Beklenmedik bağlantı → kalıcı öğrenme.',
  },

  {
    code: 'C6-multi-perspective',
    priority: 55,
    shouldActivate: (ctx) => ctx.learningContext === 'practice' && ctx.sessionMessageCount > 3,
    promptFragment:
      'ÇOKLU PERSPEKTİF: Bu noktada aynı konuyu bir başka açıdan ele al — alternatif bir yaklaşım, bir eleştirmen gözünden, ya da farklı bir disiplinden. Tek perspektif kalıplaşmaya yol açar.',
  },

  {
    code: 'C5-silence-protocol',
    priority: 50,
    shouldActivate: (ctx) => ctx.learningContext === 'weak_spot',
    promptFragment:
      'SESSİZLİK PROTOKOLÜ: Soru sorduktan sonra öğrencinin düşünmesine zaman ver — cevabı hemen kendin söyleme. "Cevabı biraz düşün, hazır olunca yaz" diye ek yap.',
  },

  {
    code: 'C6-signal-noise',
    priority: 45,
    shouldActivate: (ctx) => ctx.lastAssistantMessageWasLong,
    promptFragment:
      'SİNYAL-GÜRÜLTÜ KURALI: Önceki yanıtın uzundu. Bu seferki yanıtında sadece 2-3 kritik noktaya odaklan, lüzumsuz detayları at. Hangisi gerçekten sınav/hayat için önemli?',
  },

  {
    code: 'C9-random-input',
    priority: 40,
    shouldActivate: (ctx) => ctx.learningContext === 'creativity_block',
    promptFragment:
      'RASTGELE GİRDİ: Öğrenci tıkanmış. Konuyla alakasız bir kelime/kavram seç (rastgele) ve "bu konuyla X arasında nasıl bir bağlantı kurabiliriz?" diye sor. Yaratıcı sıçrama.',
  },

  {
    code: 'C9-defamiliarization',
    priority: 40,
    shouldActivate: (ctx) => ctx.learningContext === 'creativity_block',
    promptFragment:
      'YABANCILAŞTIRMA: Tanıdık bir kavramı, sanki ilk kez görüyormuş gibi betimle ("zürafa = bulutları yiyen kule" tarzı). Yeni bakış → yeni içgörü.',
  },

  {
    code: 'C2-ikea-effect',
    priority: 35,
    shouldActivate: (ctx) => ctx.learningContext === 'practice' && ctx.sessionMessageCount > 2,
    promptFragment:
      'IKEA ETKİSİ: Bilgiyi tam vermek yerine yarısını ver, kalanını öğrenci tamamlasın. Örn: "Tanımın yarısı şu... kalan kelimeleri sen düşün." Öğrenciyi yapan durumuna geçir.',
  },
]

export class BehaviorOrchestrator {
  /**
   * Context'e uygun aktif behavior'ları seç ve priority'ye göre sırala.
   * Maksimum N tane seçilir (prompt'u boğmamak için).
   */
  selectActive(ctx: BehaviorContext, maxActive = 3): Behavior[] {
    const active = BEHAVIORS.filter((b) => b.shouldActivate(ctx))
    active.sort((a, b) => b.priority - a.priority)
    return active.slice(0, maxActive)
  }

  /** UI/debug için: tüm behavior kodları. */
  listAll(): BehaviorCode[] {
    return BEHAVIORS.map((b) => b.code)
  }
}

export { BEHAVIORS }
