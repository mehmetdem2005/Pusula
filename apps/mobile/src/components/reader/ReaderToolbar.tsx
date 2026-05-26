import { Modal, Pressable, Text, View } from 'react-native'
import { Alert } from 'react-native'
import { useCreateBookmark } from '../../hooks/useBooks'
import { Icon } from '../ui/Icon'

interface Props {
  theme: 'light' | 'dark' | 'sepia'
  fontSize: number
  onThemeChange: (t: 'light' | 'dark' | 'sepia') => void
  onFontSizeChange: (n: number) => void
  onClose: () => void
  bookId: string
  currentCfi?: string
}

export function ReaderToolbar({
  theme,
  fontSize,
  onThemeChange,
  onFontSizeChange,
  onClose,
  bookId,
  currentCfi,
}: Props) {
  const createBookmark = useCreateBookmark()

  const handleBookmark = () => {
    createBookmark.mutate(
      { bookId, cfi: currentCfi },
      {
        onSuccess: () => {
          Alert.alert('✓ Yer imi eklendi')
          onClose()
        },
        onError: (e: any) => Alert.alert('Hata', e.message),
      },
    )
  }

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 bg-black/40 justify-end">
        <Pressable className="bg-cream-50 rounded-t-3xl pt-3 pb-8">
          <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-4" />

          <View className="px-6">
            {/* Theme */}
            <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-2">
              Tema
            </Text>
            <View className="flex-row gap-2 mb-5">
              {[
                { v: 'light' as const, l: 'Açık', bg: '#FBF8F0', fg: '#1E1B4B' },
                { v: 'sepia' as const, l: 'Sepya', bg: '#F5F1E8', fg: '#1E1B4B' },
                { v: 'dark' as const, l: 'Koyu', bg: '#0F0E1F', fg: '#FBF8F0' },
              ].map((t) => (
                <Pressable
                  key={t.v}
                  onPress={() => onThemeChange(t.v)}
                  className={`flex-1 rounded-2xl p-4 border-2 items-center ${
                    theme === t.v ? 'border-ink-900' : 'border-slate-200'
                  }`}
                  style={{ backgroundColor: t.bg }}
                >
                  <Text
                    style={{
                      color: t.fg,
                      fontFamily: 'InstrumentSerif',
                      fontSize: 24,
                      fontStyle: 'italic',
                    }}
                  >
                    Aa
                  </Text>
                  <Text className="text-[10px] mt-1 font-semibold" style={{ color: t.fg }}>
                    {t.l}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Font size */}
            <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-2">
              Yazı Boyutu · {fontSize}%
            </Text>
            <View className="flex-row items-center gap-3 mb-5">
              <Pressable
                onPress={() => onFontSizeChange(Math.max(70, fontSize - 10))}
                className="bg-white border border-slate-200 rounded-xl w-12 h-12 items-center justify-center"
              >
                <Text className="font-serif text-base text-ink-900">A−</Text>
              </Pressable>
              <View className="flex-1 h-1 bg-slate-200 rounded-full">
                <View
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${((fontSize - 70) / 80) * 100}%` }}
                />
              </View>
              <Pressable
                onPress={() => onFontSizeChange(Math.min(150, fontSize + 10))}
                className="bg-white border border-slate-200 rounded-xl w-12 h-12 items-center justify-center"
              >
                <Text className="font-serif text-xl text-ink-900">A+</Text>
              </Pressable>
            </View>

            {/* Actions */}
            <View className="flex-row gap-2">
              <Pressable
                onPress={handleBookmark}
                disabled={!currentCfi || createBookmark.isPending}
                className="flex-1 bg-white border border-slate-200 rounded-2xl py-4 items-center"
              >
                <Icon name="bookmark" size={22} color="#F59E0B" />
                <Text className="text-[11px] text-ink-900 font-semibold mt-1">Yer İmi</Text>
              </Pressable>
              <Pressable className="flex-1 bg-white border border-slate-200 rounded-2xl py-4 items-center">
                <Icon name="search" size={22} color="#1E1B4B" />
                <Text className="text-[11px] text-ink-900 font-semibold mt-1">Ara</Text>
              </Pressable>
              <Pressable className="flex-1 bg-white border border-slate-200 rounded-2xl py-4 items-center">
                <Icon name="layers" size={22} color="#1E1B4B" />
                <Text className="text-[11px] text-ink-900 font-semibold mt-1">İçindekiler</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
