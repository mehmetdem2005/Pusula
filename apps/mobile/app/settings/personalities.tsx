import { Stack } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '../../src/components/ui/Icon'
import { usePersonalities } from '../../src/hooks/useSubjects'

export default function PersonalitiesSettings() {
  const { t } = useTranslation()
  const { data: personalities, isLoading } = usePersonalities()

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={['bottom']}>
      <Stack.Screen
        options={{ title: t('profile.personalities'), headerStyle: { backgroundColor: '#FBF8F0' } }}
      />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1E1B4B" />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, gap: 12 }}>
          <Text className="text-sm text-slate-500 mb-1">
            Sohbette kullanabileceğin AI kişilikleri. Bir derste sohbet ederken kişilik seç
            butonundan değiştirebilirsin.
          </Text>

          {(personalities ?? []).map((p) => (
            <View key={p.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex-row gap-3">
              <View className="w-11 h-11 rounded-xl bg-amber-50 items-center justify-center">
                <Text style={{ fontSize: 22 }}>{p.emoji ?? '🤖'}</Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="text-base font-semibold text-ink-900">{p.name}</Text>
                  {p.is_preset && (
                    <View className="bg-cream-100 rounded-full px-2 py-0.5">
                      <Text className="text-[9px] font-mono text-slate-500 uppercase">Hazır</Text>
                    </View>
                  )}
                </View>
                <Text className="text-xs text-slate-500 mt-1 leading-5" numberOfLines={3}>
                  {p.system_prompt_fragment}
                </Text>
              </View>
            </View>
          ))}

          {(personalities ?? []).length === 0 && (
            <View className="items-center py-10">
              <Icon name="message-circle" size={32} color="#94A3B8" />
              <Text className="text-sm text-slate-500 mt-2">Henüz kişilik tanımlı değil.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  )
}
