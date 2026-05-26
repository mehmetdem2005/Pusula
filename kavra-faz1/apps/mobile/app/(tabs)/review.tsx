import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Review() {
  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <View className="flex-1 items-center justify-center p-8">
        <Text style={{ fontSize: 48 }}>🔁</Text>
        <Text className="text-2xl font-serif text-brand-950 mt-4">Tekrar</Text>
        <Text className="text-slate-500 text-center mt-2">
          Flashcard swipe ve SM-2 aralıklı tekrar{'\n'}bu ekranda olacak.
        </Text>
      </View>
    </SafeAreaView>
  )
}
