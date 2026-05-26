import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, useRouter } from 'expo-router'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../src/lib/supabase'

interface InboxItem {
  id: string
  content_type: string
  raw_content: string | null
  url: string | null
  processed: boolean
  created_at: string
}

export default function Inbox() {
  const router = useRouter()
  const qc = useQueryClient()

  const { data: items, isLoading } = useQuery({
    queryKey: ['inbox'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inbox_items')
        .select('*')
        .eq('processed', false)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as InboxItem[]
    },
  })

  const archive = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('inbox_items').update({ processed: true }).eq('id', id)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inbox'] }),
  })

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <Stack.Screen
        options={{
          title: '📥 Inbox',
          headerShown: true,
          headerStyle: { backgroundColor: '#FAFAFA' },
          headerTitleStyle: { color: '#1E1B4B', fontWeight: '600' },
        }}
      />
      <ScrollView className="flex-1 px-5 pt-4">
        <View className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-4">
          <Text className="text-brand-900 font-semibold mb-1">📥 Paylaşılan İçerikler</Text>
          <Text className="text-brand-800 text-sm leading-5">
            WhatsApp, tarayıcı ya da başka uygulamalardan Kavra'ya paylaşılan metin, link veya
            dosyalar burada.
          </Text>
        </View>

        {isLoading ? (
          <View className="py-12 items-center">
            <ActivityIndicator color="#1E1B4B" />
          </View>
        ) : !items || items.length === 0 ? (
          <View className="py-12 items-center">
            <Text style={{ fontSize: 48 }}>📭</Text>
            <Text className="text-slate-500 text-center mt-3">
              Inbox boş.{'\n'}WhatsApp'tan bir mesaj paylaşıp Kavra'yı seç.
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {items.map((item) => (
              <View key={item.id} className="bg-white rounded-2xl p-4 border border-slate-100">
                <View className="flex-row items-start justify-between mb-2">
                  <Text className="text-xs text-slate-400 uppercase font-semibold">
                    {item.content_type === 'url' ? '🔗 URL' : '📝 Metin'}
                  </Text>
                  <Text className="text-xs text-slate-400">
                    {new Date(item.created_at).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
                <Text className="text-brand-950 leading-6" numberOfLines={4}>
                  {item.url ?? item.raw_content}
                </Text>
                <View className="flex-row gap-2 mt-3">
                  <Pressable
                    onPress={() => Alert.alert('', "RAG entegrasyonu Faz 4'te")}
                    className="flex-1 bg-brand-950 py-2 rounded-lg items-center"
                  >
                    <Text className="text-white text-sm font-semibold">Konuya Ekle</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => archive.mutate(item.id)}
                    className="px-4 bg-slate-100 py-2 rounded-lg items-center"
                  >
                    <Text className="text-slate-600 text-sm">Arşivle</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  )
}
