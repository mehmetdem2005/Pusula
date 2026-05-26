import Constants from 'expo-constants'
import { Stack, useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Icon, type IconName } from '../src/components/ui/Icon'
import { apiFetch } from '../src/lib/api'

const TYPES: Array<{ value: any; label: string; icon: IconName; color: string }> = [
  { value: 'bug', label: 'Hata', icon: 'alert-triangle', color: '#DC2626' },
  { value: 'feature_request', label: 'Yeni Özellik', icon: 'sparkles', color: '#F59E0B' },
  { value: 'rating', label: 'Genel Görüş', icon: 'star', color: '#7C3AED' },
  { value: 'general', label: 'Diğer', icon: 'message-square', color: '#0891B2' },
]

export default function FeedbackScreen() {
  const router = useRouter()
  const [type, setType] = useState<any>('feature_request')
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!message.trim()) return Alert.alert('Mesaj boş')
    setSubmitting(true)
    try {
      await apiFetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          feedbackType: type,
          rating: rating > 0 ? rating : undefined,
          message: message.trim(),
          appVersion: Constants.expoConfig?.version,
          platform: Platform.OS,
        }),
      })
      Alert.alert('Teşekkürler!', 'Geri bildirimini aldık. Önemsiyoruz, gerçekten.', [
        { text: 'Tamam', onPress: () => router.back() },
      ])
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    }
    setSubmitting(false)
  }

  return (
    <SafeAreaView className="flex-1 bg-cream-50">
      <Stack.Screen
        options={{
          title: 'Geri Bildirim',
          headerStyle: { backgroundColor: '#FBF8F0' },
          headerTitleStyle: { fontFamily: 'InstrumentSerif', fontSize: 18 },
        }}
      />

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text className="font-serif text-3xl text-ink-900">
          Bana <Text className="italic">söyle</Text>.
        </Text>
        <Text className="text-sm text-slate-600 mt-2 mb-6">
          Hata, fikir, takıntı, hayal kırıklığı — hepsi değerli. Anonim değil, ekibim okur.
        </Text>

        <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
          Tür
        </Text>
        <View className="flex-row gap-2 mb-5">
          {TYPES.map((t) => (
            <Pressable
              key={t.value}
              onPress={() => setType(t.value)}
              className={`flex-1 border rounded-2xl p-3 items-center ${
                type === t.value ? 'bg-amber-50 border-amber-500' : 'bg-white border-slate-100'
              }`}
            >
              <Icon name={t.icon} size={18} color={type === t.value ? t.color : '#94A3B8'} />
              <Text
                className={`text-[10px] mt-1.5 font-bold ${
                  type === t.value ? 'text-ink-900' : 'text-slate-500'
                }`}
              >
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {type === 'rating' && (
          <>
            <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
              Puan ver (opsiyonel)
            </Text>
            <View className="flex-row gap-2 mb-5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setRating(rating === n ? 0 : n)}
                  className="w-12 h-12 items-center justify-center"
                >
                  <Icon name="star" size={28} color={n <= rating ? '#F59E0B' : '#CBD5E1'} />
                </Pressable>
              ))}
            </View>
          </>
        )}

        <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-2">
          Mesaj
        </Text>
        <TextInput
          placeholder={
            type === 'bug'
              ? 'Ne oldu? Hangi ekran? Ne bekliyordun? Ne gerçekleşti?'
              : type === 'feature_request'
                ? 'Hangi özelliği isterdin? Nasıl bir problemi çözer?'
                : 'Aklındakini paylaş...'
          }
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={2000}
          className="bg-white border border-slate-200 rounded-2xl px-3 py-3 text-base"
          style={{ height: 200, textAlignVertical: 'top' }}
        />
        <Text className="text-[10px] text-slate-400 text-right mt-1">{message.length} / 2000</Text>

        <Pressable
          onPress={submit}
          disabled={!message.trim() || submitting}
          className={`rounded-full py-3 mt-5 items-center ${
            message.trim() ? 'bg-ink-900' : 'bg-slate-200'
          }`}
        >
          {submitting ? (
            <ActivityIndicator color="#F59E0B" />
          ) : (
            <Text
              className={`font-semibold ${message.trim() ? 'text-cream-50' : 'text-slate-500'}`}
            >
              Gönder
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  )
}
