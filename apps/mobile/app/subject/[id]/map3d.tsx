import { Canvas, useFrame, useThree } from '@react-three/fiber/native'
import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as THREE from 'three'
import { ProGuard } from '../../../src/components/pro/ProGuard'
import { type ConceptWithProgress, useConcepts } from '../../../src/hooks/useConcepts'
import { useSubject } from '../../../src/hooks/useSubjects'

interface Node3D {
  id: string
  pos: THREE.Vector3
  vel: THREE.Vector3
  radius: number
  concept: ConceptWithProgress
}

interface Edge3D {
  from: string
  to: string
}

/**
 * 3D force-directed layout (Coulomb + Hooke + center gravity).
 * Iteratif simulation, 3 boyutta. Layout sabitlenir, sonra orbit kontrolü.
 */
function simulate3D(concepts: ConceptWithProgress[]): { nodes: Node3D[]; edges: Edge3D[] } {
  const nodes: Node3D[] = concepts.map((c, i) => {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / concepts.length)
    const theta = Math.PI * (1 + Math.sqrt(5)) * i // golden angle
    const r = 5
    const mastery = c.progress?.mastery_score ?? 0
    return {
      id: c.id,
      pos: new THREE.Vector3(
        r * Math.cos(theta) * Math.sin(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(phi),
      ),
      vel: new THREE.Vector3(),
      radius: 0.4 + (mastery / 100) * 0.4,
      concept: c,
    }
  })

  const edges: Edge3D[] = []
  for (const c of concepts) {
    for (const prereq of c.prerequisites ?? []) {
      if (concepts.some((x) => x.id === prereq)) {
        edges.push({ from: prereq, to: c.id })
      }
    }
  }

  const REPULSION = 8
  const ATTRACTION = 0.05
  const DAMPING = 0.85
  const CENTER_GRAVITY = 0.02

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  for (let iter = 0; iter < 150; iter++) {
    // Repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!
        const b = nodes[j]!
        const diff = new THREE.Vector3().subVectors(b.pos, a.pos)
        const dist = diff.length() + 0.1
        const force = REPULSION / (dist * dist)
        diff.normalize().multiplyScalar(force)
        a.vel.sub(diff)
        b.vel.add(diff)
      }
    }

    // Attraction (edges)
    for (const e of edges) {
      const a = nodeMap.get(e.from)
      const b = nodeMap.get(e.to)
      if (!a || !b) continue
      const diff = new THREE.Vector3().subVectors(b.pos, a.pos)
      diff.multiplyScalar(ATTRACTION)
      a.vel.add(diff)
      b.vel.sub(diff)
    }

    // Center gravity
    for (const n of nodes) {
      const toCenter = new THREE.Vector3().sub(n.pos).multiplyScalar(CENTER_GRAVITY)
      n.vel.add(toCenter)
    }

    // Apply
    for (const n of nodes) {
      n.vel.multiplyScalar(DAMPING)
      n.pos.add(n.vel)
    }
  }

  return { nodes, edges }
}

function colorForMastery(score: number, fallback: string): string {
  if (score > 70) return '#10B981'
  if (score > 40) return '#F59E0B'
  return fallback
}

/** Tek bir kavram küresi */
function ConceptSphere({
  node,
  isSelected,
  fallbackColor,
  onPress,
}: {
  node: Node3D
  isSelected: boolean
  fallbackColor: string
  onPress: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const mastery = node.concept.progress?.mastery_score ?? 0
  const color = colorForMastery(mastery, fallbackColor)

  // Hafif yavaş dönüş animasyonu
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2
      if (isSelected) {
        meshRef.current.rotation.x += delta * 0.3
      }
    }
  })

  return (
    <mesh
      ref={meshRef}
      position={[node.pos.x, node.pos.y, node.pos.z]}
      onClick={(e) => {
        e.stopPropagation()
        onPress()
      }}
    >
      <sphereGeometry args={[node.radius, 24, 24]} />
      <meshStandardMaterial
        color={color}
        emissive={isSelected ? color : '#000000'}
        emissiveIntensity={isSelected ? 0.5 : 0}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  )
}

/** Edge çizgileri */
function ConceptEdges({ nodes, edges }: { nodes: Node3D[]; edges: Edge3D[] }) {
  const lineGeometry = useMemo(() => {
    const points: number[] = []
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))
    for (const e of edges) {
      const a = nodeMap.get(e.from)
      const b = nodeMap.get(e.to)
      if (!a || !b) continue
      points.push(a.pos.x, a.pos.y, a.pos.z, b.pos.x, b.pos.y, b.pos.z)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return geometry
  }, [nodes, edges])

  return (
    <lineSegments geometry={lineGeometry}>
      <lineBasicMaterial color="#64748B" opacity={0.5} transparent />
    </lineSegments>
  )
}

/** Otomatik kamera orbit */
function AutoOrbit() {
  const { camera } = useThree()
  const angleRef = useRef(0)

  useFrame((_, delta) => {
    angleRef.current += delta * 0.15
    const radius = 12
    camera.position.x = Math.cos(angleRef.current) * radius
    camera.position.z = Math.sin(angleRef.current) * radius
    camera.position.y = 3 + Math.sin(angleRef.current * 0.5) * 2
    camera.lookAt(0, 0, 0)
  })

  return null
}

export default function ConceptMap3D() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { data: subject } = useSubject(id ?? null)
  const { data: concepts, isLoading } = useConcepts(id ?? null)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const layout = useMemo(() => {
    if (!concepts || concepts.length === 0) return null
    return simulate3D(concepts)
  }, [concepts])

  const selectedConcept = selectedId ? concepts?.find((c) => c.id === selectedId) : null

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['bottom']}>
      <Stack.Screen
        options={{
          title: '3D Harita',
          headerTransparent: true,
          headerTintColor: '#FFFFFF',
        }}
      />

      <ProGuard
        feature="3D Concept Map"
        emoji="🌐"
        description="Kavramlarını 3 boyutta keşfet, orbit kamera"
      >
        {isLoading || !concepts ? (
          <View className="flex-1 items-center justify-center bg-black">
            <ActivityIndicator color="#FFFFFF" />
          </View>
        ) : concepts.length === 0 ? (
          <View className="flex-1 items-center justify-center bg-black p-8">
            <Text style={{ fontSize: 48 }}>🌐</Text>
            <Text className="text-white text-lg mt-4">3D harita için kavram ekle</Text>
          </View>
        ) : layout ? (
          <View style={{ flex: 1 }}>
            <Canvas
              camera={{ position: [10, 5, 10], fov: 60 }}
              style={{ flex: 1, backgroundColor: '#0A0A1A' }}
            >
              <Suspense fallback={null}>
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={1} />
                <pointLight position={[-10, -5, 5]} intensity={0.5} color="#A78BFA" />

                <ConceptEdges nodes={layout.nodes} edges={layout.edges} />

                {layout.nodes.map((n) => (
                  <ConceptSphere
                    key={n.id}
                    node={n}
                    isSelected={n.id === selectedId}
                    fallbackColor={subject?.color ?? '#1E1B4B'}
                    onPress={() => setSelectedId(n.id === selectedId ? null : n.id)}
                  />
                ))}

                {!selectedId && <AutoOrbit />}
              </Suspense>
            </Canvas>

            {/* Detail card */}
            {selectedConcept && (
              <View className="absolute bottom-6 left-4 right-4 bg-white/95 rounded-2xl p-4 border border-white/30">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Text className="font-bold text-brand-950 text-lg">{selectedConcept.name}</Text>
                    {selectedConcept.description && (
                      <Text className="text-slate-600 text-sm mt-1" numberOfLines={2}>
                        {selectedConcept.description}
                      </Text>
                    )}
                    <Text className="text-xs text-slate-500 mt-2">
                      Mastery: %{Math.round(selectedConcept.progress?.mastery_score ?? 0)} ·{' '}
                      {'⭐'.repeat(selectedConcept.difficulty)}
                    </Text>
                  </View>
                  <Pressable onPress={() => setSelectedId(null)} className="p-1">
                    <Text className="text-slate-400 text-xl">✕</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Controls hint */}
            <View className="absolute top-16 right-4 bg-white/10 rounded-lg p-2">
              <Text className="text-white/70 text-[10px]">
                {selectedId ? 'X ile bırak' : '🌀 Otomatik orbit'}
              </Text>
            </View>
          </View>
        ) : null}
      </ProGuard>
    </SafeAreaView>
  )
}
