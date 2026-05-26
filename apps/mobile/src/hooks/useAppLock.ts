import AsyncStorage from '@react-native-async-storage/async-storage'
import * as LocalAuthentication from 'expo-local-authentication'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

interface AppLockSettings {
  enabled: boolean
  method: 'biometric' | 'pin'
  timeoutSeconds: number // 0 = anında, >0 = N saniye background sonrası
}

interface AppLockStore {
  settings: AppLockSettings
  isLocked: boolean
  lastBackgroundedAt: number | null
  setSettings: (s: Partial<AppLockSettings>) => void
  lock: () => void
  unlock: () => void
  setBackgroundedAt: (ts: number) => void
}

/**
 * App Lock state machine
 *
 * Lifecycle:
 *   1. App açılır → isLocked=true (eğer settings.enabled)
 *   2. Kullanıcı biometric → unlock
 *   3. App background → backgroundedAt timestamp kaydedilir
 *   4. App foreground → eğer (now - backgroundedAt) >= timeoutSeconds → lock tekrar
 */
export const useAppLockStore = create<AppLockStore>()(
  persist(
    (set, get) => ({
      settings: {
        enabled: false,
        method: 'biometric',
        timeoutSeconds: 0,
      },
      isLocked: false,
      lastBackgroundedAt: null,
      setSettings: (s) => set((state) => ({ settings: { ...state.settings, ...s } })),
      lock: () => {
        if (get().settings.enabled) set({ isLocked: true })
      },
      unlock: () => set({ isLocked: false, lastBackgroundedAt: null }),
      setBackgroundedAt: (ts) => set({ lastBackgroundedAt: ts }),
    }),
    {
      name: 'kavra-app-lock',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ settings: s.settings }), // sadece settings persist
    },
  ),
)

/**
 * App lock hook'u root layout'a bağlanır.
 * AppState değişimlerini takip eder, lock/unlock kararı verir.
 */
export function useAppLock() {
  const settings = useAppLockStore((s) => s.settings)
  const isLocked = useAppLockStore((s) => s.isLocked)
  const lastBackgroundedAt = useAppLockStore((s) => s.lastBackgroundedAt)
  const lock = useAppLockStore((s) => s.lock)
  const setBackgroundedAt = useAppLockStore((s) => s.setBackgroundedAt)
  const appStateRef = useRef<AppStateStatus>(AppState.currentState)

  // İlk açılışta — eğer enabled ise lock
  useEffect(() => {
    if (settings.enabled) lock()
  }, []) // sadece mount

  useEffect(() => {
    if (!settings.enabled) return

    const sub = AppState.addEventListener('change', (next) => {
      const prev = appStateRef.current

      if (prev === 'active' && next.match(/inactive|background/)) {
        // Background'a gidiyor
        setBackgroundedAt(Date.now())
      } else if (prev.match(/inactive|background/) && next === 'active') {
        // Geri geliyor
        const elapsed = lastBackgroundedAt
          ? (Date.now() - lastBackgroundedAt) / 1000
          : Number.POSITIVE_INFINITY

        if (elapsed >= settings.timeoutSeconds) {
          lock()
        }
      }

      appStateRef.current = next
    })

    return () => sub.remove()
  }, [settings.enabled, settings.timeoutSeconds, lastBackgroundedAt, lock, setBackgroundedAt])

  return { isLocked, settings }
}

/**
 * Biometric authentication denemesi.
 * Kullanıcı başarılı olursa unlock, başarısızsa false döner.
 */
export async function tryBiometricUnlock(): Promise<{ success: boolean; error?: string }> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync()
    if (!hasHardware) {
      return { success: false, error: 'Cihaz biyometrik desteklemiyor' }
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync()
    if (!enrolled) {
      return { success: false, error: 'Cihaz ayarlarından bir biyometrik kayıt et' }
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Kavra'yı aç",
      cancelLabel: 'İptal',
      fallbackLabel: 'Şifre kullan',
      disableDeviceFallback: false,
    })

    if (result.success) {
      useAppLockStore.getState().unlock()
      return { success: true }
    }

    return { success: false, error: 'Doğrulama başarısız' }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/** Biyometrik destek kontrolü (settings ekranı için) */
export function useBiometricCapabilities() {
  const [capabilities, setCapabilities] = useState<{
    available: boolean
    enrolled: boolean
    types: LocalAuthentication.AuthenticationType[]
  }>({ available: false, enrolled: false, types: [] })

  useEffect(() => {
    const check = async () => {
      const [available, enrolled, types] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
      ])
      setCapabilities({ available, enrolled, types })
    }
    check()
  }, [])

  return capabilities
}
