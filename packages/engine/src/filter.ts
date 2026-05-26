import type { TechniqueMeta, UserSnapshot } from './types.js'

export interface FilterResult {
  passed: TechniqueMeta[]
  filtered: Array<{ technique: TechniqueMeta; reason: string }>
}

/**
 * Hard filter: bandit selection'dan ÖNCE çalışır.
 * Pedagojik açıdan uygun olmayan teknikleri mutlaka çıkarır.
 */
export class TechniqueFilter {
  filter(candidates: TechniqueMeta[], user: UserSnapshot): FilterResult {
    const passed: TechniqueMeta[] = []
    const filtered: Array<{ technique: TechniqueMeta; reason: string }> = []

    for (const tech of candidates) {
      const reason = this.rejectReason(tech, user)
      if (reason) {
        filtered.push({ technique: tech, reason })
      } else {
        passed.push(tech)
      }
    }

    // Emniyet: eğer hiçbir teknik geçemezse en az 1 taneyi geri al (lowest difficulty)
    if (passed.length === 0 && candidates.length > 0) {
      const lowest = [...candidates].sort((a, b) => a.cognitiveLoad - b.cognitiveLoad)[0]!
      passed.push(lowest)
      // filtered'dan sil
      const idx = filtered.findIndex((f) => f.technique.id === lowest.id)
      if (idx >= 0) filtered.splice(idx, 1)
    }

    return { passed, filtered }
  }

  private rejectReason(tech: TechniqueMeta, user: UserSnapshot): string | null {
    // 1. Kullanıcı kapatmış
    if (user.blockedTechniques.includes(tech.id)) {
      return 'user_blocked'
    }

    // 2. Yorgun + yüksek cognitive load teknik
    if (user.fatigueSigml > 0.7 && tech.cognitiveLoad >= 4) {
      return 'too_cognitively_demanding_when_fatigued'
    }

    // 3. Geç saat + uzun teknik
    const hour = user.localTime.getHours()
    const isLate = hour >= 22 || hour < 6
    if (isLate && (tech.estimatedDurationMinutes ?? 0) > 30) {
      return 'too_long_for_late_hour'
    }

    // 4. Çok uzun seans + contraindication
    if (user.sessionDurationMinutes > 60 && tech.contraindications.includes('fatigue')) {
      return 'fatigued_user_contraindication'
    }

    // 5. Ardışık düşük rating → o teknikleri geçici blokla
    // (bandit alpha/beta bunu zaten öğrenir ama ilk birkaç seferde hızlı tepki için)
    if (user.recentRatings.length >= 3) {
      const lastThree = user.recentRatings.slice(-3)
      const avg = lastThree.reduce((a, b) => a + b, 0) / 3
      if (avg < 2.5 && tech.cognitiveLoad >= 4) {
        return 'user_struggling_reduce_load'
      }
    }

    return null
  }
}
