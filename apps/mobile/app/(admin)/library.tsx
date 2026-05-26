import { useRouter } from 'expo-router'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { Icon } from '../../src/components/ui/Icon'
import { useDeleteLibraryDocument, useLibraryDocuments } from '../../src/hooks/useAdmin'

const CATEGORY_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  textbook: { label: 'Ders Kitabı', color: '#1E1B4B', icon: 'book-text' },
  novel: { label: 'Roman', color: '#B4452D', icon: 'book-open' },
  reference: { label: 'Başvuru', color: '#7C3AED', icon: 'library' },
  exam_prep: { label: 'Sınav Hazırlık', color: '#CA8A04', icon: 'graduation-cap' },
  other: { label: 'Diğer', color: '#64748B', icon: 'file-text' },
}

export default function AdminLibrary() {
  const router = useRouter()
  const { data, isLoading } = useLibraryDocuments(true)
  const del = useDeleteLibraryDocument()

  return (
    <View className="flex-1 bg-cream-50">
      <View className="px-5 py-3 bg-white border-b border-slate-100 flex-row items-center justify-between">
        <Text className="text-sm text-slate-600">{data?.length ?? 0} doküman</Text>
        <Pressable
          onPress={() => router.push('/(admin)/library/upload')}
          className="bg-ink-900 rounded-full px-4 py-2 flex-row items-center gap-1.5"
        >
          <Icon name="plus" size={14} color="#F59E0B" />
          <Text className="text-cream-50 text-xs font-bold">Yükle</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#1E1B4B" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
          {(data ?? []).length === 0 && (
            <View className="items-center py-16">
              <Icon name="library" size={48} color="#CBD5E1" />
              <Text className="font-serif text-xl text-ink-900 mt-3">Kütüphane boş</Text>
              <Text className="text-sm text-slate-500 mt-1 text-center">
                İlk kitabını yükleyerek{'\n'}kullanıcılar için kaynak oluştur
              </Text>
            </View>
          )}

          {(data ?? []).map((d) => {
            const cat = CATEGORY_LABELS[d.category] ?? CATEGORY_LABELS.other
            const sizeMB = (d.file_size_bytes / 1024 / 1024).toFixed(1)

            return (
              <View key={d.id} className="bg-white border border-slate-100 rounded-2xl p-4 mb-2">
                <View className="flex-row items-start gap-3">
                  <View
                    className="w-12 h-16 rounded-lg items-center justify-center"
                    style={{ backgroundColor: cat.color }}
                  >
                    <Icon name={cat.icon} size={20} color="white" />
                    <Text className="text-[8px] text-white mt-0.5 font-bold">PDF</Text>
                  </View>
                  <View className="flex-1 min-w-0">
                    <Text className="font-semibold text-ink-900 text-sm" numberOfLines={2}>
                      {d.title}
                    </Text>
                    {d.author && (
                      <Text className="text-[11px] text-slate-500 mt-0.5">— {d.author}</Text>
                    )}

                    <View className="flex-row items-center gap-2 mt-2 flex-wrap">
                      <View
                        className="px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${cat.color}20` }}
                      >
                        <Text className="text-[9px] font-bold" style={{ color: cat.color }}>
                          {cat.label.toUpperCase()}
                        </Text>
                      </View>
                      <Text className="text-[10px] text-slate-500">{sizeMB} MB</Text>
                      {d.page_count && (
                        <Text className="text-[10px] text-slate-500">· {d.page_count} sayfa</Text>
                      )}
                      {d.is_pro_only && (
                        <View className="bg-amber-500 px-1.5 py-0.5 rounded">
                          <Text className="text-[8px] text-ink-900 font-bold">PRO</Text>
                        </View>
                      )}
                    </View>

                    {d.subject_tags?.length > 0 && (
                      <View className="flex-row flex-wrap gap-1 mt-2">
                        {d.subject_tags.map((t, i) => (
                          <Text
                            key={i}
                            className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full"
                          >
                            #{t}
                          </Text>
                        ))}
                      </View>
                    )}

                    <Text className="text-[10px] text-slate-400 mt-2">
                      📥 {d.download_count} indirilme
                    </Text>
                  </View>

                  <Pressable
                    onPress={() =>
                      Alert.alert('Sil', `"${d.title}" silinecek. Emin misin?`, [
                        { text: 'İptal', style: 'cancel' },
                        { text: 'Sil', style: 'destructive', onPress: () => del.mutate(d.id) },
                      ])
                    }
                    hitSlop={10}
                  >
                    <Icon name="trash" size={16} color="#EF4444" />
                  </Pressable>
                </View>
              </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}
