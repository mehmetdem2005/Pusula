import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '../../src/components/ui/Icon'
import { apiFetch } from '../../src/lib/api'

export default function ProfileScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { username } = useLocalSearchParams<{ username: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['profile', username],
    queryFn: () => apiFetch<any>(`/api/profiles/${username}`),
    enabled: !!username,
  })

  const followMut = useMutation({
    mutationFn: () =>
      apiFetch<{ following: boolean }>(`/api/profiles/${data.profile.id}/follow`, {
        method: 'POST',
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', username] }),
  })

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50 items-center justify-center">
        <ActivityIndicator color="#F59E0B" />
      </SafeAreaView>
    )
  }

  if (!data?.profile) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50 items-center justify-center px-6">
        <Text className="text-4xl mb-3">👤</Text>
        <Text className="font-serif text-2xl text-ink-900">Profil bulunamadı</Text>
        <Text className="text-sm text-slate-500 mt-2 text-center">
          Bu kullanıcı yok veya profilini gizlemiş.
        </Text>
      </SafeAreaView>
    )
  }

  const p = data.profile
  const stats = data.stats ?? {}

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Banner */}
        <View
          style={{ backgroundColor: p.banner_color ?? '#1E1B4B', height: 120 }}
          className="relative"
        >
          <Pressable onPress={() => router.back()} className="absolute top-4 left-4">
            <Icon name="chevron-left" size={22} color="#FBF8F0" />
          </Pressable>
        </View>

        {/* Avatar + Name */}
        <View className="px-5 -mt-12">
          <View className="bg-white rounded-full p-1 self-start">
            <View className="w-20 h-20 rounded-full bg-ink-900 items-center justify-center">
              <Text className="text-amber-500 font-bold text-3xl">
                {(p.full_name ?? p.username ?? '?').slice(0, 1).toUpperCase()}
              </Text>
            </View>
          </View>

          <View className="mt-3 flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="font-serif text-2xl text-ink-900">{p.full_name ?? p.username}</Text>
              <Text className="text-sm text-slate-500">@{p.username}</Text>
              {p.pronouns && (
                <Text className="text-[10px] text-slate-400 mt-0.5">{p.pronouns}</Text>
              )}
            </View>

            {!data.isSelf && (
              <Pressable
                onPress={() => followMut.mutate()}
                disabled={followMut.isPending}
                className={`rounded-full px-5 py-2 ${
                  data.isFollowing ? 'bg-white border border-slate-200' : 'bg-ink-900'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${data.isFollowing ? 'text-slate-700' : 'text-cream-50'}`}
                >
                  {data.isFollowing ? 'Takipte' : 'Takip Et'}
                </Text>
              </Pressable>
            )}
          </View>

          {p.bio && <Text className="text-sm text-ink-900 mt-3 leading-5">{p.bio}</Text>}
        </View>

        {/* Stats */}
        <View className="flex-row mx-5 mt-5 bg-white border border-slate-100 rounded-3xl p-3">
          <Stat label="Defter" value={stats.public_notebook_count ?? 0} />
          <Stat label="Görüntüleme" value={stats.total_views ?? 0} />
          <Stat label="Kayıt" value={stats.total_saves ?? 0} />
          <Stat label="Takipçi" value={stats.followers_count ?? 0} />
        </View>

        {/* Achievements (top 6) */}
        {data.achievements?.length > 0 && (
          <View className="px-5 mt-6">
            <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-3">
              Rozetler ({data.achievements.length})
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {data.achievements.slice(0, 12).map((a: any) => (
                <View
                  key={a.achievement_id}
                  className="bg-white border border-slate-100 rounded-2xl p-3 items-center"
                  style={{ width: 80 }}
                >
                  <Text className="text-2xl">{a.achievements?.emoji}</Text>
                  <Text
                    className="text-[9px] text-slate-700 mt-1 text-center font-bold"
                    numberOfLines={2}
                  >
                    {a.achievements?.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Public Notebooks */}
        <View className="px-5 mt-6">
          <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-3">
            {data.notebooks?.length ?? 0} Paylaşılan Defter
          </Text>
          {(data.notebooks ?? []).map((n: any) => (
            <Pressable
              key={n.id}
              onPress={() => router.push(`/n/${n.public_slug}`)}
              className="bg-white border border-slate-100 rounded-2xl p-3 mb-2"
            >
              <Text className="font-serif text-base text-ink-900" numberOfLines={2}>
                {n.title}
              </Text>
              {n.description && (
                <Text className="text-xs text-slate-500 mt-1" numberOfLines={2}>
                  {n.description}
                </Text>
              )}
              <View className="flex-row items-center gap-3 mt-2">
                <View className="flex-row items-center gap-1">
                  <Icon name="eye" size={10} color="#94A3B8" />
                  <Text className="text-[10px] text-slate-500 font-mono">{n.view_count}</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <Icon name="bookmark" size={10} color="#F59E0B" />
                  <Text className="text-[10px] text-slate-500 font-mono">{n.save_count}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="flex-1 items-center">
      <Text className="font-serif text-xl text-ink-900">
        {value > 999 ? `${(value / 1000).toFixed(1)}K` : value}
      </Text>
      <Text className="text-[9px] text-slate-500 mt-0.5">{label}</Text>
    </View>
  )
}
