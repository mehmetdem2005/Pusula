import { useRouter } from 'expo-router'
import { useTranslation } from 'react-i18next'
import { Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useApiKeys } from '../../src/hooks/useApiKeys'
import { useCreateLesson, useRecentLessons } from '../../src/hooks/useLessons'
import { useAuth } from '../../src/stores/auth'

function greeting(t: (k: string) => string) {
  const hour = new Date().getHours()
  if (hour < 12) return t('dashboard.greeting.morning')
  if (hour < 18) return t('dashboard.greeting.afternoon')
  return t('dashboard.greeting.evening')
}

export default function Dashboard() {
  const { t } = useTranslation()
  const router = useRouter()
  const user = useAuth((s) => s.user)
  const { data: keys } = useApiKeys()
  const { data: lessons } = useRecentLessons(3)
  const createLesson = useCreateLesson()

  const firstName = (user?.user_metadata?.full_name as string | undefined)?.split(' ')[0] ?? ''
  const hasActiveKey = keys && keys.some((k) => k.is_default && k.is_active)

  const handleNewChat = async () => {
    if (!hasActiveKey) {
      Alert.alert(
        'Önce API anahtarı ekle',
        'Kavra ile konuşmaya başlamak için bir Groq anahtarına ihtiyacın var.',
        [
          { text: 'Vazgeç', style: 'cancel' },
          { text: 'Ekle', onPress: () => router.push('/settings/api-keys') },
        ],
      )
      return
    }
    createLesson.mutate(
      {},
      {
        onSuccess: (lesson) => router.push(`/lesson/${lesson.id}`),
        onError: (e: any) => Alert.alert('Hata', e.message),
      },
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <ScrollView className="flex-1 px-5 pt-4">
        <Text className="text-base text-slate-500">{greeting(t)},</Text>
        <Text className="text-3xl font-serif text-brand-950 mt-1">
          {firstName || 'Hoş geldin'} 👋
        </Text>

        {!hasActiveKey && (
          <Pressable
            onPress={() => router.push('/settings/api-keys')}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mt-6 flex-row items-center gap-3"
          >
            <Text style={{ fontSize: 24 }}>🔑</Text>
            <View className="flex-1">
              <Text className="font-semibold text-amber-900">Groq anahtarı gerekli</Text>
              <Text className="text-amber-800 text-sm mt-0.5">
                Konuşmaya başlamak için anahtarını ekle
              </Text>
            </View>
            <Text className="text-amber-700 text-xl">›</Text>
          </Pressable>
        )}

        <View className="bg-brand-950 rounded-2xl p-5 mt-6">
          <Text className="text-white/70 text-sm">Seri</Text>
          <View className="flex-row items-end gap-2 mt-1">
            <Text className="text-white text-4xl font-bold">0</Text>
            <Text className="text-white/80 mb-1">gün</Text>
          </View>
          <Text className="text-accent-300 text-xs mt-2">🔥 Bugün çalışarak seri başlat</Text>
        </View>

        {lessons && lessons.length > 0 && (
          <View className="mt-6">
            <Text className="text-lg font-serif text-brand-950 mb-3">
              {t('dashboard.continueLesson')}
            </Text>
            <View className="gap-2">
              {lessons.map((l) => (
                <Pressable
                  key={l.id}
                  onPress={() => router.push(`/lesson/${l.id}`)}
                  className="bg-white rounded-xl p-3 border border-slate-100 flex-row items-center gap-3 active:opacity-70"
                >
                  <View className="w-10 h-10 bg-brand-50 rounded-lg items-center justify-center">
                    <Text style={{ fontSize: 18 }}>💬</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-medium text-brand-950">Sohbet</Text>
                    <Text className="text-xs text-slate-500">
                      {new Date(l.started_at).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                  <Text className="text-slate-400 text-xl">›</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <Text className="text-lg font-serif text-brand-950 mt-6 mb-3">
          {t('dashboard.quickStart')}
        </Text>

        <View className="gap-3 pb-8">
          <QuickAction
            emoji="💬"
            title="Yeni sohbet"
            subtitle="AI ile konuş"
            onPress={handleNewChat}
            loading={createLesson.isPending}
          />
          <QuickAction
            emoji="📄"
            title="PDF yükle"
            subtitle="Faz 3'te aktif"
            onPress={() => Alert.alert('', "Bu özellik Faz 3'te eklenecek")}
            disabled
          />
          <QuickAction
            emoji="🎤"
            title="Sesli ders"
            subtitle="Faz 2'de aktif"
            onPress={() => Alert.alert('', "Bu özellik Faz 2'de eklenecek")}
            disabled
          />
          <QuickAction
            emoji="📸"
            title="Fotoğrafla"
            subtitle="Faz 3'te aktif"
            onPress={() => Alert.alert('', "Bu özellik Faz 3'te eklenecek")}
            disabled
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function QuickAction({
  emoji,
  title,
  subtitle,
  onPress,
  loading,
  disabled,
}: {
  emoji: string
  title: string
  subtitle: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      className={[
        'bg-white rounded-2xl p-4 border border-slate-100 flex-row items-center gap-4',
        disabled ? 'opacity-50' : 'active:opacity-70',
      ].join(' ')}
    >
      <View className="w-12 h-12 bg-brand-50 rounded-xl items-center justify-center">
        <Text style={{ fontSize: 24 }}>{emoji}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-brand-950 text-base">{title}</Text>
        <Text className="text-slate-500 text-sm">{subtitle}</Text>
      </View>
      <Text className="text-slate-400 text-xl">{loading ? '...' : '›'}</Text>
    </Pressable>
  )
}
