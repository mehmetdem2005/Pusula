// ============================================================================
// SM-2 Aralıklı Tekrar Algoritması (Supermemo 2)
// Kaynak: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
// ============================================================================

export interface SM2State {
  easeFactor: number
  interval: number // gün
  repetitions: number
}

export interface SM2Result extends SM2State {
  nextReviewAt: Date
}

/**
 * Kullanıcı review kalitesi:
 * 0 - Tam unutulmuş
 * 1 - Yanlış, ama cevap görünce tanıdık
 * 2 - Yanlış, ama kolay hatırlandı
 * 3 - Doğru, ama zorlanarak
 * 4 - Doğru, az tereddütle
 * 5 - Mükemmel, anında
 */
export function sm2(previous: SM2State, quality: 0 | 1 | 2 | 3 | 4 | 5): SM2Result {
  const { easeFactor, interval, repetitions } = previous

  if (quality < 3) {
    // Yanlış cevap → baştan başla
    return {
      repetitions: 0,
      interval: 1,
      easeFactor: Math.max(1.3, easeFactor), // ease factor düşmez
      nextReviewAt: addDays(new Date(), 1),
    }
  }

  let newInterval: number
  if (repetitions === 0) newInterval = 1
  else if (repetitions === 1) newInterval = 6
  else newInterval = Math.round(interval * easeFactor)

  // Ease factor güncelle (doğru cevapta)
  const newEase = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))

  return {
    repetitions: repetitions + 1,
    interval: newInterval,
    easeFactor: newEase,
    nextReviewAt: addDays(new Date(), newInterval),
  }
}

export function sm2Initial(): SM2State {
  return { easeFactor: 2.5, interval: 1, repetitions: 0 }
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// ============================================================================
// Leitner System (5 kutu)
// ============================================================================
export const LEITNER_INTERVALS_DAYS = [1, 2, 4, 8, 16] as const

export function leitnerNext(box: number, correct: boolean): { box: number; intervalDays: number } {
  const newBox = correct ? Math.min(5, box + 1) : 1
  return { box: newBox, intervalDays: LEITNER_INTERVALS_DAYS[newBox - 1]! }
}
