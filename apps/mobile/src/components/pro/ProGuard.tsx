import { useRouter } from 'expo-router'
import { Pressable, Text, View } from 'react-native'
import { useIsPro } from '../../hooks/useEntitlement'

interface Props {
  feature: string // 'Voice Cloning', '3D Map' vb
  emoji: string
  description: string
  children?: React.ReactNode // Pro ise gösterilecek
}

/**
 * ProGuard
 * --------
 * Pro değilse compact upgrade card gösterir.
 * Pro ise children render eder.
 */
export function ProGuard({ feature, emoji, description, children }: Props) {
  const isPro = useIsPro()
  const router = useRouter()

  if (isPro) return <>{children}</>

  return (
    <Pressable
      onPress={() => router.push('/upgrade')}
      className="bg-brand-950 rounded-2xl p-5 m-4 active:opacity-80"
    >
      <View className="flex-row items-center gap-3 mb-3">
        <Text style={{ fontSize: 32 }}>{emoji}</Text>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="text-white font-bold text-lg">{feature}</Text>
            <View className="bg-accent-500 px-2 py-0.5 rounded-full">
              <Text className="text-white text-[10px] font-bold">PRO</Text>
            </View>
          </View>
          <Text className="text-white/70 text-sm mt-0.5">{description}</Text>
        </View>
      </View>

      <View className="bg-accent-500 px-4 py-2 rounded-xl items-center">
        <Text className="text-white font-bold">⚡ Pro'ya Geç</Text>
      </View>
    </Pressable>
  )
}

/**
 * Inline mini-badge — bir butonun yanında "Pro" göstermek için
 */
export function ProBadge() {
  return (
    <View className="bg-accent-500 px-1.5 py-0.5 rounded">
      <Text className="text-white text-[10px] font-bold">PRO</Text>
    </View>
  )
}
