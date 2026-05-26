import AsyncStorage from '@react-native-async-storage/async-storage'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { supabase } from '../lib/supabase'

export interface Theme {
  id: string
  name: string
  description: string | null
  preview_emoji: string | null
  primary_color: string
  accent_color: string
  background_color: string
  text_color: string
  is_pro_only: boolean
  display_order: number
}

interface ThemeStore {
  activeTheme: Theme | null
  setActiveTheme: (theme: Theme) => void
}

/**
 * Theme store — kalıcı, async storage'a yazılır.
 * Active theme uygulamanın her yerinde okunabilir.
 * Server-side de user_preferences.theme_id'de kayıtlı kalır (cross-device sync için).
 */
export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      activeTheme: null,
      setActiveTheme: (theme) => set({ activeTheme: theme }),
    }),
    {
      name: 'kavra-theme',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)

export function useThemes() {
  return useQuery({
    queryKey: ['themes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('themes')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      if (error) throw error
      return data as Theme[]
    },
    staleTime: 60 * 60_000,
  })
}

export function useUserTheme() {
  return useQuery({
    queryKey: ['user-theme'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return null
      const { data } = await supabase
        .from('user_preferences')
        .select('theme_id, themes(*)')
        .eq('user_id', userData.user.id)
        .single()
      return (data?.themes as any) ?? null
    },
  })
}

export function useSetTheme() {
  const qc = useQueryClient()
  const setLocal = useThemeStore((s) => s.setActiveTheme)
  return useMutation({
    mutationFn: async (theme: Theme) => {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Oturum yok')

      // Local state hemen güncelle
      setLocal(theme)

      // Server tarafa yaz
      const { error } = await supabase
        .from('user_preferences')
        .upsert({ user_id: userData.user.id, theme_id: theme.id }, { onConflict: 'user_id' })
      if (error) throw error
      return theme
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user-theme'] }),
  })
}
