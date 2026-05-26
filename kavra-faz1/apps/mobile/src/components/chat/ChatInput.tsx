import { useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'

interface Props {
  onSend: (text: string) => void
  onCancel?: () => void
  isStreaming: boolean
  placeholder?: string
  disabled?: boolean
}

export function ChatInput({ onSend, onCancel, isStreaming, placeholder, disabled }: Props) {
  const [text, setText] = useState('')

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming || disabled) return
    onSend(trimmed)
    setText('')
  }

  return (
    <View className="border-t border-slate-200 bg-white px-3 py-3">
      <View className="flex-row items-end gap-2">
        <View className="flex-1 bg-slate-100 rounded-2xl px-4 py-2 min-h-[44px] justify-center">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder ?? 'Mesajını yaz...'}
            placeholderTextColor="#94A3B8"
            multiline
            className="text-base text-brand-950 max-h-32"
            editable={!disabled}
          />
        </View>

        {isStreaming ? (
          <Pressable
            onPress={onCancel}
            className="w-11 h-11 rounded-full bg-red-500 items-center justify-center"
          >
            <Text className="text-white text-lg">■</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleSend}
            disabled={!text.trim() || disabled}
            className={[
              'w-11 h-11 rounded-full items-center justify-center',
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
