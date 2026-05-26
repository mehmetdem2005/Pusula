import { Canvas, Path, Skia, useCanvasRef } from '@shopify/react-native-skia'
import { useRef, useState } from 'react'
import { Alert, Pressable, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { Icon } from '../ui/Icon'

/**
 * Apple Pencil / Stylus Handwriting Canvas
 * ==========================================
 *
 * iPad'de Apple Pencil ile el yazısı + parmak desteği.
 * react-native-skia ile pürüzsüz çizim, basınç hassas (force).
 *
 * Akış:
 *   1. User çizer → Skia path birikir
 *   2. "Tanı" butonu → canvas snapshot PNG
 *   3. PNG backend'e gönderilir → Gemini Vision OCR
 *   4. Çıkan metin chat input'una veya not'a düşer
 *
 * Kullanım yerleri:
 *   - Notebook chat: el yazısıyla soru yaz → AI cevap
 *   - Quick note: defter eklerken hızlı yazım
 *   - Math problem solver: el ile denklem yaz → çözüm
 */

interface PathData {
  path: any
  color: string
  width: number
}

interface Props {
  onRecognize?: (imageBase64: string) => void
  initialColor?: string
}

const COLORS = ['#1E1B4B', '#F59E0B', '#DC2626', '#10B981', '#0891B2']

export function HandwritingCanvas({ onRecognize, initialColor }: Props) {
  const canvasRef = useCanvasRef()
  const [paths, setPaths] = useState<PathData[]>([])
  const currentPath = useRef<any>(null)
  const [color, setColor] = useState(initialColor ?? '#1E1B4B')
  const [width, setWidth] = useState(3)

  // Apple Pencil basınç değerlerine duyarlı hover/touch detect
  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      const newPath = Skia.Path.Make()
      newPath.moveTo(e.x, e.y)
      currentPath.current = { path: newPath, color, width }
    })
    .onUpdate((e) => {
      if (currentPath.current) {
        currentPath.current.path.lineTo(e.x, e.y)
        // Force re-render: clone path
        runOnJS(setPaths)((prev) => {
          const updated = [...prev]
          if (updated[updated.length - 1] === currentPath.current) {
            return updated
          }
          return [...prev, currentPath.current]
        })
      }
    })
    .onEnd(() => {
      if (currentPath.current) {
        runOnJS((p: PathData) => setPaths((prev) => [...prev, p]))(currentPath.current)
        currentPath.current = null
      }
    })

  const undo = () => {
    setPaths((prev) => prev.slice(0, -1))
  }

  const clear = () => {
    setPaths([])
  }

  const handleRecognize = async () => {
    if (paths.length === 0) {
      Alert.alert('Boş', 'Önce bir şey yaz veya çiz.')
      return
    }
    const snapshot = canvasRef.current?.makeImageSnapshot()
    if (!snapshot) return

    const base64 = snapshot.encodeToBase64()
    onRecognize?.(base64)
  }

  return (
    <View className="flex-1 bg-white rounded-2xl overflow-hidden border border-slate-200">
      {/* Tools */}
      <View className="flex-row items-center justify-between px-3 py-2 border-b border-slate-100">
        <View className="flex-row gap-1.5">
          {COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              className={`w-6 h-6 rounded-full ${color === c ? 'border-2 border-ink-900' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </View>

        <View className="flex-row gap-1.5">
          {[2, 3, 5, 8].map((w) => (
            <Pressable
              key={w}
              onPress={() => setWidth(w)}
              className={`w-7 h-7 items-center justify-center rounded-full ${
                width === w ? 'bg-amber-500' : 'bg-slate-100'
              }`}
            >
              <View
                style={{ width: w, height: w, borderRadius: w / 2, backgroundColor: '#1E1B4B' }}
              />
            </Pressable>
          ))}
        </View>

        <View className="flex-row gap-1.5">
          <Pressable onPress={undo} className="p-1.5 bg-slate-100 rounded-full">
            <Icon name="undo" size={14} color="#1E1B4B" />
          </Pressable>
          <Pressable onPress={clear} className="p-1.5 bg-slate-100 rounded-full">
            <Icon name="trash" size={14} color="#DC2626" />
          </Pressable>
        </View>
      </View>

      {/* Canvas */}
      <View className="flex-1 bg-cream-50">
        <GestureDetector gesture={pan}>
          <Canvas ref={canvasRef} style={{ flex: 1 }}>
            {paths.map((p, i) => (
              <Path
                key={i}
                path={p.path}
                color={p.color}
                style="stroke"
                strokeWidth={p.width}
                strokeCap="round"
                strokeJoin="round"
              />
            ))}
          </Canvas>
        </GestureDetector>
      </View>

      {/* Recognize button */}
      {onRecognize && (
        <View className="p-2 border-t border-slate-100">
          <Pressable
            onPress={handleRecognize}
            disabled={paths.length === 0}
            className="bg-ink-900 rounded-full py-2.5 items-center flex-row justify-center gap-2"
          >
            <Icon name="sparkles" size={14} color="#F59E0B" />
            <Text className="text-cream-50 font-bold text-xs">Yazıyı Tanı</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}
