import { Stack, useRouter } from 'expo-router'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useIsPro } from '../../src/hooks/useEntitlement'
import { type Theme, useSetTheme, useThemes, useUserTheme } from '../../src/hooks/useTheme'

export default function ThemeSettings() {
  const router = useRouter()
  const isPro = useIsPro()
  const { data: themes, isLoading } = useThemes()
  const { data: activeTheme } = useUserTheme()
  const setTheme = useSetTheme()

  const handleSelect = (theme: Theme) => {
    if (theme.is_pro_only && !isPro) {
      Alert.alert(
        '🔒 Pro Tema',
        `${theme.name} sadece Pro kullanıcılar için. Pro'ya geçmek ister misin?`,
        [
          { text: 'Şimdi değil', style: 'cancel' },
          { text: "Pro'ya Geç", onPress: () => router.push('/upgrade') },
        ],
      )
      return
    }

    setTheme.mutate(theme, {
      onError: (e: any) => Alert.alert('Hata', e.message),
    })
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <Stack.Screen
        options={{
          title: 'Tema',
          headerStyle: { backgroundColor: '#FAFAFA' },
          headerTitleStyle: { color: '#1E1B4B', fontWeight: '600' },
        }}
      />
      <ScrollView className="flex-1 px-5 pt-4">
        <Text className="text-slate-500 mb-4">
          Görsel stilini seç. Pro temalar daha geniş seçenek sunar.
        </Text>

        {isLoading ? (
          <ActivityIndicator color="#1E1B4B" />
        ) : (
          <View className="gap-3 mb-8">
            {themes?.map((theme) => {
              const isActive = activeTheme?.id === theme.id
              const isLocked = theme.is_pro_only && !isPro

              return (
                <Pressable
                  key={theme.id}
                  onPress={() => handleSelect(theme)}
                  className={[
                    'rounded-2xl p-4 border-2 flex-row items-center gap-4',
                    isActive ? 'border-brand-950' : 'border-slate-100',
                  ].join(' ')}
                  style={{ backgroundColor: theme.background_color }}
                >
                  {/* Renk swatch */}
                  <View
                    className="w-14 h-14 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: theme.primary_color }}
                  >
                    <Text style={{ fontSize: 28 }}>{theme.preview_emoji ?? '🎨'}</Text>
                  </View>

                  {/* İsim + renk preview */}
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="font-bold text-base" style={{ color: theme.text_color }}>
                        {theme.name}
                      </Text>
                      {theme.is_pro_only && (
                        <View className="bg-accent-500 px-1.5 py-0.5 rounded">
                          <Text className="text-white text-[10px] font-bold">PRO</Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-sm mt-0.5 opacity-70" style={{ color: theme.text_color }}>
                      {theme.description}
                    </Text>

                    {/* Renk dots */}
                    <View className="flex-row gap-1 mt-2">
                      <View
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: theme.primary_color }}
                      />
                      <View
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: theme.accent_color }}
                      />
                      <View
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: theme.text_color }}
                      />
                    </View>
                  </View>

                  {isLocked && <Text style={{ fontSize: 20 }}>🔒</Text>}
                  {isActive && <Text className="text-brand-950 text-2xl font-bold">✓</Text>}
                </Pressable>
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
