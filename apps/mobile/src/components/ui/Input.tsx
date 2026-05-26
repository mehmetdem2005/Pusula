import { TextInput as RNTextInput, Text, View } from 'react-native'
import type { TextInputProps } from 'react-native'

interface Props extends TextInputProps {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, ...props }: Props) {
  return (
    <View className="w-full mb-4">
      {label && <Text className="text-sm font-medium text-brand-950 mb-1.5">{label}</Text>}
      <RNTextInput
        {...props}
        placeholderTextColor="#94A3B8"
        className={[
          'h-12 px-4 rounded-xl border text-base text-brand-950 bg-white',
          error ? 'border-red-400' : 'border-slate-200',
        ].join(' ')}
      />
      {error ? (
        <Text className="text-xs text-red-500 mt-1">{error}</Text>
      ) : hint ? (
        <Text className="text-xs text-slate-500 mt-1">{hint}</Text>
      ) : null}
    </View>
  )
}
