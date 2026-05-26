/**
 * FSRS-5 (Free Spaced Repetition Scheduler) — Sıfır bağımlılık implementasyonu
 * ===========================================================================
 *
 * Anki 25.07'den itibaren resmi varsayılan algoritma. Aynı retention için
 * SM-2'ye göre ~%30 daha az inceleme.
 *
 * Reference: https://github.com/open-spaced-repetition/ts-fsrs
 * Paper: https://github.com/open-spaced-repetition/free-spaced-repetition-scheduler
 *
 * NOT: Basit ve okunabilir bir implementasyon. Production'da ts-fsrs npm paketi
 * de kullanılabilir; Kavra'nın gereksinimi için bu yeterli.
 */

export type Rating = 1 | 2 | 3 | 4 // Again, Hard, Good, Easy
export type State = 'new' | 'learning' | 'review' | 'relearning'

export interface FSRSCard {
  difficulty: number // 0-10
  stability: number // gün
  retrievability: number // 0-1
  state: State
  step: number
  due: Date
  lastReview: Date | null
  reps: number
  lapses: number
}

export interface FSRSParams {
  w: number[] // 17 ağırlık
  requestRetention: number // 0.7 - 0.99 (default 0.9)
  maximumInterval: number // gün (default 36500)
  enableShortTerm: boolean
}

export const DEFAULT_PARAMS: FSRSParams = {
  // ts-fsrs v5 default w
  w: [
    0.4072, 1.1829, 3.1262, 15.4722, 7.2102, 0.5316, 1.0651, 0.0234, 1.616, 0.1544, 1.0824, 1.9813,
    0.0953, 0.2975, 2.2042, 0.2407, 2.9466,
  ],
  requestRetention: 0.9,
  maximumInterval: 36500,
  enableShortTerm: true,
}

const FACTOR = 19.0 / 81.0
const DECAY = -0.5

export function newCard(): FSRSCard {
  return {
    difficulty: 0,
    stability: 0,
    retrievability: 1,
    state: 'new',
    step: 0,
    due: new Date(),
    lastReview: null,
    reps: 0,
    lapses: 0,
  }
}

/**
 * Retrievability hesabı: kart üzerinden geçen süre + stability'ye bakar.
 * R = (1 + FACTOR * t / S) ^ DECAY
 */
export function retrievability(card: FSRSCard, now: Date = new Date()): number {
  if (card.state === 'new' || !card.lastReview || card.stability === 0) return 1
  const elapsedDays = (now.getTime() - card.lastReview.getTime()) / 86400000
  return Math.pow(1 + (FACTOR * elapsedDays) / card.stability, DECAY)
}

function nextInterval(stability: number, params: FSRSParams): number {
  const interval = (stability / FACTOR) * (Math.pow(params.requestRetention, 1 / DECAY) - 1)
  return Math.max(1, Math.min(Math.round(interval), params.maximumInterval))
}

function initStability(rating: Rating, w: number[]): number {
  return Math.max(0.1, w[rating - 1]!)
}

function initDifficulty(rating: Rating, w: number[]): number {
  return Math.min(10, Math.max(1, w[4]! - Math.exp(w[5]! * (rating - 1)) + 1))
}

function nextDifficulty(d: number, rating: Rating, w: number[]): number {
  const deltaD = -w[6]! * (rating - 3)
  const newD = d + deltaD * ((10 - d) / 9)
  return Math.min(10, Math.max(1, w[4]! + (newD - w[4]!) * 0.5))
}

function nextStabilitySuccess(
  d: number,
  s: number,
  r: number,
  rating: Rating,
  w: number[],
): number {
  const hardPenalty = rating === 2 ? w[15]! : 1
  const easyBonus = rating === 4 ? w[16]! : 1
  return (
    s *
    (1 +
      Math.exp(w[8]!) *
        (11 - d) *
        Math.pow(s, -w[9]!) *
        (Math.exp((1 - r) * w[10]!) - 1) *
        hardPenalty *
        easyBonus)
  )
}

function nextStabilityFail(d: number, s: number, r: number, w: number[]): number {
  return Math.max(
    0.01,
    Math.min(
      w[11]! * Math.pow(d, -w[12]!) * (Math.pow(s + 1, w[13]!) - 1) * Math.exp((1 - r) * w[14]!),
      s,
    ),
  )
}

/**
 * Bir kartı puanladıktan sonraki state'i hesapla.
 */
export function scheduleCard(
  card: FSRSCard,
  rating: Rating,
  now: Date = new Date(),
  params: FSRSParams = DEFAULT_PARAMS,
): FSRSCard {
  const w = params.w

  // İlk inceleme (new card)
  if (card.state === 'new') {
    const stability = initStability(rating, w)
    const difficulty = initDifficulty(rating, w)
    const interval = rating === 1 ? 0 : nextInterval(stability, params)

    return {
      ...card,
      difficulty,
      stability,
      retrievability: 1,
      state: rating === 1 ? 'learning' : 'review',
      step: 0,
      due: new Date(now.getTime() + interval * 86400000),
      lastReview: now,
      reps: card.reps + 1,
    }
  }

  // Mevcut kart inceleniyor
  const r = retrievability(card, now)

  if (rating === 1) {
    // Lapse
    const stability = nextStabilityFail(card.difficulty, card.stability, r, w)
    const difficulty = nextDifficulty(card.difficulty, rating, w)
    const interval = nextInterval(stability, params)

    return {
      ...card,
      difficulty,
      stability,
      retrievability: r,
      state: 'relearning',
      step: 0,
      due: new Date(now.getTime() + Math.max(1, interval) * 86400000),
      lastReview: now,
      reps: card.reps + 1,
      lapses: card.lapses + 1,
    }
  }

  // Hard / Good / Easy
  const stability = nextStabilitySuccess(card.difficulty, card.stability, r, rating, w)
  const difficulty = nextDifficulty(card.difficulty, rating, w)
  const interval = nextInterval(stability, params)

  return {
    ...card,
    difficulty,
    stability,
    retrievability: r,
    state: 'review',
    step: 0,
    due: new Date(now.getTime() + interval * 86400000),
    lastReview: now,
    reps: card.reps + 1,
  }
}

/**
 * 4 buton için sonraki interval önizlemesi (UI'da göstermek için).
 */
export function previewIntervals(
  card: FSRSCard,
  now: Date = new Date(),
  params: FSRSParams = DEFAULT_PARAMS,
): Record<Rating, string> {
  const result: any = {}
  for (let rating = 1; rating <= 4; rating++) {
    const next = scheduleCard(card, rating as Rating, now, params)
    const intervalDays = Math.round((next.due.getTime() - now.getTime()) / 86400000)
    result[rating] = formatInterval(intervalDays)
  }
  return result
}

export function formatInterval(days: number): string {
  if (days < 1) return '<1g'
  if (days < 30) return `${days}g`
  if (days < 365) return `${Math.round(days / 30)}ay`
  return `${(days / 365).toFixed(1)}y`
}
