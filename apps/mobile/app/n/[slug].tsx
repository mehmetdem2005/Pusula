import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '../../src/components/ui/Icon'
import { apiFetch } from '../../src/lib/api'

export default function PublicNotebookView() {
  const router = useRouter()
  const qc = useQueryClient()
  const { slug } = useLocalSearchParams<{ slug: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['public-notebook', slug],
    queryFn: () => apiFetch<any>(`/api/n/${slug}`),
    enabled: !!slug,
  })

  const saveMut = useMutation({
    mutationFn: () =>
      apiFetch<{ saved: boolean; saveCount: number }>(`/api/notebooks/${data.notebook.id}/save`, {
        method: 'POST',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['public-notebook', slug] }),
  })

  const cloneMut = useMutation({
    mutationFn: () =>
      apiFetch<{ cloned: any }>(`/api/notebooks/${data.notebook.id}/clone`, {
        method: 'POST',
      }),
    onSuccess: (res) => {
      Alert.alert('Defter Klonlandı', 'Senin kütüphanene eklendi.', [
        { text: 'Tamam' },
        { text: 'Aç', onPress: () => router.replace(`/notebook/${res.cloned.id}`) },
      ])
    },
    onError: (e: any) => {
      if (e.message?.includes('pro_required')) {
        Alert.alert('Pro Özellik', 'Klonlama Pro üyelere özel.', [
          { text: 'Vazgeç' },
          { text: 'Pro Ol', onPress: () => router.push('/upgrade') },
        ])
      } else {
        Alert.alert('Hata', e.message)
      }
    },
  })

  const handleShare = async () => {
    await Share.share({
      message: `${data.notebook.title}\n\nhttps://kavra.app/n/${slug}`,
      url: `https://kavra.app/n/${slug}`,
    })
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50 items-center justify-center">
        <ActivityIndicator color="#F59E0B" />
      </SafeAreaView>
    )
  }

  if (!data?.notebook) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50 items-center justify-center px-6">
        <Text className="text-4xl mb-3">🔍</Text>
        <Text className="font-serif text-2xl text-ink-900">Bulunamadı</Text>
        <Text className="text-sm text-slate-500 text-center mt-2">
          Bu defter silinmiş olabilir veya artık herkese açık değil.
        </Text>
        <Pressable
          onPress={() => router.replace('/gallery')}
          className="mt-6 bg-ink-900 rounded-full px-5 py-3"
        >
          <Text className="text-cream-50 font-semibold">Galeriye Dön</Text>
        </Pressable>
      </SafeAreaView>
    )
  }

  const nb = data.notebook
  const author = nb.profiles

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header bar */}
        <View className="flex-row justify-between items-center px-5 py-3">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Icon name="chevron-left" size={22} color="#1E1B4B" />
          </Pressable>
          <View className="flex-row gap-2">
            <Pressable
              onPress={handleShare}
              className="bg-white border border-slate-200 rounded-full p-2.5"
            >
              <Icon name="share" size={16} color="#1E1B4B" />
            </Pressable>
          </View>
        </View>

        {/* Hero */}
        <View className="px-5 pt-2">
          {nb.category && (
            <Text className="font-mono text-[10px] text-amber-600 tracking-widest uppercase mb-2">
              {nb.category}
            </Text>
          )}
          <Text className="font-serif text-3xl text-ink-900 leading-tight">{nb.title}</Text>
          {nb.description && (
            <Text className="text-base text-slate-600 mt-3 leading-6">{nb.description}</Text>
          )}

          {/* Author + Stats */}
          <View className="flex-row items-center gap-3 mt-4 pb-4 border-b border-slate-100">
            <Pressable
              onPress={() => author?.username && router.push(`/u/${author.username}`)}
              className="flex-row items-center gap-2"
            >
              <View className="w-8 h-8 bg-ink-900 rounded-full items-center justify-center">
                <Text className="text-[10px] text-amber-500 font-bold">
                  {(author?.full_name ?? author?.username ?? '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View>
                <Text className="text-xs text-ink-900 font-semibold">
                  @{author?.username ?? 'anonim'}
                </Text>
                <Text className="text-[10px] text-slate-500">
                  {new Date(nb.shared_at).toLocaleDateString('tr-TR')}
                </Text>
              </View>
            </Pressable>

            <View className="flex-1" />

            <View className="flex-row items-center gap-3">
              <View className="items-center">
                <Text className="font-mono text-sm text-ink-900 font-bold">{nb.view_count}</Text>
                <Text className="text-[9px] text-slate-500">görüntüleme</Text>
              </View>
              <View className="items-center">
                <Text className="font-mono text-sm text-amber-600 font-bold">{nb.save_count}</Text>
                <Text className="text-[9px] text-slate-500">kayıt</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View className="flex-row gap-2 mt-4">
            <Pressable
              onPress={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              className={`flex-1 rounded-full py-3 items-center flex-row justify-center gap-2 ${
                data.isSaved ? 'bg-amber-500' : 'bg-white border border-slate-200'
              }`}
            >
              <Icon name="bookmark" size={14} color={data.isSaved ? '#1E1B4B' : '#475569'} />
              <Text
                className={`font-bold text-xs ${data.isSaved ? 'text-ink-900' : 'text-slate-700'}`}
              >
                {data.isSaved ? 'Kaydedildi' : 'Kaydet'}
              </Text>
            </Pressable>

            {nb.allow_clone && (
              <Pressable
                onPress={() => cloneMut.mutate()}
                disabled={cloneMut.isPending}
                className="flex-1 bg-ink-900 rounded-full py-3 items-center flex-row justify-center gap-2"
              >
                {cloneMut.isPending ? (
                  <ActivityIndicator color="#F59E0B" size="small" />
                ) : (
                  <>
                    <Icon name="copy" size={14} color="#F59E0B" />
                    <Text className="text-cream-50 font-bold text-xs">Klonla</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        </View>

        {/* Sources (titles only — content gizli) */}
        <View className="px-5 mt-6">
          <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-3">
            {data.sources.length} Kaynak
          </Text>
          {data.sources.map((s: any) => (
            <View
              key={s.id}
              className="bg-white border border-slate-100 rounded-2xl p-3 mb-2 flex-row items-center gap-3"
            >
              <View className="w-8 h-8 bg-cream-50 rounded-lg items-center justify-center">
                <Text className="text-base">
                  {s.source_type === 'pdf'
                    ? '📄'
                    : s.source_type === 'youtube'
                      ? '📺'
                      : s.source_type === 'audio'
                        ? '🎙️'
                        : s.source_type === 'url'
                          ? '🔗'
                          : '📝'}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm text-ink-900 font-semibold" numberOfLines={1}>
                  {s.title}
                </Text>
                <Text className="text-[10px] text-slate-500 mt-0.5">
                  {s.source_type}
                  {s.youtube_duration_seconds
                    ? ` · ${Math.round(s.youtube_duration_seconds / 60)} dk`
                    : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Public studio outputs */}
        {data.studio.length > 0 && (
          <View className="px-5 mt-6">
            <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-3">
              {data.studio.length} Hazır Üretim
            </Text>
            {data.studio.map((s: any) => (
              <View
                key={s.id}
                className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-2 flex-row items-center gap-3"
              >
                <Text className="text-base">
                  {s.content_type === 'audio_overview' ? '🎙️' : '📜'}
                </Text>
                <View className="flex-1">
                  <Text className="text-sm text-ink-900 font-semibold">{s.title}</Text>
                  <Text className="text-[10px] text-amber-700 mt-0.5">
                    {s.content_type === 'audio_overview' ? 'Sesli Özet' : 'Özet'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Privacy notice */}
        <View className="mx-5 mt-6 bg-slate-50 border border-slate-200 rounded-2xl p-3 flex-row gap-2">
          <Icon name="info" size={14} color="#64748B" />
          <Text className="flex-1 text-[11px] text-slate-600 leading-5">
            Bu defter herkese açık. Kaydedersen kendi kütüphanende referans olur. Klonlarsan
            kaynaklar senin defterine kopyalanır ve istediğin gibi düzenleyebilirsin.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
