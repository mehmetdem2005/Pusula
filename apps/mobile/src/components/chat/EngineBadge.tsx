import { Pressable, Text, View } from 'react-native'
import type { EngineMeta } from '../../hooks/useLessons'

const CONTEXT_LABELS: Record<string, { emoji: string; tr: string }> = {
  first_exposure: { emoji: '🌱', tr: 'İlk karşılaşma' },
  practice: { emoji: '🎯', tr: 'Uygulama' },
  review: { emoji: '🔁', tr: 'Tekrar' },
  weak_spot: { emoji: '🔬', tr: 'Zayıf nokta' },
  exam_prep: { emoji: '📝', tr: 'Sınav hazırlığı' },
  creativity_block: { emoji: '💡', tr: 'Yaratıcı açılım' },
}

interface Props {
  meta: EngineMeta
  onPress?: () => void
}

export function EngineBadge({ meta, onPress }: Props) {
  const ctx = CONTEXT_LABELS[meta.context] ?? { emoji: '🧠', tr: meta.context }

  return (
    <Pressable
      onPress={onPress}
      className="mx-4 mb-2 bg-brand-50 border border-brand-200 rounded-2xl p-3 flex-row items-center gap-3"
    >
      <Text style={{ fontSize: 20 }}>{ctx.emoji}</Text>
      <View className="flex-1">
        <Text className="text-xs text-brand-700 font-semibold">
          {ctx.tr} · {meta.techniqueName}
        </Text>
        <Text className="text-xs text-slate-500 mt-0.5" numberOfLines={1}>
          {meta.activeBehaviors.length > 0
            ? `+ ${meta.activeBehaviors.length} gizli taktik`
            : 'Temel pedagoji'}
          {meta.hasRAG && ` · 📄 ${meta.ragSources.length} referans`}
        </Text>
      </View>
      {onPress && <Text className="text-brand-600 text-xl">ⓘ</Text>}
    </Pressable>
  )
}
