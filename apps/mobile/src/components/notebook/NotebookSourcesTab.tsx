import * as DocumentPicker from 'expo-document-picker'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  type Notebook,
  type NotebookSource,
  useCreateSource,
  useDeleteSource,
  useUploadSource,
} from '../../hooks/useNotebooks'
import { Icon, type IconName } from '../ui/Icon'

interface Props {
  notebook: Notebook
  sources: NotebookSource[]
}

export function NotebookSourcesTab({ notebook, sources }: Props) {
  const router = useRouter()
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [textModalOpen, setTextModalOpen] = useState(false)
  const [urlModalOpen, setUrlModalOpen] = useState(false)
  const [youtubeModalOpen, setYoutubeModalOpen] = useState(false)
  const [textTitle, setTextTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [urlTitle, setUrlTitle] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeTitle, setYoutubeTitle] = useState('')

  const uploadSource = useUploadSource()
  const createSource = useCreateSource()
  const deleteSource = useDeleteSource()

  const handlePickFile = async (type: 'pdf' | 'audio' | 'epub') => {
    setAddModalOpen(false)
    try {
      const types =
        type === 'pdf'
          ? ['application/pdf']
          : type === 'audio'
            ? ['audio/*']
            : ['application/epub+zip']

      const res = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true })
      if (res.canceled || !res.assets[0]) return

      const a = res.assets[0]
      const blob = await (await fetch(a.uri)).blob()

      const uploaded = await uploadSource.mutateAsync({ file: blob, fileName: a.name })

      await createSource.mutateAsync({
        notebookId: notebook.id,
        sourceType: type,
        title: a.name.replace(/\.[^.]+$/, ''),
        storagePath: uploaded.storagePath,
      })

      Alert.alert('✓ Eklendi', 'Kaynak işleniyor, birkaç dakika sürebilir.')
    } catch (e: any) {
      if (e.message?.includes('free_limit')) {
        Alert.alert('Limit', 'Free üyeler defter başına 5 kaynak ekleyebilir.')
      } else {
        Alert.alert('Hata', e.message)
      }
    }
  }

  const handleAddText = async () => {
    if (!textTitle.trim() || !textContent.trim()) return Alert.alert('Başlık ve içerik gerekli')
    try {
      await createSource.mutateAsync({
        notebookId: notebook.id,
        sourceType: 'text',
        title: textTitle,
        rawText: textContent,
      })
      setTextModalOpen(false)
      setTextTitle('')
      setTextContent('')
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    }
  }

  const handleAddUrl = async () => {
    if (!urlInput.trim()) return Alert.alert('URL gerekli')
    try {
      await createSource.mutateAsync({
        notebookId: notebook.id,
        sourceType: 'url',
        title: urlTitle.trim() || urlInput,
        externalUrl: urlInput,
      })
      setUrlModalOpen(false)
      setUrlInput('')
      setUrlTitle('')
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    }
  }

  const handleAddYoutube = async () => {
    if (!youtubeUrl.trim()) return Alert.alert('YouTube URL gerekli')
    if (!youtubeUrl.match(/youtube\.com|youtu\.be/)) {
      return Alert.alert('Geçersiz URL', 'youtube.com veya youtu.be linki olmalı')
    }
    try {
      await createSource.mutateAsync({
        notebookId: notebook.id,
        sourceType: 'youtube',
        title: youtubeTitle.trim() || 'YouTube Video',
        externalUrl: youtubeUrl,
      })
      setYoutubeModalOpen(false)
      setYoutubeUrl('')
      setYoutubeTitle('')
      Alert.alert('✓ Eklendi', 'YouTube transkripti çekiliyor, 30sn-2dk sürebilir.')
    } catch (e: any) {
      if (e.message?.includes('free_limit')) {
        Alert.alert('Limit', 'Free üyeler defter başına 5 kaynak ekleyebilir.')
      } else {
        Alert.alert('Hata', e.message)
      }
    }
  }

  return (
    <View className="flex-1">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
        {sources.length === 0 ? (
          <View className="py-16 items-center px-8">
            <Icon name="file" size={40} color="#CBD5E1" />
            <Text className="font-serif text-xl text-ink-900 mt-3">Henüz kaynak yok</Text>
            <Text className="text-sm text-slate-500 text-center mt-2">
              PDF, URL, ses dosyası, YouTube ya da metin ekle. AI hepsini öğrenir.
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {sources.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => {
                  if (s.source_type === 'youtube' && s.status === 'ready') {
                    router.push(`/notebook/${notebook.id}/source/${s.id}`)
                  }
                }}
                className="bg-white border border-slate-100 rounded-2xl p-3 flex-row items-center gap-3"
              >
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: sourceTypeBg(s.source_type) }}
                >
                  <Icon
                    name={sourceTypeIcon(s.source_type)}
                    size={18}
                    color={sourceTypeColor(s.source_type)}
                  />
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-ink-900 text-sm" numberOfLines={1}>
                    {s.title}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    <Text className="text-[10px] text-slate-500 uppercase font-mono">
                      {s.source_type}
                    </Text>
                    {s.status === 'ready' ? (
                      <View className="flex-row items-center gap-1">
                        <Icon name="check-circle" size={10} color="#10B981" />
                        <Text className="text-[10px] text-emerald-700">{s.chunk_count} parça</Text>
                      </View>
                    ) : s.status === 'processing' || s.status === 'pending' ? (
                      <View className="flex-row items-center gap-1">
                        <ActivityIndicator size="small" color="#F59E0B" />
                        <Text className="text-[10px] text-amber-700">İşleniyor...</Text>
                      </View>
                    ) : (
                      <Text className="text-[10px] text-red-500">⚠ Hata</Text>
                    )}
                  </View>
                  {s.error_message && (
                    <Text className="text-[10px] text-red-500 mt-0.5" numberOfLines={2}>
                      {s.error_message}
                    </Text>
                  )}
                </View>
                <Pressable
                  onPress={() => {
                    Alert.alert('Sil?', 'Bu kaynağı silmek istediğine emin misin?', [
                      { text: 'İptal', style: 'cancel' },
                      {
                        text: 'Sil',
                        style: 'destructive',
                        onPress: () => deleteSource.mutate({ id: s.id, notebookId: notebook.id }),
                      },
                    ])
                  }}
                  hitSlop={8}
                >
                  <Icon name="x" size={16} color="#94A3B8" />
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <Pressable
        onPress={() => setAddModalOpen(true)}
        className="absolute bottom-4 right-4 bg-ink-900 rounded-full px-5 py-3 flex-row items-center gap-2"
      >
        <Icon name="plus" size={16} color="#F59E0B" />
        <Text className="text-cream-50 font-semibold text-sm">Kaynak Ekle</Text>
      </Pressable>

      {/* Add type picker */}
      <Modal
        animationType="slide"
        transparent
        visible={addModalOpen}
        onRequestClose={() => setAddModalOpen(false)}
      >
        <Pressable
          onPress={() => setAddModalOpen(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <Pressable className="bg-cream-50 rounded-t-3xl pt-3 pb-8">
            <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-4" />
            <View className="px-5">
              <Text className="font-serif text-2xl text-ink-900 mb-4">Kaynak ekle</Text>
              <SourceTypeBtn
                icon="file"
                label="PDF"
                desc="Kitap, makale, ders notu"
                onPress={() => handlePickFile('pdf')}
              />
              <SourceTypeBtn
                icon="globe"
                label="Web Sayfası"
                desc="URL'den içerik"
                onPress={() => {
                  setAddModalOpen(false)
                  setUrlModalOpen(true)
                }}
              />
              <SourceTypeBtn
                icon="headphones"
                label="Ses Kaydı"
                desc="MP3/WAV — Whisper transkripti"
                onPress={() => handlePickFile('audio')}
              />
              <SourceTypeBtn
                icon="book-open"
                label="EPUB"
                desc="E-kitap"
                onPress={() => handlePickFile('epub')}
              />
              <SourceTypeBtn
                icon="edit"
                label="Düz Metin"
                desc="Kendi yazdığın notlar"
                onPress={() => {
                  setAddModalOpen(false)
                  setTextModalOpen(true)
                }}
              />
              <SourceTypeBtn
                icon="play"
                label="YouTube"
                desc="Video transkripti + zaman damgalı"
                onPress={() => {
                  setAddModalOpen(false)
                  setYoutubeModalOpen(true)
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Text input modal */}
      <Modal
        animationType="slide"
        transparent
        visible={textModalOpen}
        onRequestClose={() => setTextModalOpen(false)}
      >
        <Pressable
          onPress={() => setTextModalOpen(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <Pressable className="bg-cream-50 rounded-t-3xl pt-3 pb-8" style={{ maxHeight: '85%' }}>
            <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-4" />
            <View className="px-5">
              <Text className="font-serif text-2xl text-ink-900 mb-4">Düz Metin Ekle</Text>
              <TextInput
                placeholder="Başlık"
                value={textTitle}
                onChangeText={setTextTitle}
                className="bg-white border border-slate-200 rounded-xl px-3 py-3 text-base mb-3"
              />
              <TextInput
                placeholder="İçerik..."
                value={textContent}
                onChangeText={setTextContent}
                multiline
                numberOfLines={10}
                className="bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm"
                style={{ height: 200, textAlignVertical: 'top' }}
              />
              <Pressable
                onPress={handleAddText}
                disabled={createSource.isPending}
                className="bg-ink-900 rounded-full py-3 mt-4 items-center"
              >
                <Text className="text-cream-50 font-semibold">
                  {createSource.isPending ? 'Ekleniyor...' : 'Kaydet'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* URL modal */}
      <Modal
        animationType="slide"
        transparent
        visible={urlModalOpen}
        onRequestClose={() => setUrlModalOpen(false)}
      >
        <Pressable
          onPress={() => setUrlModalOpen(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <Pressable className="bg-cream-50 rounded-t-3xl pt-3 pb-8">
            <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-4" />
            <View className="px-5">
              <Text className="font-serif text-2xl text-ink-900 mb-4">Web Sayfası Ekle</Text>
              <TextInput
                placeholder="https://..."
                value={urlInput}
                onChangeText={setUrlInput}
                autoCapitalize="none"
                keyboardType="url"
                className="bg-white border border-slate-200 rounded-xl px-3 py-3 text-base mb-3"
              />
              <TextInput
                placeholder="Başlık (opsiyonel)"
                value={urlTitle}
                onChangeText={setUrlTitle}
                className="bg-white border border-slate-200 rounded-xl px-3 py-3 text-base"
              />
              <Pressable
                onPress={handleAddUrl}
                disabled={createSource.isPending}
                className="bg-ink-900 rounded-full py-3 mt-4 items-center"
              >
                <Text className="text-cream-50 font-semibold">
                  {createSource.isPending ? 'İndiriliyor...' : 'Ekle'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* YouTube modal */}
      <Modal
        animationType="slide"
        transparent
        visible={youtubeModalOpen}
        onRequestClose={() => setYoutubeModalOpen(false)}
      >
        <Pressable
          onPress={() => setYoutubeModalOpen(false)}
          className="flex-1 bg-black/40 justify-end"
        >
          <Pressable className="bg-cream-50 rounded-t-3xl pt-3 pb-8">
            <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-4" />
            <View className="px-5">
              <View className="flex-row items-center gap-2 mb-2">
                <Icon name="play" size={20} color="#DB2777" />
                <Text className="font-serif text-2xl text-ink-900">YouTube Ekle</Text>
              </View>
              <Text className="text-xs text-slate-500 mb-4">
                Video transkriptini çıkarır, zaman damgalı pasajlara böler. Cevaplarda [3:24] gibi
                linkler olur.
              </Text>

              <TextInput
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                autoCapitalize="none"
                keyboardType="url"
                className="bg-white border border-slate-200 rounded-xl px-3 py-3 text-base mb-3"
              />
              <TextInput
                placeholder="Başlık (opsiyonel)"
                value={youtubeTitle}
                onChangeText={setYoutubeTitle}
                className="bg-white border border-slate-200 rounded-xl px-3 py-3 text-base"
              />

              <View className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mt-4 flex-row gap-2">
                <Icon name="info" size={14} color="#F59E0B" />
                <Text className="flex-1 text-[11px] text-amber-900 leading-4">
                  Resmi altyazısı olan videolar saniyeler içinde işlenir. Yoksa otomatik AI
                  transkripti çıkartılır (1-2 dakika).
                </Text>
              </View>

              <Pressable
                onPress={handleAddYoutube}
                disabled={createSource.isPending}
                className="bg-ink-900 rounded-full py-3 mt-4 items-center"
              >
                <Text className="text-cream-50 font-semibold">
                  {createSource.isPending ? 'Ekleniyor...' : 'Ekle'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

function SourceTypeBtn({
  icon,
  label,
  desc,
  disabled,
  onPress,
}: {
  icon: IconName
  label: string
  desc: string
  disabled?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`bg-white border border-slate-100 rounded-2xl p-3 mb-2 flex-row items-center gap-3 ${disabled ? 'opacity-40' : ''}`}
    >
      <View className="w-10 h-10 bg-amber-50 rounded-xl items-center justify-center">
        <Icon name={icon} size={18} color="#F59E0B" />
      </View>
      <View className="flex-1">
        <Text className="font-semibold text-ink-900 text-sm">{label}</Text>
        <Text className="text-xs text-slate-500 mt-0.5">{desc}</Text>
      </View>
    </Pressable>
  )
}

function sourceTypeIcon(t: string): IconName {
  return t === 'pdf'
    ? 'file'
    : t === 'url'
      ? 'globe'
      : t === 'youtube'
        ? 'play'
        : t === 'audio'
          ? 'headphones'
          : t === 'text'
            ? 'edit'
            : t === 'epub'
              ? 'book-open'
              : 'file'
}

function sourceTypeColor(t: string): string {
  return t === 'pdf'
    ? '#EF4444'
    : t === 'url'
      ? '#0891B2'
      : t === 'youtube'
        ? '#DB2777'
        : t === 'audio'
          ? '#F59E0B'
          : t === 'text'
            ? '#7C3AED'
            : '#1E1B4B'
}

function sourceTypeBg(t: string): string {
  const c = sourceTypeColor(t)
  return `${c}22`
}
