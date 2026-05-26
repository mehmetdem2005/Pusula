import { useRef } from 'react'
import { useEffect } from 'react'
import { Animated, Easing, Pressable, Text, View } from 'react-native'

interface Props {
  isRecording: boolean
  isTranscribing: boolean
  duration: number
  onStart: () => void
  onStop: () => void
  onCancel?: () => void
  disabled?: boolean
}

export function MicButton({
  isRecording,
  isTranscribing,
  duration,
  onStart,
  onStop,
  disabled,
}: Props) {
  const pulse = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (isRecording) {
      const anim = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.25,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      )
      anim.start()
      return () => anim.stop()
    } else {
      pulse.setValue(1)
    }
  }, [isRecording, pulse])

  if (isTranscribing) {
    return (
      <View className="w-14 h-14 rounded-full bg-brand-50 items-center justify-center">
        <View className="w-6 h-6 rounded-full bg-brand-950 animate-pulse" />
      </View>
    )
  }

  return (
    <Pressable
      onPressIn={() => {
        if (!disabled) onStart()
      }}
      onPressOut={() => {
        if (isRecording) onStop()
      }}
      disabled={disabled}
      className="w-14 h-14 items-center justify-center"
    >
      {isRecording && (
        <Animated.View
          className="absolute w-14 h-14 rounded-full bg-red-500/30"
          style={{ transform: [{ scale: pulse }] }}
        />
      )}
      <View
        className={[
          'w-14 h-14 rounded-full items-center justify-center',
          isRecording ? 'bg-red-500' : disabled ? 'bg-slate-300' : 'bg-brand-950',
        ].join(' ')}
      >
        <Text style={{ fontSize: 24 }}>🎤</Text>
      </View>
      {isRecording && (
        <View className="absolute -top-8 bg-red-500 px-2 py-0.5 rounded-full">
          <Text className="text-white text-xs font-mono">{duration.toFixed(1)}s</Text>
        </View>
      )}
    </Pressable>
  )
}
