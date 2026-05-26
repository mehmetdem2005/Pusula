import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import '../global.css'
import '../src/lib/i18n'
import { supabase } from '../src/lib/supabase'
import { useAuth } from '../src/stores/auth'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 2 },
  },
})

function RouteGate({ children }: { children: React.ReactNode }) {
  const session = useAuth((s) => s.session)
  const authLoading = useAuth((s) => s.loading)
  const initialize = useAuth((s) => s.initialize)
  const segments = useSegments()
  const router = useRouter()
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null)

  useEffect(() => {
    initialize()
  }, [initialize])

  // Onboarding durumunu çek
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
  }, [session?.user])

  // Yönlendirme
  useEffect(() => {
    if (authLoading) return
    const first = segments[0]
    const inAuth = first === '(auth)'
    const inOnboarding = first === 'onboarding'

    if (!session) {
      if (!inAuth) router.replace('/(auth)/signin')
      return
    }

    // Oturum var, onboarding durumu bilinmiyorsa bekle
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

  return <>{children}</>
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
              <Stack.Screen name="settings" />
            </Stack>
            <StatusBar style="auto" />
          </RouteGate>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
