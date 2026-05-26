import Slider from '@react-native-community/slider'
import { Stack } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../src/components/ui/Button'
import { useProfile } from '../../src/hooks/useSubjects'
import { useTTS } from '../../src/hooks/useTTS'
import { supabase } from '../../src/lib/supabase'

type TTSMode = 'device' | 'server' | 'auto' | 'off'

const TTS_MODES: Array<{ value: TTSMode; label: string; desc: string; emoji: string }> = [
  {
    value: 'auto',
    label: 'Otomatik',
    desc: 'Kısa metin cihaz, uzun metin sunucu (önerilen)',
    emoji: '✨',
  },
  { value: 'device', label: 'Cihaz', desc: 'Hızlı, çevrimdışı, ücretsiz', emoji: '📱' },
  { value: 'server', label: 'Sunucu (Piper)', desc: 'En kaliteli, internet gerekli', emoji: '🎙️' },
  { value: 'off', label: 'Kapalı', desc: 'Sesli yanıt yok', emoji: '🔇' },
]

const VOICE_OPTIONS = [
  { id: 'tr_TR-dfki-medium', label: 'Türkçe — DFKI', gender: '👩' },
  { id: 'tr_TR-fettah-medium', label: 'Türkçe — Fettah', gender: '👨' },
]

export default function VoiceSettings() {
  const { data: profile } = useProfile()
  const prefs = (profile as any)?.user_preferences

  const [mode, setMode] = useState<TTSMode>(prefs?.tts_mode ?? 'auto')
  const [voice, setVoice] = useState<string>(prefs?.tts_voice ?? 'tr_TR-dfki-medium')
  const [speed, setSpeed] = useState<number>(prefs?.tts_speed ?? 1.0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (prefs) {
      setMode(prefs.tts_mode ?? 'auto')
      setVoice(prefs.tts_voice ?? 'tr_TR-dfki-medium')
      setSpeed(prefs.tts_speed ?? 1.0)
    }
  }, [prefs])

  const { speak, stop, isSpeaking } = useTTS({ language: 'tr', mode, voice, speed })

  const playSample = () => {
    if (isSpeaking) {
      stop()
    } else {
      speak(
        'Merhaba, ben Kavra. Sesli ders için hazırım. Bu sesin hızını ve tonunu ayarlardan değiştirebilirsin.',
      )
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setSaving(false)
      Alert.alert('', 'Oturum yok')
      return
    }
    const { error } = await supabase
      .from('user_preferences')
      .update({
        tts_mode: mode,
        tts_voice: voice,
        tts_speed: speed,
      })
      .eq('user_id', userData.user.id)
    setSaving(false)

    if (error) Alert.alert('Hata', error.message)
    else Alert.alert('✓', 'Ses ayarları kaydedildi')
  }

  if (!profile) {
    return (
      <SafeAreaView className="flex-1 bg-ink-50 items-center justify-center">
        <ActivityIndicator color="#1E1B4B" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-50">
      <Stack.Screen
        options={{
          title: 'Ses Ayarları',
          headerShown: true,
          headerStyle: { backgroundColor: '#FAFAFA' },
          headerTitleStyle: { color: '#1E1B4B', fontWeight: '600' },
        }}
      />

      <ScrollView className="flex-1 px-5 pt-4">
        {/* TTS Mode */}
        <Text className="text-xs font-semibold text-slate-400 uppercase mb-2 px-1">
          Yanıtları seslendirme
        </Text>
        <View className="gap-2">
          {TTS_MODES.map((m) => (
            <Pressable
              key={m.value}
              onPress={() => setMode(m.value)}
              className={[
                'rounded-xl p-4 border flex-row items-center gap-3',
                mode === m.value ? 'border-brand-950 bg-brand-50' : 'border-slate-100 bg-white',
              ].join(' ')}
            >
              <Text style={{ fontSize: 24 }}>{m.emoji}</Text>
              <View className="flex-1">
                <Text className="font-semibold text-brand-950">{m.label}</Text>
                <Text className="text-xs text-slate-500 mt-0.5">{m.desc}</Text>
              </View>
              {mode === m.value && <Text className="text-brand-950 text-xl">✓</Text>}
            </Pressable>
          ))}
        </View>

        {/* Voice */}
        {mode !== 'off' && mode !== 'device' && (
          <>
            <Text className="text-xs font-semibold text-slate-400 uppercase mb-2 mt-6 px-1">
              Sunucu sesi (Piper)
            </Text>
            <View className="gap-2">
              {VOICE_OPTIONS.map((v) => (
                <Pressable
                  key={v.id}
                  onPress={() => setVoice(v.id)}
                  className={[
                    'rounded-xl p-3 border flex-row items-center gap-3',
                    voice === v.id ? 'border-brand-950 bg-brand-50' : 'border-slate-100 bg-white',
                  ].join(' ')}
                >
                  <Text style={{ fontSize: 22 }}>{v.gender}</Text>
                  <Text className="flex-1 text-brand-950 font-medium">{v.label}</Text>
                  {voice === v.id && <Text className="text-brand-950 text-xl">✓</Text>}
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Speed */}
        {mode !== 'off' && (
          <>
            <View className="flex-row justify-between items-center mt-6 mb-2 px-1">
              <Text className="text-xs font-semibold text-slate-400 uppercase">Konuşma hızı</Text>
              <Text className="text-sm text-brand-950 font-mono">{speed.toFixed(2)}x</Text>
            </View>
            <View className="bg-white rounded-xl p-4 border border-slate-100">
              <Slider
                value={speed}
                minimumValue={0.5}
                maximumValue={2.0}
                step={0.1}
                onValueChange={setSpeed}
                minimumTrackTintColor="#1E1B4B"
                maximumTrackTintColor="#CBD5E1"
                thumbTintColor="#1E1B4B"
              />
              <View className="flex-row justify-between mt-1">
                <Text className="text-xs text-slate-400">0.5x</Text>
                <Text className="text-xs text-slate-400">1x</Text>
                <Text className="text-xs text-slate-400">2x</Text>
              </View>
            </View>

            {/* Önizleme */}
            <Pressable
              onPress={playSample}
              className="mt-4 bg-white rounded-xl p-4 border border-brand-200 flex-row items-center justify-center gap-2"
            >
              <Text style={{ fontSize: 18 }}>{isSpeaking ? '⏸' : '▶️'}</Text>
              <Text className="text-brand-950 font-semibold">
                {isSpeaking ? 'Durdur' : 'Önizleme dinle'}
              </Text>
            </Pressable>
          </>
        )}

        <View className="mt-6 mb-8">
          <Button title="Kaydet" onPress={handleSave} loading={saving} fullWidth size="lg" />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
