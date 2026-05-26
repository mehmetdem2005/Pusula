import { Text, View } from 'react-native'

interface Props {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  streaming?: boolean
}

export function MessageBubble({ role, content, streaming }: Props) {
  if (role === 'system' || role === 'tool') return null

  const isUser = role === 'user'

  return (
    <View className={`mb-3 px-4 ${isUser ? 'items-end' : 'items-start'}`}>
      <View
        className={[
          'max-w-[85%] rounded-2xl px-4 py-3',
          isUser ? 'bg-brand-950 rounded-br-md' : 'bg-white border border-slate-100 rounded-bl-md',
        ].join(' ')}
      >
        <Text
          className={
            isUser ? 'text-white text-base leading-6' : 'text-brand-950 text-base leading-6'
          }
          selectable
        >
          {content}
          {streaming && <Text className={isUser ? 'text-white/50' : 'text-slate-400'}> ▍</Text>}
        </Text>
      </View>
    </View>
  )
}
