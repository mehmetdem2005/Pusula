import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import '../global.css'
import '../src/lib/i18n'
import { AppLockScreen } from '../src/components/lock/AppLockScreen'
import { useAppLock } from '../src/hooks/useAppLock'
import { registerPushNotifications } from '../src/lib/notifications'
import { useShareIntentHandler } from '../src/lib/share-intent'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/stores/auth'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 2 } },
})

function RouteGate({ children }: { children: React.ReactNode }) {
  const session = useAuth((s) => s.session)
  const authLoading = useAuth((s) => s.loading)
  const initialize = useAuth((s) => s.initialize)
  const segments = useSegments()
  const router = useRouter()
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null)

  useShareIntentHandler()
  const { isLocked } = useAppLock()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (!session?.user) {
      setOnboardingChecked(false)
      setOnboardingCompleted(null)
      return
    }
    supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setOnboardingCompleted(data?.onboarding_completed ?? false)
        setOnboardingChecked(true)
      })

    // Push notification registration (arka planda, hata önemli değil)
    registerPushNotifications().then((r) => {
      if (r.error) console.log('Push register:', r.error)
    })
  }, [session?.user])

  useEffect(() => {
    if (authLoading) return
    const first = segments[0]
    const inAuth = first === '(auth)'
    const inOnboarding = first === 'onboarding'

    if (!session) {
      if (!inAuth) router.replace('/(auth)/signin')
      return
    }

    if (!onboardingChecked) return

    if (!onboardingCompleted && !inOnboarding) {
      router.replace('/onboarding')
    } else if (onboardingCompleted && (inAuth || inOnboarding)) {
      router.replace('/(tabs)')
    }
  }, [session, authLoading, onboardingChecked, onboardingCompleted, segments, router])

  if (authLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-50">
        <ActivityIndicator color="#1E1B4B" size="large" />
      </View>
    )
  }

  return (
    <>
      {children}
      <AppLockScreen visible={isLocked} />
    </>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RouteGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="lesson" />
              <Stack.Screen name="voice-lesson" />
              <Stack.Screen name="documents" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="scan" />
              <Stack.Screen name="inbox" />
              <Stack.Screen name="subject" />
              <Stack.Screen name="quiz" />
              <Stack.Screen name="review" />
              <Stack.Screen name="errors" />
              <Stack.Screen name="pomodoro" />
              <Stack.Screen name="achievements" />
              <Stack.Screen name="goals" />
              <Stack.Screen name="weekly-report" />
              <Stack.Screen name="upgrade" />
              <Stack.Screen name="(admin)" />
              <Stack.Screen name="reader/[id]" />
              <Stack.Screen name="library/add" />
              <Stack.Screen name="vocabulary" />
              <Stack.Screen name="exercises" />
              <Stack.Screen name="exercises/review" />
              <Stack.Screen name="notebooks" />
              <Stack.Screen name="notebook/new" />
              <Stack.Screen name="notebook/[id]" />
              <Stack.Screen name="notebook/[id]/studio/[sid]" />
              <Stack.Screen name="notebook/[id]/source/[sid]" />
              <Stack.Screen name="settings/account" />
              <Stack.Screen name="feedback" />
              <Stack.Screen name="gallery" />
              <Stack.Screen name="leaderboard" />
              <Stack.Screen name="achievements" />
              <Stack.Screen name="clans" />
              <Stack.Screen name="clan/[slug]" />
              <Stack.Screen name="n/[slug]" />
              <Stack.Screen name="u/[username]" />
            </Stack>
            <StatusBar style="auto" />
          </RouteGate>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
