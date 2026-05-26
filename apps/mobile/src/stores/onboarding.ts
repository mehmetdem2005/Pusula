import { create } from 'zustand'

interface OnboardingState {
  // null = henüz bilinmiyor, true/false = profilden okunan değer
  completed: boolean | null
  setCompleted: (v: boolean | null) => void
}

/**
 * Onboarding durumu için ortak in-session store.
 * Kök layout profilden okuyup buraya yazar; onboarding bitince anında
 * true yapılır — böylece gate kullanıcıyı onboarding'e geri fırlatmaz.
 * (Kalıcı kaynak DB'deki profiles.onboarding_completed.)
 */
export const useOnboardingStore = create<OnboardingState>((set) => ({
  completed: null,
  setCompleted: (completed) => set({ completed }),
}))
