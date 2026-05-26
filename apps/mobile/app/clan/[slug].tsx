import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon } from '../../src/components/ui/Icon'
import { apiFetch } from '../../src/lib/api'

export default function ClanDetailScreen() {
  const router = useRouter()
  const qc = useQueryClient()
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const [tab, setTab] = useState<'members' | 'chat'>('members')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['clan', slug],
    queryFn: () => apiFetch<any>(`/api/clans/${slug}`),
    enabled: !!slug,
  })

  const { data: messagesData } = useQuery({
    queryKey: ['clan-messages', data?.clan?.id],
    queryFn: () => apiFetch<{ messages: any[] }>(`/api/clans/${data.clan.id}/messages`),
    enabled: tab === 'chat' && data?.isMember,
    refetchInterval: tab === 'chat' ? 5000 : false, // 5sn polling
  })

  const joinMut = useMutation({
    mutationFn: () => apiFetch(`/api/clans/${data.clan.id}/join`, { method: 'POST' }),
    onSuccess: () => {
      refetch()
      qc.invalidateQueries({ queryKey: ['my-clans'] })
    },
    onError: (e: any) => Alert.alert('Katılamadı', e.message),
  })

  const leaveMut = useMutation({
    mutationFn: () => apiFetch(`/api/clans/${data.clan.id}/leave`, { method: 'DELETE' }),
    onSuccess: () => {
      router.back()
      qc.invalidateQueries({ queryKey: ['my-clans'] })
    },
    onError: (e: any) => Alert.alert('Hata', e.message),
  })

  const [messageText, setMessageText] = useState('')
  const sendMut = useMutation({
    mutationFn: () =>
      apiFetch(`/api/clans/${data.clan.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: messageText }),
      }),
    onSuccess: () => {
      setMessageText('')
      qc.invalidateQueries({ queryKey: ['clan-messages', data.clan.id] })
    },
  })

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50 items-center justify-center">
        <ActivityIndicator color="#F59E0B" />
      </SafeAreaView>
    )
  }

  const c = data?.clan
  if (!c) {
    return (
      <SafeAreaView className="flex-1 bg-cream-50 items-center justify-center">
        <Text className="text-2xl">🔍</Text>
        <Text className="font-serif text-lg text-ink-900 mt-2">Klan bulunamadı</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={{ backgroundColor: c.color }} className="pt-3 pb-5">
        <View className="flex-row items-center justify-between px-5 mb-4">
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Icon name="chevron-left" size={20} color="#FBF8F0" />
          </Pressable>
          {data.isMember && (
            <Pressable
              onPress={() =>
                Alert.alert('Klandan Ayrıl?', 'Tekrar katılmak için davet kodu gerekebilir.', [
                  { text: 'Vazgeç', style: 'cancel' },
                  { text: 'Ayrıl', style: 'destructive', onPress: () => leaveMut.mutate() },
                ])
              }
              hitSlop={8}
            >
              <Icon name="more-horizontal" size={18} color="#FBF8F0" />
            </Pressable>
          )}
        </View>

        <View className="px-5 items-center">
          <Text className="text-5xl mb-2">{c.emoji}</Text>
          <Text className="font-serif text-2xl text-cream-50">{c.name}</Text>
          <Text className="text-xs text-cream-50/70 mt-1">@{c.slug}</Text>
          {c.description && (
            <Text className="text-xs text-cream-50/80 mt-2 text-center px-4">{c.description}</Text>
          )}
          <Text className="text-[10px] text-amber-400 font-mono mt-2">
            {c.member_count}/{c.max_members} üye
          </Text>
        </View>

        {!data.isMember && c.member_count < c.max_members && (
          <Pressable
            onPress={() => joinMut.mutate()}
            disabled={joinMut.isPending}
            className="bg-amber-500 rounded-full py-2.5 mx-5 mt-4 items-center"
          >
            <Text className="font-bold text-ink-900 text-xs">Klana Katıl</Text>
          </Pressable>
        )}
      </View>

      {/* Tabs */}
      <View className="flex-row px-5 mt-3 gap-2">
        <Pressable
          onPress={() => setTab('members')}
          className={`flex-1 py-2 rounded-full ${tab === 'members' ? 'bg-ink-900' : 'bg-white border border-slate-200'}`}
        >
          <Text
            className={`text-center text-xs font-bold ${tab === 'members' ? 'text-cream-50' : 'text-slate-600'}`}
          >
            Liderlik
          </Text>
        </Pressable>
        {data.isMember && (
          <Pressable
            onPress={() => setTab('chat')}
            className={`flex-1 py-2 rounded-full ${tab === 'chat' ? 'bg-ink-900' : 'bg-white border border-slate-200'}`}
          >
            <Text
              className={`text-center text-xs font-bold ${tab === 'chat' ? 'text-cream-50' : 'text-slate-600'}`}
            >
              Sohbet
            </Text>
          </Pressable>
        )}
      </View>

      {tab === 'members' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
          <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-3">
            Bu Hafta Liderlik
          </Text>

          {data.members.map((m: any, i: number) => (
            <View
              key={m.profiles?.id}
              className="bg-white border border-slate-100 rounded-2xl p-3 mb-2 flex-row items-center gap-3"
            >
              <View
                className={`w-8 h-8 rounded-full items-center justify-center ${
                  i === 0
                    ? 'bg-amber-500'
                    : i === 1
                      ? 'bg-slate-300'
                      : i === 2
                        ? 'bg-orange-300'
                        : 'bg-slate-100'
                }`}
              >
                <Text className="font-bold text-xs text-ink-900">{i + 1}</Text>
              </View>
              <View className="w-8 h-8 rounded-full bg-ink-900 items-center justify-center">
                <Text className="text-amber-500 text-[10px] font-bold">
                  {(m.profiles?.full_name ?? m.profiles?.username ?? '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm text-ink-900 font-semibold">
                  @{m.profiles?.username ?? 'anonim'}
                </Text>
                <View className="flex-row items-center gap-2 mt-0.5">
                  {m.role === 'founder' && (
                    <Text className="text-[9px] text-amber-600 font-bold">KURUCU</Text>
                  )}
                  {m.current_streak > 0 && (
                    <Text className="text-[9px] text-orange-500 font-bold">
                      🔥 {m.current_streak}
                    </Text>
                  )}
                </View>
              </View>
              <View className="items-end">
                <Text className="font-mono text-base text-ink-900 font-bold">
                  {m.weekly_reviews}
                </Text>
                <Text className="text-[9px] text-slate-500">tekrar</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {tab === 'chat' && data.isMember && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
          keyboardVerticalOffset={80}
        >
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 20 }} className="flex-1">
            {(messagesData?.messages ?? []).map((m: any) => (
              <View key={m.id} className="mb-3">
                {m.message_type === 'system' ? (
                  <View className="bg-cream-50 px-3 py-1.5 rounded-full self-center">
                    <Text className="text-[10px] text-slate-500 italic">{m.content}</Text>
                  </View>
                ) : (
                  <View className="flex-row gap-2">
                    <View className="w-7 h-7 rounded-full bg-ink-900 items-center justify-center">
                      <Text className="text-amber-500 text-[10px] font-bold">
                        {(m.profiles?.full_name ?? m.profiles?.username ?? '?')
                          .slice(0, 1)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View className="flex-1 bg-white rounded-2xl p-2.5 border border-slate-100">
                      <Text className="text-[10px] font-bold text-ink-900">
                        @{m.profiles?.username}
                      </Text>
                      <Text className="text-sm text-ink-900 mt-0.5">{m.content}</Text>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View className="px-3 pb-3 pt-2 border-t border-slate-100 flex-row gap-2">
            <TextInput
              placeholder="Bir şey yaz..."
              value={messageText}
              onChangeText={setMessageText}
              maxLength={1000}
              className="flex-1 bg-white border border-slate-200 rounded-full px-4 py-2.5 text-sm"
            />
            <Pressable
              onPress={() => sendMut.mutate()}
              disabled={!messageText.trim() || sendMut.isPending}
              className={`w-11 h-11 rounded-full items-center justify-center ${
                messageText.trim() ? 'bg-ink-900' : 'bg-slate-200'
              }`}
            >
              <Icon name="send" size={16} color={messageText.trim() ? '#F59E0B' : '#94A3B8'} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  )
}
