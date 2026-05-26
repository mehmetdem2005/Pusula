import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import i18n from '../lib/i18n'

export type AppLanguage = 'tr' | 'en'

export const LANGUAGES: { code: AppLanguage; label: string; native: string; flag: string }[] = [
  { code: 'tr', label: 'Türkçe', native: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
]

interface LanguageStore {
  language: AppLanguage
  setLanguage: (lang: AppLanguage) => void
}

/**
 * Dil tercihi — kalıcı (AsyncStorage). Değişince i18n'e uygulanır;
 * uygulama açılışında rehydrate olunca kaydedilen dil tekrar yüklenir.
 */
export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: (i18n.language as AppLanguage) ?? 'tr',
      setLanguage: (language) => {
        i18n.changeLanguage(language)
        set({ language })
      },
    }),
    {
      name: 'kavra-language',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.language && state.language !== i18n.language) {
          i18n.changeLanguage(state.language)
        }
      },
    },
  ),
)
