import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'

// NOT: Gerçek encrypt/decrypt backend worker'da. Bu ekran sadece UI akışı.
// Gerçek POST /api/keys bağlantısı worker-llm hazır olunca eklenecek.

export default function ApiKeys() {
  const router = useRouter()
  const [showAddModal, setShowAddModal] = useState(false)

  // Placeholder — gerçek data Supabase'den TanStack Query ile gelecek
  const [keys] = useState([
    // Örnek: { id: '1', label: 'Kişisel', provider: 'groq', last4: 'a1b2', isDefault: true }
  ])

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
            Groq API anahtarını kendi hesabından aldın, Kavra onu şifreli saklar. Ücretsiz tier
            cömerttir — çoğu kullanıcı hiç para ödemez.
          </Text>
          <Pressable
            onPress={() => Alert.alert('', 'console.groq.com/keys adresinden ücretsiz anahtar al')}
            className="mt-2"
          >
            <Text className="text-brand-600 font-semibold text-sm">Nasıl alırım? →</Text>
          </Pressable>
        </View>

        {keys.length === 0 ? (
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
            {/* Key listesi buraya gelecek */}
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

function AddKeyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [label, setLabel] = useState('Kişisel')
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!key.startsWith('gsk_')) {
      Alert.alert('', 'Groq anahtarı "gsk_" ile başlamalı')
      return
    }
    setLoading(true)
    // TODO: POST /api/keys → worker-llm encrypt + test
    setTimeout(() => {
      setLoading(false)
      onClose()
      Alert.alert('', 'Anahtar şifreli kaydedildi ve test edildi ✓')
    }, 1500)
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl p-6 pt-4">
          <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-6" />
          <Text className="text-2xl font-serif text-brand-950 mb-1">Yeni Groq Anahtarı</Text>
          <Text className="text-slate-500 mb-6">
            Anahtarın şifreli saklanır, sadece sen erişebilirsin.
          </Text>

          <Input
            label="Etiket"
            value={label}
            onChangeText={setLabel}
            placeholder="Örn: Kişisel, İş"
          />

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
              <Button title="İptal" variant="secondary" onPress={onClose} />
            </View>
            <View className="flex-1">
              <Button title="Kaydet" onPress={handleSave} loading={loading} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}
