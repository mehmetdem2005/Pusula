import { Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '../../src/components/ui/Icon'
import { LANGUAGES, useLanguageStore } from '../../src/hooks/useLanguage'

export default function LanguageSettings() {
  const { t } = useTranslation()
  const language = useLanguageStore((s) => s.language)
  const setLanguage = useLanguageStore((s) => s.setLanguage)

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={['bottom']}>
      <Stack.Screen
        options={{ title: t('profile.language'), headerStyle: { backgroundColor: '#FBF8F0' } }}
      />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 20 }}>
        <Text className="text-sm text-slate-500 mb-4">
          Uygulama dilini seç. Değişiklik anında uygulanır.
        </Text>

        <View className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          {LANGUAGES.map((lang, i) => {
            const active = language === lang.code
            return (
              <Pressable
                key={lang.code}
                onPress={() => setLanguage(lang.code)}
                className={`flex-row items-center gap-3 px-4 py-4 ${
                  i < LANGUAGES.length - 1 ? 'border-b border-slate-100' : ''
                } active:bg-slate-50`}
              >
                <Text style={{ fontSize: 24 }}>{lang.flag}</Text>
                <View className="flex-1">
                  <Text className="text-base text-ink-900">{lang.native}</Text>
                  <Text className="text-xs text-slate-400">{lang.label}</Text>
                </View>
                {active && <Icon name="check-circle" size={20} color="#10B981" />}
              </Pressable>
            )
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
