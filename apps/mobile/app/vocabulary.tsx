import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '../src/components/ui/Icon'
import { useUpdateVocabStatus, useVocabulary } from '../src/hooks/useDictionary'

export default function VocabularyScreen() {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'learning' | 'reviewing' | 'mastered'>('learning')
  const [lang, setLang] = useState<string | undefined>()

  const { data: vocab, isLoading } = useVocabulary({
    status: filter === 'all' ? undefined : filter,
    lang,
  })

  const updateStatus = useUpdateVocabStatus()

  const counts = {
    learning: 0,
    reviewing: 0,
    mastered: 0,
  }
  for (const v of vocab ?? []) {
    if (v.status === 'learning') counts.learning++
    else if (v.status === 'reviewing') counts.reviewing++
    else if (v.status === 'mastered') counts.mastered++
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <Stack.Screen
        options={{
          title: 'Kelime Dağarcığım',
          headerStyle: { backgroundColor: '#FBF8F0' },
          headerTitleStyle: { fontFamily: 'InstrumentSerif', fontSize: 18 },
        }}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Stats */}
        <View className="px-5 pt-4 flex-row gap-2">
          <StatCard label="Öğreniyorum" value={counts.learning} color="#F59E0B" />
          <StatCard label="Tekrar" value={counts.reviewing} color="#7C3AED" />
          <StatCard label="Ustalaştım" value={counts.mastered} color="#10B981" />
        </View>

        {/* Filter */}
        <View className="px-5 mt-4 flex-row gap-2">
          {[
            { v: 'all' as const, l: 'Tümü' },
            { v: 'learning' as const, l: 'Yeni' },
            { v: 'reviewing' as const, l: 'Tekrar' },
            { v: 'mastered' as const, l: 'Usta' },
          ].map((f) => (
            <Pressable
              key={f.v}
              onPress={() => setFilter(f.v)}
              className={`px-3 py-1.5 rounded-full ${filter === f.v ? 'bg-ink-900' : 'bg-white border border-slate-200'}`}
            >
              <Text
                className={`text-xs font-semibold ${filter === f.v ? 'text-cream-50' : 'text-slate-700'}`}
              >
                {f.l}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* List */}
        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color="#1E1B4B" />
          </View>
        ) : !vocab || vocab.length === 0 ? (
          <View className="px-5 py-16 items-center">
            <Icon name="book-open" size={48} color="#CBD5E1" />
            <Text className="font-serif text-xl text-ink-900 mt-3">Henüz kelime yok</Text>
            <Text className="text-sm text-slate-500 text-center mt-2 max-w-[280px]">
              Bir kitap aç, kelimelere dokun. Sözlüğe otomatik eklenir.
            </Text>
          </View>
        ) : (
          <View className="px-5 mt-4 gap-2">
            {vocab.map((v) => {
              const trans = (v.translations as any[])?.[0]?.translations?.[0]
              return (
                <View key={v.id} className="bg-white border border-slate-100 rounded-2xl p-3">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <View className="flex-row items-baseline gap-2">
                        <Text className="font-serif text-lg text-ink-900">{v.word}</Text>
                        {v.ipa && (
                          <Text className="text-xs text-slate-500 font-mono">[{v.ipa}]</Text>
                        )}
                      </View>
                      {trans && (
                        <Text className="text-sm text-amber-700 font-medium mt-0.5">{trans}</Text>
                      )}
                      {v.source_sentence && (
                        <Text className="text-xs text-slate-500 italic mt-1.5" numberOfLines={2}>
                          "{v.source_sentence}"
                        </Text>
                      )}
                      <View className="flex-row items-center gap-2 mt-2">
                        <View className="flex-row items-center gap-1">
                          <Icon name="repeat" size={10} color="#94A3B8" />
                          <Text className="text-[10px] text-slate-500">
                            {v.encounters}× karşılaşma
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Pressable
                      onPress={() => {
                        const next =
                          v.status === 'learning'
                            ? 'reviewing'
                            : v.status === 'reviewing'
                              ? 'mastered'
                              : 'learning'
                        updateStatus.mutate({ id: v.id, status: next })
                      }}
                      className={`px-2.5 py-1 rounded-full ${
                        v.status === 'mastered'
                          ? 'bg-emerald-100'
                          : v.status === 'reviewing'
                            ? 'bg-purple-100'
                            : 'bg-amber-100'
                      }`}
                    >
                      <Text
                        className={`text-[10px] font-bold ${
                          v.status === 'mastered'
                            ? 'text-emerald-700'
                            : v.status === 'reviewing'
                              ? 'text-purple-700'
                              : 'text-amber-700'
                        }`}
                      >
                        {v.status === 'mastered'
                          ? '✓ USTA'
                          : v.status === 'reviewing'
                            ? 'TEKRAR'
                            : 'YENİ'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View className="flex-1 bg-white border border-slate-100 rounded-2xl p-3">
      <Text className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</Text>
      <Text className="font-serif text-2xl mt-1" style={{ color, fontStyle: 'italic' }}>
        {value}
      </Text>
    </View>
  )
}
