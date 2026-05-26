import type { SupabaseClient } from '@supabase/supabase-js'
import type { ArmState, TechniqueMeta } from './types.js'

/**
 * Thompson Sampling multi-armed bandit.
 *
 * Her (user, technique) çifti bir arm. Beta(alpha, beta) dağılımından
 * örnek çekilir — alpha = başarılı kullanımlar, beta = başarısız.
 *
 * Seçim: her arm'dan sample çek, en yüksek olanı seç.
 * Güncelleme: ders sonu rating → success/failure.
 *
 * Cold start: yeni kullanıcı için tüm arm'lar Beta(1, 1) = uniform.
 * Bu, uniform random seçim gibi davranır — keşif.
 * Zamanla alpha/beta ayrılır, tercih görünür hale gelir.
 */
export class ThompsonSamplingBandit {
  constructor(private supabase: SupabaseClient<any>) {}

  /**
   * Aday tekniklerin her biri için arm state yükle, eksikleri cold start Beta(1,1) ile doldur.
   */
  async loadArms(userId: string, techniques: TechniqueMeta[]): Promise<Map<string, ArmState>> {
    const techIds = techniques.map((t) => t.id)

    const { data } = await this.supabase
      .from('technique_arms')
      .select('*')
      .eq('user_id', userId)
      .in('technique_id', techIds)

    const arms = new Map<string, ArmState>()
    for (const row of data ?? []) {
      arms.set(row.technique_id, {
        techniqueId: row.technique_id,
        alpha: Number(row.alpha),
        beta: Number(row.beta),
        totalUses: row.total_uses,
        avgRating: row.avg_rating !== null ? Number(row.avg_rating) : null,
      })
    }

    // Eksik olan teknikler için cold start
    for (const tech of techniques) {
      if (!arms.has(tech.id)) {
        arms.set(tech.id, {
          techniqueId: tech.id,
          alpha: 1.0,
          beta: 1.0,
          totalUses: 0,
          avgRating: null,
        })
      }
    }

    return arms
  }

  /**
   * Thompson sample: her arm'dan Beta(alpha, beta) dağılımından örnek çek, en yükseği seç.
   */
  select(
    candidates: TechniqueMeta[],
    arms: Map<string, ArmState>,
  ): {
    selected: TechniqueMeta
    score: number
    allScores: Array<{ techniqueId: string; score: number; alpha: number; beta: number }>
  } {
    if (candidates.length === 0) throw new Error('Aday yok')

    const scores = candidates.map((tech) => {
      const arm = arms.get(tech.id)!
      const score = this.sampleBeta(arm.alpha, arm.beta)
      return { tech, score, alpha: arm.alpha, beta: arm.beta }
    })

    scores.sort((a, b) => b.score - a.score)
    const winner = scores[0]!

    return {
      selected: winner.tech,
      score: winner.score,
      allScores: scores.map((s) => ({
        techniqueId: s.tech.id,
        score: s.score,
        alpha: s.alpha,
        beta: s.beta,
      })),
    }
  }

  /**
   * Ders sonu: rating 1-5 → success ratio.
   * 5 → alpha += 1 (tam başarı)
   * 4 → alpha += 0.75
   * 3 → alpha += 0.4, beta += 0.4 (nötr)
   * 2 → beta += 0.75
   * 1 → beta += 1 (başarısızlık)
   */
  async updateFromRating(
    userId: string,
    techniqueId: string,
    rating: number,
    context?: string,
  ): Promise<void> {
    const { alphaDelta, betaDelta } = this.ratingToBeta(rating)

    // Mevcut arm'ı al
    const { data: existing } = await this.supabase
      .from('technique_arms')
      .select('*')
      .eq('user_id', userId)
      .eq('technique_id', techniqueId)
      .single()

    const newAlpha = Number(existing?.alpha ?? 1) + alphaDelta
    const newBeta = Number(existing?.beta ?? 1) + betaDelta
    const totalUses = (existing?.total_uses ?? 0) + 1
    const totalSuccesses = (existing?.total_successes ?? 0) + (rating >= 4 ? 1 : 0)

    // Moving average rating (son 20)
    const prevAvg = existing?.avg_rating !== null ? Number(existing?.avg_rating ?? 0) : null
    const newAvg =
      prevAvg === null
        ? rating
        : Math.min(totalUses, 20) === 20
          ? prevAvg * 0.95 + rating * 0.05
          : (prevAvg * (totalUses - 1) + rating) / totalUses

    await this.supabase.from('technique_arms').upsert({
      user_id: userId,
      technique_id: techniqueId,
      alpha: newAlpha,
      beta: newBeta,
      total_uses: totalUses,
      total_successes: totalSuccesses,
      avg_rating: newAvg,
      last_used_at: new Date().toISOString(),
      last_context: context ?? null,
    })
  }

  /**
   * İmplisit sinyaller: ders tamamlandı ama rating yok. Zayıf success/failure sinyali.
   */
  async updateFromImplicit(
    userId: string,
    techniqueId: string,
    signal: 'completed' | 'abandoned' | 'quiz_correct' | 'quiz_wrong',
  ): Promise<void> {
    const deltas: Record<typeof signal, { a: number; b: number }> = {
      completed: { a: 0.3, b: 0 },
      abandoned: { a: 0, b: 0.5 },
      quiz_correct: { a: 0.5, b: 0 },
      quiz_wrong: { a: 0, b: 0.4 },
    }

    const { a, b } = deltas[signal]
    if (a === 0 && b === 0) return

    const { data: existing } = await this.supabase
      .from('technique_arms')
      .select('alpha, beta, total_uses')
      .eq('user_id', userId)
      .eq('technique_id', techniqueId)
      .single()

    await this.supabase.from('technique_arms').upsert({
      user_id: userId,
      technique_id: techniqueId,
      alpha: Number(existing?.alpha ?? 1) + a,
      beta: Number(existing?.beta ?? 1) + b,
      total_uses: existing?.total_uses ?? 0,
      last_used_at: new Date().toISOString(),
    })
  }

  private ratingToBeta(rating: number): { alphaDelta: number; betaDelta: number } {
    const clamped = Math.max(1, Math.min(5, rating))
    const map: Record<number, { alphaDelta: number; betaDelta: number }> = {
      5: { alphaDelta: 1.0, betaDelta: 0 },
      4: { alphaDelta: 0.75, betaDelta: 0.1 },
      3: { alphaDelta: 0.4, betaDelta: 0.4 },
      2: { alphaDelta: 0.1, betaDelta: 0.75 },
      1: { alphaDelta: 0, betaDelta: 1.0 },
    }
    return map[Math.round(clamped)]!
  }

  /**
   * Beta(alpha, beta) dağılımından örnek çek.
   * İki Gamma örneği bölüşüm yöntemi: X = G1 / (G1 + G2).
   * Marsaglia & Tsang Gamma örnekleyicisi (k >= 1).
   */
  private sampleBeta(alpha: number, beta: number): number {
    const x = this.sampleGamma(alpha, 1)
    const y = this.sampleGamma(beta, 1)
    return x / (x + y)
  }

  private sampleGamma(k: number, theta: number): number {
    // Marsaglia & Tsang (2000), k >= 1 için
    // k < 1 için G. Marsaglia'nın boost formülü
    if (k < 1) {
      const r = Math.random()
      return this.sampleGamma(k + 1, theta) * Math.pow(r, 1 / k)
    }

    const d = k - 1 / 3
    const c = 1 / Math.sqrt(9 * d)

    while (true) {
      let x: number
      let v: number
      do {
        x = this.sampleNormal()
        v = 1 + c * x
      } while (v <= 0)

      v = v * v * v
      const u = Math.random()
      if (u < 1 - 0.0331 * x * x * x * x) return d * v * theta
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * theta
    }
  }

  private sampleNormal(): number {
    // Box-Muller
    const u = Math.random() || 1e-10
    const v = Math.random() || 1e-10
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }
}
