/**
 * SM-2 Algoritması (SuperMemo 2, Piotr Wozniak, 1985)
 *
 * Aralıklı tekrar sisteminin altın standartı. Her kart için:
 * - ease_factor (kolaylık faktörü, başlangıç 2.5)
 * - interval_days (sonraki tekrar arası gün)
 * - repetitions (üst üste başarılı tekrar sayısı)
 *
 * Kullanıcı her tekrarda 0-5 arası "quality" verir:
 * - 5: Mükemmel hatırlama
 * - 4: Hatırlama, küçük tereddüt
 * - 3: Zorlanarak hatırlama
 * - 2: Yanlış cevap, ama doğrusunu görünce kolay hatırlandı
 * - 1: Yanlış, ve doğrusu güç
 * - 0: Hiç hatırlamadı
 *
 * quality < 3 → repetitions sıfırlanır (lapse), kart yeniden öğrenmeye gider
 * quality >= 3 → ease faktör güncellenir, interval büyür
 */

export interface SM2State {
  easeFactor: number // E-Factor (1.3 - ?)
  intervalDays: number // Sonraki tekrar arası
  repetitions: number // Üst üste başarılı tekrar
}

export interface SM2Result extends SM2State {
  nextReviewAt: Date
  isLapse: boolean // quality < 3 ise true
}

const MIN_EASE = 1.3
const FIRST_INTERVAL = 1
const SECOND_INTERVAL = 6

/**
 * SM-2 hesaplaması.
 * @param state Şu anki kart durumu (yeni kartsa repetitions=0, ease=2.5)
 * @param quality 0-5 kullanıcı değerlendirmesi
 * @param now Şimdi (test için injectable)
 */
export function applySM2(state: SM2State, quality: number, now: Date = new Date()): SM2Result {
  // Quality clamp
  const q = Math.max(0, Math.min(5, Math.round(quality)))
  const isLapse = q < 3

  let { easeFactor, intervalDays, repetitions } = state

  if (isLapse) {
    // Yanlış cevap → repetitions sıfırla, kart yeniden öğrenmeye
    repetitions = 0
    intervalDays = FIRST_INTERVAL
  } else {
    // Doğru cevap → repetitions artır, interval büyüt
    if (repetitions === 0) {
      intervalDays = FIRST_INTERVAL
    } else if (repetitions === 1) {
      intervalDays = SECOND_INTERVAL
    } else {
      intervalDays = Math.round(intervalDays * easeFactor)
    }
    repetitions += 1
  }

  // E-Factor güncelle (orijinal SM-2 formülü)
  // EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  const delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
  easeFactor = Math.max(MIN_EASE, easeFactor + delta)

  const nextReviewAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000)

  return { easeFactor, intervalDays, repetitions, nextReviewAt, isLapse }
}

/**
 * UI butonlarından quality'ye dönüşüm.
 * 4 buton: Tekrar / Zor / İyi / Kolay → 1 / 3 / 4 / 5
 */
export type FlashcardChoice = 'again' | 'hard' | 'good' | 'easy'

export const CHOICE_TO_QUALITY: Record<FlashcardChoice, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
}

/**
 * Sonraki review için tahmini interval'ları hesapla — UI'da "1g / 3g / 1ay" göstermek için.
 */
export function previewIntervals(state: SM2State): Record<FlashcardChoice, string> {
  const labels: Record<FlashcardChoice, string> = {
    again: '',
    hard: '',
    good: '',
    easy: '',
  }

  for (const choice of ['again', 'hard', 'good', 'easy'] as FlashcardChoice[]) {
    const q = CHOICE_TO_QUALITY[choice]
    const result = applySM2(state, q)
    labels[choice] = formatInterval(result.intervalDays)
  }

  return labels
}

function formatInterval(days: number): string {
  if (days < 1) return '<1g'
  if (days === 1) return '1g'
  if (days < 7) return `${days}g`
  if (days < 30) return `${Math.round(days / 7)}h`
  if (days < 365) return `${Math.round(days / 30)}ay`
  return `${(days / 365).toFixed(1)}yıl`
}
