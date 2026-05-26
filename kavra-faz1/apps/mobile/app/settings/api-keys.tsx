import { Stack } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'
import {
  type ApiKeyRow,
  useAddApiKey,
  useApiKeys,
  useDeleteApiKey,
  useSetDefaultApiKey,
  useTestApiKey,
} from '../../src/hooks/useApiKeys'

export default function ApiKeys() {
  const [showAddModal, setShowAddModal] = useState(false)
  const { data: keys, isLoading } = useApiKeys()

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <Stack.Screen
        options={{
          title: 'API Anahtarları',
          headerShown: true,
          headerStyle: { backgroundColor: '#FAFAFA' },
          headerTitleStyle: { color: '#1E1B4B', fontWeight: '600' },
        }}
      />
      <ScrollView className="flex-1 px-5 pt-4">
        <View className="bg-brand-50 border border-brand-200 rounded-2xl p-4 mb-4">
          <Text className="text-brand-900 font-semibold mb-1">🔐 Anahtarın sende</Text>
          <Text className="text-brand-800 text-sm leading-5">
            Groq API anahtarını kendi hesabından aldın, Kavra onu AES-256-GCM ile şifreli saklar.
            Ücretsiz tier cömerttir — çoğu kullanıcı hiç para ödemez.
          </Text>
          <Pressable
            onPress={() => Linking.openURL('https://console.groq.com/keys')}
            className="mt-2"
          >
            <Text className="text-brand-600 font-semibold text-sm">Nasıl alırım? →</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <View className="py-20 items-center">
            <ActivityIndicator color="#1E1B4B" />
          </View>
        ) : !keys || keys.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 items-center border border-slate-100">
            <Text style={{ fontSize: 48 }}>🗝️</Text>
            <Text className="text-lg font-semibold text-brand-950 mt-3">Henüz anahtar yok</Text>
            <Text className="text-slate-500 text-center mt-1 mb-4">
              Kavra'yı kullanmaya başlamak için bir Groq anahtarı ekle.
            </Text>
            <Button title="+ Yeni Anahtar Ekle" onPress={() => setShowAddModal(true)} fullWidth />
          </View>
        ) : (
          <View>
            <View className="gap-3 mb-4">
              {keys.map((k) => (
                <KeyRow key={k.id} item={k} />
              ))}
            </View>
            <Button
              title="+ Yeni Anahtar Ekle"
              onPress={() => setShowAddModal(true)}
              fullWidth
              variant="secondary"
            />
          </View>
        )}
      </ScrollView>

      <AddKeyModal visible={showAddModal} onClose={() => setShowAddModal(false)} />
    </SafeAreaView>
  )
}

function KeyRow({ item }: { item: ApiKeyRow }) {
  const del = useDeleteApiKey()
  const test = useTestApiKey()
  const setDefault = useSetDefaultApiKey()

  const providerLabel = { groq: 'Groq', openai: 'OpenAI', anthropic: 'Anthropic' }[item.provider]

  const confirmDelete = () => {
    Alert.alert('Anahtarı sil', `"${item.label}" anahtarını kalıcı olarak silmek istiyor musun?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () =>
          del.mutate(item.id, {
            onError: (e: any) => Alert.alert('Hata', e.message),
          }),
      },
    ])
  }

  const runTest = () => {
    test.mutate(item.id, {
      onSuccess: (r) =>
        Alert.alert(
          r.success ? '✓ Çalışıyor' : '✗ Başarısız',
          r.success ? 'Anahtar geçerli ve Groq ile iletişim kuruldu.' : 'Anahtar çalışmıyor.',
        ),
      onError: (e: any) => Alert.alert('Hata', e.message),
    })
  }

  return (
    <View className="bg-white rounded-2xl p-4 border border-slate-100">
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="font-semibold text-brand-950">{item.label}</Text>
            {item.is_default && (
              <View className="bg-accent-500/15 px-2 py-0.5 rounded-full">
                <Text className="text-accent-700 text-xs font-semibold">Varsayılan</Text>
              </View>
            )}
          </View>
          <Text className="text-slate-500 text-sm mt-0.5">
            {providerLabel} · gsk_••••{item.key_last4}
          </Text>
          {item.last_test_success !== null && (
            <Text
              className={`text-xs mt-1 ${item.last_test_success ? 'text-green-600' : 'text-red-500'}`}
            >
              {item.last_test_success ? '✓ Son test başarılı' : '✗ Son test başarısız'}
            </Text>
          )}
        </View>
      </View>

      <View className="flex-row gap-2 mt-3">
        {!item.is_default && (
          <Pressable
            onPress={() => setDefault.mutate(item.id)}
            className="px-3 py-1.5 rounded-lg bg-slate-100"
          >
            <Text className="text-brand-950 text-sm font-medium">Varsayılan Yap</Text>
          </Pressable>
        )}
        <Pressable
          onPress={runTest}
          disabled={test.isPending}
          className="px-3 py-1.5 rounded-lg bg-slate-100"
        >
          <Text className="text-brand-950 text-sm font-medium">
            {test.isPending ? 'Test ediliyor...' : 'Test Et'}
          </Text>
        </Pressable>
        <View className="flex-1" />
        <Pressable
          onPress={confirmDelete}
          disabled={del.isPending}
          className="px-3 py-1.5 rounded-lg bg-red-50"
        >
          <Text className="text-red-600 text-sm font-medium">Sil</Text>
        </Pressable>
      </View>
    </View>
  )
}

function AddKeyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [label, setLabel] = useState('Kişisel')
  const [key, setKey] = useState('')
  const add = useAddApiKey()

  const handleSave = async () => {
    if (!key.trim()) {
      Alert.alert('', 'API anahtarını yapıştır')
      return
    }
    if (!key.startsWith('gsk_')) {
      Alert.alert('', 'Groq anahtarı "gsk_" ile başlamalı')
      return
    }

    add.mutate(
      { label: label.trim(), key: key.trim() },
      {
        onSuccess: () => {
          setKey('')
          setLabel('Kişisel')
          onClose()
          Alert.alert('✓', 'Anahtar şifreli kaydedildi ve test edildi.')
        },
        onError: (e: any) => {
          if (e.message === 'invalid_key') {
            Alert.alert('Hata', 'Anahtar Groq ile doğrulanamadı. Doğru kopyaladığından emin ol.')
          } else {
            Alert.alert('Hata', e.message ?? 'Beklenmeyen hata')
          }
        },
      },
    )
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl p-6 pt-4">
          <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-6" />
          <Text className="text-2xl font-serif text-brand-950 mb-1">Yeni Groq Anahtarı</Text>
          <Text className="text-slate-500 mb-6">
            Anahtarın AES-256-GCM ile şifreli saklanır, sadece sen erişebilirsin.
          </Text>

          <Input label="Etiket" value={label} onChangeText={setLabel} placeholder="Örn: Kişisel" />
          <Input
            label="API Anahtarı"
            value={key}
            onChangeText={setKey}
            placeholder="gsk_..."
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            hint="console.groq.com/keys adresinden ücretsiz al"
          />

          <View className="flex-row gap-3 mt-2">
            <View className="flex-1">
              <Button
                title="İptal"
                variant="secondary"
                onPress={onClose}
                disabled={add.isPending}
              />
            </View>
            <View className="flex-1">
              <Button title="Kaydet" onPress={handleSave} loading={add.isPending} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}
