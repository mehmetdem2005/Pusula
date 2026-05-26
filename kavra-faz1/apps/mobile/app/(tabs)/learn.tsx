import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function Learn() {
  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <View className="flex-1 items-center justify-center p-8">
        <Text style={{ fontSize: 48 }}>📚</Text>
        <Text className="text-2xl font-serif text-brand-950 mt-4">Öğren</Text>
        <Text className="text-slate-500 text-center mt-2">
          Konularını burada yöneteceksin.{'\n'}Yakında aktif olacak.
        </Text>
      </View>
    </SafeAreaView>
  )
}
