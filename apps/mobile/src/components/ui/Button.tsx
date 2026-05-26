import { ActivityIndicator, Pressable, Text } from 'react-native'
import type { PressableProps } from 'react-native'

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent'
type Size = 'sm' | 'md' | 'lg'

interface Props extends PressableProps {
  title: string
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  icon?: string
}

const variantStyles: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: 'bg-brand-950', text: 'text-white' },
  secondary: { bg: 'bg-brand-50', text: 'text-brand-950', border: 'border border-brand-200' },
  ghost: { bg: '', text: 'text-brand-950' },
  accent: { bg: 'bg-accent-500', text: 'text-white' },
}

const sizeStyles: Record<Size, { pad: string; text: string; height: string }> = {
  sm: { pad: 'px-3', text: 'text-sm', height: 'h-9' },
  md: { pad: 'px-4', text: 'text-base', height: 'h-11' },
  lg: { pad: 'px-5', text: 'text-lg', height: 'h-14' },
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  icon: _icon,
  ...props
}: Props) {
  const v = variantStyles[variant]
  const s = sizeStyles[size]
  const isDisabled = disabled || loading

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      className={[
        'flex-row items-center justify-center rounded-xl',
        v.bg,
        v.border ?? '',
        s.pad,
        s.height,
        fullWidth ? 'w-full' : '',
        isDisabled ? 'opacity-50' : '',
      ].join(' ')}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'accent' ? 'white' : '#1E1B4B'}
        />
      ) : (
        <Text className={`font-semibold ${v.text} ${s.text}`}>{title}</Text>
      )}
    </Pressable>
  )
}
