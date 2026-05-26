import { Stack, useRouter } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '../src/components/ui/Icon'
import { useNotebooks } from '../src/hooks/useNotebooks'

export default function NotebooksScreen() {
  const router = useRouter()
  const { data: notebooks, isLoading } = useNotebooks(false)

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <Stack.Screen
        options={{
          title: 'Defterler',
          headerStyle: { backgroundColor: '#FBF8F0' },
          headerTitleStyle: { fontFamily: 'InstrumentSerif', fontSize: 22 },
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Header */}
        <View className="mb-5">
          <Text className="font-serif text-3xl text-ink-900 leading-tight">
            <Text className="italic">Notlar</Text>, kaynaklar,
          </Text>
          <Text className="font-serif text-3xl text-ink-900 leading-tight">tek bir yerde.</Text>
          <Text className="text-sm text-slate-600 mt-2 max-w-[300px]">
            PDF, URL, ses, YouTube. Hepsini at, AI sana özetlesin, podcast yapsın, sınav hazırlasın.
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#1E1B4B" style={{ marginTop: 40 }} />
        ) : !notebooks || notebooks.length === 0 ? (
          <EmptyState onCreate={() => router.push('/notebook/new')} />
        ) : (
          <View className="gap-3">
            {notebooks.map((n) => (
              <Pressable
                key={n.id}
                onPress={() => router.push(`/notebook/${n.id}`)}
                className="bg-white border border-slate-100 rounded-3xl p-4"
              >
                <View className="flex-row items-start gap-3">
                  <View
                    className="w-12 h-12 rounded-2xl items-center justify-center"
                    style={{ backgroundColor: `${n.color}22` }}
                  >
                    <Text style={{ fontSize: 24 }}>{n.emoji}</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Text className="font-serif text-lg text-ink-900 flex-1" numberOfLines={1}>
                        {n.title}
                      </Text>
                      {n.is_pinned && <Icon name="pin" size={12} color="#F59E0B" />}
                    </View>
                    {n.description && (
                      <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={2}>
                        {n.description}
                      </Text>
                    )}
                    <View className="flex-row items-center gap-3 mt-2">
                      <View className="flex-row items-center gap-1">
                        <Icon name="file" size={11} color="#94A3B8" />
                        <Text className="text-[10px] text-slate-500 font-mono">
                          {n.source_count}
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1">
                        <Icon name="message-square" size={11} color="#94A3B8" />
                        <Text className="text-[10px] text-slate-500 font-mono">
                          {n.message_count}
                        </Text>
                      </View>
                      {n.generated_content_count > 0 && (
                        <View className="flex-row items-center gap-1">
                          <Icon name="sparkles" size={11} color="#F59E0B" />
                          <Text className="text-[10px] text-amber-700 font-mono font-bold">
                            {n.generated_content_count}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Icon name="chevron-right" size={16} color="#CBD5E1" />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* FAB */}
        <Pressable
          onPress={() => router.push('/notebook/new')}
          className="absolute bottom-8 right-5 w-14 h-14 bg-ink-900 rounded-full items-center justify-center"
          style={{
            shadowColor: '#1E1B4B',
            shadowOpacity: 0.3,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
          }}
        >
          <Icon name="plus" size={24} color="#F59E0B" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View className="items-center mt-12">
      <View className="w-24 h-24 bg-cream-50 border-2 border-dashed border-slate-200 rounded-3xl items-center justify-center mb-4">
        <Text style={{ fontSize: 36 }}>📓</Text>
      </View>
      <Text className="font-serif text-xl text-ink-900">Henüz defter yok</Text>
      <Text className="text-sm text-slate-500 text-center mt-2 max-w-[280px]">
        Bir defter oluştur, kaynaklarını ekle, AI ile öğrenmeye başla.
      </Text>
      <Pressable
        onPress={onCreate}
        className="mt-5 bg-ink-900 rounded-full px-6 py-3 flex-row items-center gap-2"
      >
        <Icon name="plus" size={16} color="#F59E0B" />
        <Text className="text-cream-50 font-semibold text-sm">İlk Defter</Text>
      </Pressable>
    </View>
  )
}
