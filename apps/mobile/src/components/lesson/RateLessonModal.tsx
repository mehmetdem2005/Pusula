import { useState } from 'react'
import { Modal, Pressable, Text, TextInput, View } from 'react-native'
import { Button } from '../ui/Button'

interface Props {
  visible: boolean
  techniqueName?: string
  onClose: () => void
  onSubmit: (rating: number, note?: string) => void
  submitting?: boolean
}

export function RateLessonModal({ visible, techniqueName, onClose, onSubmit, submitting }: Props) {
  const [rating, setRating] = useState<number>(0)
  const [note, setNote] = useState('')

  const handleSubmit = () => {
    if (rating === 0) return
    onSubmit(rating, note.trim() || undefined)
  }

  const handleSkip = () => {
    setRating(0)
    setNote('')
    onClose()
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={handleSkip}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl p-6 pt-4">
          <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-6" />

          <Text className="text-2xl font-serif text-brand-950 text-center">
            Bu ders nasıl geçti?
          </Text>
          {techniqueName && (
            <Text className="text-slate-500 text-center text-sm mt-1 mb-6">
              {techniqueName} tekniğiyle anlattım
            </Text>
          )}

          {/* Yıldızlar */}
          <View className="flex-row justify-center gap-2 my-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)} className="p-2">
                <Text style={{ fontSize: 40 }}>{n <= rating ? '⭐' : '☆'}</Text>
              </Pressable>
            ))}
          </View>

          {rating > 0 && (
            <Text className="text-center text-slate-600 mb-4 text-sm">
              {
                [
                  '',
                  'Hiç anlamadım 😕',
                  'Biraz zor geldi 😐',
                  'Fena değildi 🙂',
                  'İyi anladım 😊',
                  'Mükemmeldi! 🤩',
                ][rating]
              }
            </Text>
          )}

          {rating > 0 && rating < 4 && (
            <View className="mb-4">
              <Text className="text-xs font-semibold text-slate-400 uppercase mb-2">
                Ne daha iyi olabilirdi? (isteğe bağlı)
              </Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Kısa yorum..."
                placeholderTextColor="#94A3B8"
                multiline
                className="bg-slate-100 rounded-xl px-4 py-3 text-brand-950 min-h-[80px]"
                maxLength={200}
              />
            </View>
          )}

          <View className="flex-row gap-3 mt-2">
            <View className="flex-1">
              <Button title="Atla" variant="secondary" onPress={handleSkip} />
            </View>
            <View className="flex-1">
              <Button
                title="Gönder"
                onPress={handleSubmit}
                loading={submitting}
                disabled={rating === 0}
              />
            </View>
          </View>

          <Text className="text-xs text-slate-400 text-center mt-4">
            Puanın Kavra'nın sana uyum sağlamasına yardım eder
          </Text>
        </View>
      </View>
    </Modal>
  )
}
