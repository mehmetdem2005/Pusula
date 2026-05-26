import { useRouter } from 'expo-router'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import {
  type GeneratedContent,
  type Notebook,
  type NotebookSource,
  useGenerateContent,
} from '../../hooks/useNotebooks'
import { Icon, type IconName } from '../ui/Icon'

interface Props {
  notebook: Notebook
  sources: NotebookSource[]
  generatedContent: GeneratedContent[]
}

export function NotebookStudioTab({ notebook, sources, generatedContent }: Props) {
  const router = useRouter()
  const generate = useGenerateContent()

  const readySources = sources.filter((s) => s.status === 'ready')

  const handleGenerate = async (
    contentType: GeneratedContent['content_type'],
    config: any = {},
  ) => {
    if (readySources.length === 0) {
      return Alert.alert('Önce kaynak işle', 'Studio için en az 1 hazır kaynak gerek.')
    }

    try {
      const res = await generate.mutateAsync({
        notebookId: notebook.id,
        contentType,
        config,
      })

      // Studio detay sayfasına yönlendir (üretim sürerken takip edebilsin)
      router.push(`/notebook/${notebook.id}/studio/${res.generated.id}`)
    } catch (e: any) {
      if (e.message?.includes('pro_required')) {
        Alert.alert('Pro Gerekli', e.message, [
          { text: 'İptal', style: 'cancel' },
          { text: "Pro'ya Geç", onPress: () => router.push('/upgrade') },
        ])
      } else if (e.message?.includes('free_limit')) {
        Alert.alert('Aylık Limit', "Free aylık 10 üretim. Pro'da sınırsız.")
      } else {
        Alert.alert('Hata', e.message)
      }
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>
      {/* "Yeni oluştur" header */}
      <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mb-3 px-1">
        Yeni Oluştur
      </Text>

      <CreateCard
        icon="headphones"
        bgColor="#E0E7FF"
        iconColor="#1E1B4B"
        title="Sesli Özet"
        desc="2 sunuculu Türkçe podcast"
        badge="PRO"
        loading={generate.isPending}
        onPress={() => handleGenerate('audio_overview', { duration: 'medium' })}
      />

      <CreateCard
        icon="layers"
        bgColor="#D1FAE5"
        iconColor="#065F46"
        title="Bilgi Kartları"
        desc="15 flashcard, FSRS ile çalış"
        loading={generate.isPending}
        onPress={() => handleGenerate('flashcards', { cardCount: 15 })}
      />

      <CreateCard
        icon="check-circle"
        bgColor="#FEE2E2"
        iconColor="#991B1B"
        title="Test"
        desc="10 çoktan seçmeli, açıklamalı"
        loading={generate.isPending}
        onPress={() => handleGenerate('quiz', { cardCount: 10 })}
      />

      <CreateCard
        icon="image"
        bgColor="#F3E8FF"
        iconColor="#6B21A8"
        title="İnfografik"
        desc="Mermaid diyagram, Türkçe"
        loading={generate.isPending}
        onPress={() => handleGenerate('infographic')}
      />

      <CreateCard
        icon="layers"
        bgColor="#FEF3C7"
        iconColor="#92400E"
        title="Slayt Sunusu"
        desc="10 slayt, konuşma notları"
        loading={generate.isPending}
        onPress={() => handleGenerate('slides', { slideCount: 10 })}
      />

      <CreateCard
        icon="file"
        bgColor="#E5E7EB"
        iconColor="#374151"
        title="Özet"
        desc="3-5 paragraf + anahtar noktalar"
        loading={generate.isPending}
        onPress={() => handleGenerate('summary')}
      />

      {/* Üretilen içerikler */}
      {generatedContent.length > 0 && (
        <>
          <Text className="font-mono text-[10px] text-slate-500 tracking-widest uppercase mt-6 mb-3 px-1">
            Üretilen Medya İçerikleri
          </Text>
          <View className="gap-2">
            {generatedContent.map((g) => (
              <Pressable
                key={g.id}
                onPress={() => router.push(`/notebook/${notebook.id}/studio/${g.id}`)}
                className="bg-white border border-slate-100 rounded-2xl p-3 flex-row items-center gap-3"
              >
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: contentTypeBg(g.content_type) }}
                >
                  <Icon
                    name={contentTypeIcon(g.content_type)}
                    size={18}
                    color={contentTypeColor(g.content_type)}
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-ink-900 text-sm" numberOfLines={1}>
                    {g.title}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    {g.status === 'ready' ? (
                      <>
                        <Icon name="check-circle" size={10} color="#10B981" />
                        <Text className="text-[10px] text-emerald-700">
                          {g.duration_seconds
                            ? `${Math.round(g.duration_seconds / 60)} dk`
                            : 'Hazır'}
                        </Text>
                      </>
                    ) : g.status === 'failed' ? (
                      <Text className="text-[10px] text-red-500">⚠ Üretim hatası</Text>
                    ) : (
                      <>
                        <ActivityIndicator size="small" color="#F59E0B" />
                        <Text className="text-[10px] text-amber-700">Üretiliyor...</Text>
                      </>
                    )}
                  </View>
                </View>
                <Icon name="chevron-right" size={16} color="#CBD5E1" />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  )
}

function CreateCard({
  icon,
  bgColor,
  iconColor,
  title,
  desc,
  badge,
  loading,
  onPress,
}: {
  icon: IconName
  bgColor: string
  iconColor: string
  title: string
  desc: string
  badge?: string
  loading?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      className="rounded-3xl p-4 mb-2 flex-row items-center gap-3"
      style={{ backgroundColor: bgColor }}
    >
      <View className="w-11 h-11 rounded-xl items-center justify-center bg-white/40">
        <Icon name={icon} size={20} color={iconColor} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text className="font-serif text-base" style={{ color: iconColor }}>
            {title}
          </Text>
          {badge && (
            <View className="bg-ink-900 rounded px-1.5 py-0.5">
              <Text className="text-[8px] text-amber-500 font-bold">{badge}</Text>
            </View>
          )}
        </View>
        <Text className="text-[11px] mt-0.5" style={{ color: iconColor, opacity: 0.7 }}>
          {desc}
        </Text>
      </View>
      <Icon name="chevron-right" size={16} color={iconColor} />
    </Pressable>
  )
}

function contentTypeIcon(t: string): IconName {
  return t === 'audio_overview'
    ? 'headphones'
    : t === 'flashcards'
      ? 'layers'
      : t === 'quiz'
        ? 'check-circle'
        : t === 'slides'
          ? 'image'
          : t === 'infographic'
            ? 'image'
            : 'file'
}

function contentTypeColor(t: string): string {
  return t === 'audio_overview'
    ? '#1E1B4B'
    : t === 'flashcards'
      ? '#065F46'
      : t === 'quiz'
        ? '#991B1B'
        : t === 'slides'
          ? '#92400E'
          : t === 'infographic'
            ? '#6B21A8'
            : '#374151'
}

function contentTypeBg(t: string): string {
  return t === 'audio_overview'
    ? '#E0E7FF'
    : t === 'flashcards'
      ? '#D1FAE5'
      : t === 'quiz'
        ? '#FEE2E2'
        : t === 'slides'
          ? '#FEF3C7'
          : t === 'infographic'
            ? '#F3E8FF'
            : '#E5E7EB'
}
