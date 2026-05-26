import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { useVoiceInput } from '../../hooks/useVoiceInput'
import { MicButton } from '../voice/MicButton'

interface Props {
  onSend: (text: string) => void
  onCancel?: () => void
  isStreaming: boolean
  placeholder?: string
  disabled?: boolean
  lessonId?: string
  voiceLanguage?: string
}

export function ChatInput({
  onSend,
  onCancel,
  isStreaming,
  placeholder,
  disabled,
  lessonId,
  voiceLanguage,
}: Props) {
  const [text, setText] = useState('')

  const { start, stop, cancel, isRecording, isTranscribing, duration, error } = useVoiceInput({
    language: voiceLanguage,
    lessonId,
    onTranscribed: (transcription) => {
      onSend(transcription)
    },
  })

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming || disabled) return
    onSend(trimmed)
    setText('')
  }

  const showMic = !text.trim() && !isStreaming

  return (
    <View className="border-t border-slate-200 bg-white">
      {error && (
        <View className="px-4 py-2 bg-red-50 border-b border-red-100">
          <Text className="text-red-700 text-xs">🎤 {error}</Text>
        </View>
      )}
      {isTranscribing && (
        <View className="px-4 py-2 bg-brand-50 border-b border-brand-100 flex-row items-center gap-2">
          <ActivityIndicator size="small" color="#1E1B4B" />
          <Text className="text-brand-900 text-xs">Dinlediğim çevriliyor...</Text>
        </View>
      )}

      <View className="px-3 py-3 flex-row items-end gap-2">
        <View className="flex-1 bg-slate-100 rounded-2xl px-4 py-2 min-h-[44px] justify-center">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={
              isRecording
                ? '🎤 Dinliyorum...'
                : (placeholder ?? 'Mesajını yaz veya mikrofona bas...')
            }
            placeholderTextColor={isRecording ? '#EF4444' : '#94A3B8'}
            multiline
            className="text-base text-brand-950 max-h-32"
            editable={!disabled && !isRecording}
          />
        </View>

        {showMic ? (
          <MicButton
            isRecording={isRecording}
            isTranscribing={isTranscribing}
            duration={duration}
            onStart={start}
            onStop={stop}
            onCancel={cancel}
            disabled={disabled || isTranscribing}
          />
        ) : isStreaming ? (
          <Pressable
            onPress={onCancel}
            className="w-14 h-14 rounded-full bg-red-500 items-center justify-center"
          >
            <Text className="text-white text-lg">■</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || disabled}
            className={[
              'w-14 h-14 rounded-full items-center justify-center',
              !text.trim() || disabled ? 'bg-slate-300' : 'bg-brand-950',
            ].join(' ')}
          >
            {disabled ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text className="text-white text-lg">↑</Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  )
}
