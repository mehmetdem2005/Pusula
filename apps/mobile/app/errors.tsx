import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { type ErrorRow, useErrors, useFiveWhys, useResolveError } from '../src/hooks/useErrors'

export default function Errors() {
  const router = useRouter()
  const { data: errors, isLoading } = useErrors()

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <Stack.Screen
        options={{
          title: 'Hata Portföyü',
          headerShown: true,
          headerStyle: { backgroundColor: '#FAFAFA' },
          headerTitleStyle: { color: '#1E1B4B', fontWeight: '600' },
        }}
      />
      <ScrollView className="flex-1 px-5 pt-4">
        <View className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-4">
          <Text className="text-brand-900 font-semibold mb-1">🔍 Hatalardan Öğren</Text>
          <Text className="text-brand-800 text-sm leading-5">
            Yanlış cevapların burada toplanır. "5 Neden" ile kök sebebi bul, kalıcı düzelt.
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#1E1B4B" style={{ marginVertical: 40 }} />
        ) : !errors || errors.length === 0 ? (
          <View className="py-12 items-center">
            <Text style={{ fontSize: 48 }}>✨</Text>
            <Text className="text-slate-500 text-center mt-3">
              Çözülmemiş hata yok.{'\n'}Harika gidiyorsun!
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {errors.map((e) => (
              <ErrorCard key={e.id} error={e} />
            ))}
          </View>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  )
}

function ErrorCard({ error }: { error: ErrorRow }) {
  const [expanded, setExpanded] = useState(false)
  const fiveWhys = useFiveWhys()
  const resolve = useResolveError()
  const router = useRouter()

  const sourceEmoji = {
    quiz: '📝',
    flashcard: '🃏',
    lesson_self_report: '💬',
    manual: '✏️',
  }[error.source_type]

  const handleAnalyze = () => {
    fiveWhys.mutate(error.id, {
      onError: (e: any) => Alert.alert('Hata', e.message),
    })
    setExpanded(true)
  }

  const handleResolve = () => {
    Alert.alert('Çözüldü mü?', 'Bu hatayı kalıcı olarak çözdüğüne emin misin?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Evet',
        onPress: () => resolve.mutate({ errorId: error.id }),
      },
    ])
  }

  return (
    <View className="bg-white rounded-2xl p-4 border border-slate-100">
      <Pressable onPress={() => setExpanded(!expanded)} className="flex-row items-start gap-3">
        <Text style={{ fontSize: 24 }}>{sourceEmoji}</Text>
        <View className="flex-1">
          <Text className="text-brand-950 font-medium" numberOfLines={expanded ? undefined : 2}>
            {error.mistake_summary}
          </Text>
          <Text className="text-xs text-slate-500 mt-1">
            {new Date(error.created_at).toLocaleDateString('tr-TR')}
          </Text>
        </View>
        <Text className="text-slate-400 text-xl">{expanded ? '▾' : '▸'}</Text>
      </Pressable>

      {expanded && (
        <View className="mt-3 pt-3 border-t border-slate-100">
          {error.user_answer && (
            <View className="mb-2">
              <Text className="text-xs text-slate-500">Cevabın:</Text>
              <Text className="text-red-600 text-sm">{error.user_answer}</Text>
            </View>
          )}
          {error.correct_answer && (
            <View className="mb-3">
              <Text className="text-xs text-slate-500">Doğrusu:</Text>
              <Text className="text-green-700 text-sm">{error.correct_answer}</Text>
            </View>
          )}

          {/* 5 Whys analizi */}
          {error.root_causes?.root_causes ? (
            <View className="bg-slate-50 rounded-xl p-3 mb-3">
              <Text className="text-xs font-semibold text-slate-700 uppercase mb-2">
                🔬 5 Neden Analizi
              </Text>
              <View className="gap-1.5">
                {error.root_causes.root_causes.map((cause, i) => (
                  <View key={i} className="flex-row gap-2">
                    <Text className="text-brand-950 font-bold text-xs">{i + 1}.</Text>
                    <Text className="flex-1 text-slate-700 text-xs leading-5">{cause}</Text>
                  </View>
                ))}
              </View>
              {error.root_causes.suggested_action && (
                <View className="mt-3 pt-3 border-t border-slate-200">
                  <Text className="text-xs font-semibold text-brand-950 mb-1">💡 Öneri</Text>
                  <Text className="text-xs text-slate-700 leading-5">
                    {error.root_causes.suggested_action}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <Pressable
              onPress={handleAnalyze}
              disabled={fiveWhys.isPending}
              className="bg-brand-50 rounded-xl py-2 items-center mb-3"
            >
              <Text className="text-brand-900 text-sm font-semibold">
                {fiveWhys.isPending ? '🤔 Analiz ediliyor...' : '🔬 5 Neden ile Analiz Et'}
              </Text>
            </Pressable>
          )}

          <View className="flex-row gap-2">
            <Pressable
              onPress={handleResolve}
              disabled={resolve.isPending}
              className="flex-1 bg-green-600 py-2 rounded-lg items-center"
            >
              <Text className="text-white text-sm font-semibold">✓ Çözüldü</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}
