import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Dimensions, PanResponder, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle, Line, Text as SvgText, G } from 'react-native-svg'
import { type ConceptWithProgress, useConcepts } from '../../../src/hooks/useConcepts'
import { useSubject } from '../../../src/hooks/useSubjects'

const { width, height } = Dimensions.get('window')
const MAP_HEIGHT = height - 200

interface Node {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  concept: ConceptWithProgress
}

interface Edge {
  from: string
  to: string
}

/**
 * Basit force-directed layout:
 * - Repulsion: tüm node'lar birbirinden iter (Coulomb)
 * - Attraction: edge'ler bağladıklarını çeker (Hooke)
 * - Center gravity: hepsini merkeze çeker
 *
 * Performans için 60 iterasyon yeterli — layout stabilize olur.
 */
function simulateLayout(
  concepts: ConceptWithProgress[],
  centerX: number,
  centerY: number,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = concepts.map((c, i) => {
    const angle = (i / concepts.length) * Math.PI * 2
    const r = Math.min(centerX, centerY) * 0.4
    const mastery = c.progress?.mastery_score ?? 0
    return {
      id: c.id,
      x: centerX + Math.cos(angle) * r + (Math.random() - 0.5) * 20,
      y: centerY + Math.sin(angle) * r + (Math.random() - 0.5) * 20,
      vx: 0,
      vy: 0,
      radius: 20 + (mastery / 100) * 20, // Mastery arttıkça node büyür
      concept: c,
    }
  })

  // Edges: prerequisite relationships
  const edges: Edge[] = []
  for (const c of concepts) {
    for (const prereqId of c.prerequisites ?? []) {
      if (concepts.some((x) => x.id === prereqId)) {
        edges.push({ from: prereqId, to: c.id })
      }
    }
  }

  // Node map
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  const REPULSION = 8000
  const ATTRACTION = 0.005
  const DAMPING = 0.85
  const CENTER_GRAVITY = 0.01

  for (let iter = 0; iter < 120; iter++) {
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!
        const b = nodes[j]!
        const dx = b.x - a.x
        const dy = b.y - a.y
        const distSq = dx * dx + dy * dy + 0.1
        const dist = Math.sqrt(distSq)
        const force = REPULSION / distSq
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        a.vx -= fx
        a.vy -= fy
        b.vx += fx
        b.vy += fy
      }
    }

    // Attraction (edges)
    for (const edge of edges) {
      const a = nodeMap.get(edge.from)
      const b = nodeMap.get(edge.to)
      if (!a || !b) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const force = ATTRACTION
      a.vx += dx * force
      a.vy += dy * force
      b.vx -= dx * force
      b.vy -= dy * force
    }

    // Center gravity
    for (const n of nodes) {
      n.vx += (centerX - n.x) * CENTER_GRAVITY
      n.vy += (centerY - n.y) * CENTER_GRAVITY
    }

    // Apply velocity + damping
    for (const n of nodes) {
      n.vx *= DAMPING
      n.vy *= DAMPING
      n.x += n.vx
      n.y += n.vy
      // Sınırları kontrol et
      n.x = Math.max(n.radius, Math.min(width - n.radius, n.x))
      n.y = Math.max(n.radius, Math.min(MAP_HEIGHT - n.radius, n.y))
    }
  }

  return { nodes, edges }
}

function colorForMastery(score: number, baseColor: string): string {
  if (score > 70) return '#059669' // Yeşil — iyi
  if (score > 40) return '#F59E0B' // Amber — orta
  return baseColor // Ana renk — yeni
}

export default function ConceptMap() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: subject } = useSubject(id ?? null)
  const { data: concepts, isLoading } = useConcepts(id ?? null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const layout = useMemo(() => {
    if (!concepts || concepts.length === 0) return null
    return simulateLayout(concepts, width / 2, MAP_HEIGHT / 2)
  }, [concepts])

  const selectedConcept = selectedId ? concepts?.find((c) => c.id === selectedId) : null

  return (
    <SafeAreaView className="flex-1 bg-ink-50" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Kavram Haritası',
          headerTitleStyle: { color: '#1E1B4B', fontWeight: '600' },
        }}
      />

      {isLoading || !concepts ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-500">Yükleniyor...</Text>
        </View>
      ) : concepts.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8">
          <Text style={{ fontSize: 48 }}>🗺️</Text>
          <Text className="text-lg font-serif text-brand-950 mt-4 text-center">
            Harita için kavram ekle
          </Text>
          <Text className="text-slate-500 text-center mt-2">
            Bu konuya kavram ekledikçe burada ağ halinde bağlantılarını göreceksin.
          </Text>
        </View>
      ) : layout ? (
        <View style={{ flex: 1 }}>
          <Svg width={width} height={MAP_HEIGHT}>
            {/* Edges (önce çiz ki node'lar üstte kalsın) */}
            {layout.edges.map((e, i) => {
              const a = layout.nodes.find((n) => n.id === e.from)
              const b = layout.nodes.find((n) => n.id === e.to)
              if (!a || !b) return null
              return (
                <Line
                  key={`e-${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#CBD5E1"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
              )
            })}

            {/* Nodes */}
            {layout.nodes.map((n) => {
              const mastery = n.concept.progress?.mastery_score ?? 0
              const isSelected = n.id === selectedId
              const fill = colorForMastery(mastery, subject?.color ?? '#1E1B4B')

              return (
                <G key={n.id} onPress={() => setSelectedId(n.id === selectedId ? null : n.id)}>
                  {isSelected && (
                    <Circle
                      cx={n.x}
                      cy={n.y}
                      r={n.radius + 6}
                      fill="none"
                      stroke={fill}
                      strokeWidth={3}
                    />
                  )}
                  <Circle cx={n.x} cy={n.y} r={n.radius} fill={fill} opacity={0.9} />
                  <SvgText
                    x={n.x}
                    y={n.y + n.radius + 14}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#1E1B4B"
                    fontWeight="600"
                  >
                    {n.concept.name.length > 15
                      ? n.concept.name.slice(0, 14) + '…'
                      : n.concept.name}
                  </SvgText>
                </G>
              )
            })}
          </Svg>

          {/* Detail card */}
          {selectedConcept && (
            <View
              className="absolute bottom-4 left-4 right-4 bg-white rounded-2xl p-4 border border-slate-200"
              style={{ elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 }}
            >
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="font-bold text-brand-950 text-lg">{selectedConcept.name}</Text>
                  {selectedConcept.description && (
                    <Text className="text-slate-600 text-sm mt-1" numberOfLines={2}>
                      {selectedConcept.description}
                    </Text>
                  )}
                  <View className="flex-row items-center gap-3 mt-2">
                    <Text className="text-xs text-slate-500">
                      Mastery: %{Math.round(selectedConcept.progress?.mastery_score ?? 0)}
                    </Text>
                    <Text className="text-xs text-slate-500">
                      {'⭐'.repeat(selectedConcept.difficulty)}
                    </Text>
                  </View>
                </View>
                <Pressable onPress={() => setSelectedId(null)} className="p-2">
                  <Text className="text-slate-400 text-xl">✕</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Legend */}
          <View className="absolute top-2 right-4 bg-white/90 rounded-lg p-2 border border-slate-100">
            <Text className="text-[10px] font-semibold text-slate-500 uppercase mb-1">Renk</Text>
            <View className="gap-0.5">
              <LegendRow color="#059669" label=">%70" />
              <LegendRow color="#F59E0B" label="%40-70" />
              <LegendRow color={subject?.color ?? '#1E1B4B'} label="Yeni" />
            </View>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  )
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1.5">
      <View className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <Text className="text-[10px] text-slate-600">{label}</Text>
    </View>
  )
}
