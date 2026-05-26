import { Audio } from 'expo-av'
import { Stack } from 'expo-router'
import { useRef, useState } from 'react'
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ProGuard } from '../../src/components/pro/ProGuard'
import { Button } from '../../src/components/ui/Button'
import { Input } from '../../src/components/ui/Input'
import {
  type VoiceClone,
  useCreateVoiceClone,
  useDeleteVoiceClone,
  useSetDefaultVoiceClone,
  useVoiceClones,
} from '../../src/hooks/useVoiceClones'

const REFERENCE_TEXT_TR =
  'Merhaba, ben Kavra için ses örneği veriyorum. Bu cümleyi olabildiğince doğal ve net bir tonda okuyorum. Sesim duru, tempolu ve kendi olağan tonumda. Birkaç farklı duraklamayla cümleyi tamamlıyorum.'

export default function VoiceClonesSettings() {
  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <Stack.Screen
        options={{
          title: 'Ses Klonları',
          headerStyle: { backgroundColor: '#FAFAFA' },
          headerTitleStyle: { color: '#1E1B4B', fontWeight: '600' },
        }}
      />
      <ProGuard
        feature="Voice Cloning"
        emoji="🎙️"
        description="Kendi sesini kaydet, AI o sesle anlatsın"
      >
        <VoiceClonesContent />
      </ProGuard>
    </SafeAreaView>
  )
}

function VoiceClonesContent() {
  const { data: clones, isLoading } = useVoiceClones()
  const setDefault = useSetDefaultVoiceClone()
  const deleteClone = useDeleteVoiceClone()
  const [recordOpen, setRecordOpen] = useState(false)

  return (
    <ScrollView className="flex-1 px-5 pt-4">
      <Text className="text-slate-500 mb-4">
        F5-TTS ile zero-shot ses klonlama. 30 saniyelik ses yeterli.
      </Text>

      <Button title="+ Yeni Klon Kaydet" onPress={() => setRecordOpen(true)} fullWidth />

      {isLoading ? (
        <ActivityIndicator color="#1E1B4B" style={{ marginVertical: 40 }} />
      ) : !clones || clones.length === 0 ? (
        <View className="py-8 items-center mt-4">
          <Text style={{ fontSize: 48 }}>🎙️</Text>
          <Text className="text-slate-500 text-center mt-2">
            Henüz klon yok. İlk sesini kaydet.
          </Text>
        </View>
      ) : (
        <View className="gap-2 mt-6">
          {clones.map((c) => (
            <View key={c.id} className="bg-white rounded-2xl p-4 border border-slate-100">
              <View className="flex-row items-center gap-3">
                <Text style={{ fontSize: 24 }}>🎙️</Text>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="font-semibold text-brand-950">{c.name}</Text>
                    {c.is_default && (
                      <View className="bg-brand-950 px-2 py-0.5 rounded-full">
                        <Text className="text-white text-xs font-bold">Varsayılan</Text>
                      </View>
                    )}
                  </View>
                  {c.description && (
                    <Text className="text-slate-500 text-xs mt-0.5">{c.description}</Text>
                  )}
                  <Text className="text-slate-400 text-xs mt-1">
                    {c.use_count} kullanım · {c.language.toUpperCase()}
                  </Text>
                </View>
                <View className="gap-1">
                  {!c.is_default && (
                    <Pressable
                      onPress={() => setDefault.mutate(c.id)}
                      className="px-2 py-1 bg-brand-50 rounded"
                    >
                      <Text className="text-brand-700 text-xs font-semibold">Varsayılan yap</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={() =>
                      Alert.alert('Sil', `"${c.name}" silinecek. Emin misin?`, [
                        { text: 'İptal', style: 'cancel' },
                        {
                          text: 'Sil',
                          style: 'destructive',
                          onPress: () => deleteClone.mutate(c.id),
                        },
                      ])
                    }
                    className="px-2 py-1"
                  >
                    <Text className="text-red-500 text-xs">Sil</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <View className="h-8" />

      <RecordCloneModal visible={recordOpen} onClose={() => setRecordOpen(false)} />
    </ScrollView>
  )
}

function RecordCloneModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [recordingUri, setRecordingUri] = useState<string | null>(null)
  const [duration, setDuration] = useState(0)
  const intervalRef = useRef<number | null>(null)
  const create = useCreateVoiceClone()

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync()
      if (!granted) {
        Alert.alert('İzin yok', 'Mikrofon izni gerekli')
        return
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      })

      const rec = new Audio.Recording()
      await rec.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          extension: '.wav',
          sampleRate: 16000,
          numberOfChannels: 1,
        },
        android: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.android,
          extension: '.wav',
          sampleRate: 16000,
          numberOfChannels: 1,
        },
      })
      await rec.startAsync()

      setRecording(rec)
      setDuration(0)
      intervalRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000) as unknown as number
    } catch (err: any) {
      Alert.alert('Hata', err.message)
    }
  }

  const stopRecording = async () => {
    if (!recording) return
    if (intervalRef.current) clearInterval(intervalRef.current)

    await recording.stopAndUnloadAsync()
    const uri = recording.getURI()
    setRecording(null)
    setRecordingUri(uri ?? null)
  }

  const submit = async () => {
    if (!recordingUri) {
      Alert.alert('', 'Önce kayıt yap')
      return
    }
    if (!name.trim()) {
      Alert.alert('', 'İsim gerekli')
      return
    }
    if (duration < 10) {
      Alert.alert('', 'En az 10 saniye olmalı (önerilen 30sn)')
      return
    }

    create.mutate(
      {
        audioUri: recordingUri,
        name: name.trim(),
        description: description.trim() || undefined,
        referenceText: REFERENCE_TEXT_TR,
        language: 'tr',
      },
      {
        onSuccess: () => {
          setName('')
          setDescription('')
          setRecordingUri(null)
          setDuration(0)
          onClose()
        },
        onError: (e: any) => Alert.alert('Hata', e.message),
      },
    )
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl p-6 pt-4 max-h-[90%]">
          <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-4" />
          <Text className="text-2xl font-serif text-brand-950 mb-1">Ses Klonu Kaydet</Text>
          <Text className="text-slate-500 text-sm mb-4">
            Aşağıdaki metni doğal bir tonda oku. ~30 saniye yeterli.
          </Text>

          {/* Reference text */}
          <View className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-4">
            <Text className="text-xs font-semibold text-brand-700 uppercase mb-2">Oku:</Text>
            <Text className="text-brand-950 leading-6">"{REFERENCE_TEXT_TR}"</Text>
          </View>

          {/* Recording UI */}
          <View className="items-center mb-4">
            {!recording && !recordingUri && (
              <Pressable
                onPress={startRecording}
                className="w-20 h-20 bg-red-500 rounded-full items-center justify-center"
              >
                <Text style={{ fontSize: 32 }}>🎙️</Text>
              </Pressable>
            )}
            {recording && (
              <Pressable
                onPress={stopRecording}
                className="w-20 h-20 bg-red-600 rounded-2xl items-center justify-center"
              >
                <Text style={{ fontSize: 32 }}>⏹</Text>
              </Pressable>
            )}
            {recordingUri && !recording && (
              <View className="items-center">
                <Text style={{ fontSize: 40 }}>✓</Text>
                <Text className="text-green-600 font-semibold mt-1">Kayıt hazır</Text>
                <Pressable onPress={startRecording} className="mt-2">
                  <Text className="text-brand-700 underline text-sm">Tekrar kaydet</Text>
                </Pressable>
              </View>
            )}
            <Text className="text-slate-500 text-sm mt-2">
              {recording
                ? '⏺ Kaydediliyor...'
                : recordingUri
                  ? `${duration}sn kaydedildi`
                  : 'Mikrofona dokun'}
            </Text>
            <Text className="text-2xl font-mono text-brand-950 mt-1">
              {String(Math.floor(duration / 60)).padStart(2, '0')}:
              {String(duration % 60).padStart(2, '0')}
            </Text>
          </View>

          {/* İsim/açıklama */}
          {recordingUri && (
            <>
              <Input
                label="İsim"
                value={name}
                onChangeText={setName}
                placeholder="Benim sesim, Babamın sesi..."
              />
              <Input
                label="Açıklama (ops.)"
                value={description}
                onChangeText={setDescription}
                placeholder="Notlar"
              />
            </>
          )}

          <View className="flex-row gap-3 mt-2">
            <View className="flex-1">
              <Button
                title="İptal"
                variant="secondary"
                onPress={onClose}
                disabled={create.isPending}
              />
            </View>
            <View className="flex-1">
              <Button
                title="Kaydet"
                onPress={submit}
                loading={create.isPending}
                disabled={!recordingUri || create.isPending}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}
