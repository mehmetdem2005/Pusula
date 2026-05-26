import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native'
import { supabase } from '../../lib/supabase'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Input } from '../ui/Input'

interface Props {
  visible: boolean
  onClose: () => void
  subjectId: string
  subjectName: string
  subjectColor: string
}

const DIFFICULTY_LABELS = ['Kolay', 'Orta', 'Karışık', 'Zor', 'Çok zor']

export function ConceptCreator({ visible, onClose, subjectId, subjectName, subjectColor }: Props) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [difficulty, setDifficulty] = useState(2) // 1-5
  const [loading, setLoading] = useState(false)

  const reset = () => {
    setName('')
    setDescription('')
    setDifficulty(2)
  }

  const handleCreate = async () => {
    if (!name.trim()) return Alert.alert('İsim gerekli')

    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) throw new Error('Oturum yok')

      const { error } = await supabase.from('concepts').insert({
        user_id: userData.user.id,
        subject_id: subjectId,
        name: name.trim(),
        description: description.trim() || null,
        difficulty,
      })

      if (error) throw error
      qc.invalidateQueries({ queryKey: ['concepts', subjectId] })
      reset()
      onClose()
    } catch (e: any) {
      Alert.alert('Hata', e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-cream-50 rounded-t-3xl pt-4 pb-8" style={{ maxHeight: '85%' }}>
            <View className="w-12 h-1 bg-slate-200 rounded-full self-center mb-3" />

            <View className="flex-row items-center justify-between px-6 mb-2">
              <View className="flex-1">
                <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase">
                  {subjectName} altında
                </Text>
                <Text className="font-serif text-2xl text-ink-900">
                  Yeni{' '}
                  <Text className="italic" style={{ color: subjectColor }}>
                    kavram
                  </Text>
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={12}>
                <Icon name="x" size={24} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12 }}>
              <Input
                label="KAVRAM ADI"
                value={name}
                onChangeText={setName}
                placeholder="Örn: Perfekt zaman, Türev, Matris çarpımı..."
              />

              <View className="mt-3">
                <Input
                  label="AÇIKLAMA (OPS.)"
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Kısaca neyi içeriyor?"
                  multiline
                />
              </View>

              <View className="mt-5">
                <Text className="font-mono text-[9px] text-slate-500 tracking-widest uppercase mb-2">
                  ZORLUK SEVİYESİ
                </Text>
                <View className="flex-row gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => setDifficulty(n)}
                      className={`flex-1 py-3 rounded-xl border ${
                        difficulty >= n
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <View className="items-center">
                        <Icon
                          name="star"
                          size={16}
                          color={difficulty >= n ? '#F59E0B' : '#CBD5E1'}
                          fill={difficulty >= n ? '#F59E0B' : 'none'}
                        />
                      </View>
                    </Pressable>
                  ))}
                </View>
                <Text className="text-xs text-slate-500 mt-2 text-center">
                  {DIFFICULTY_LABELS[difficulty - 1]}
                </Text>
              </View>

              <View className="mt-6">
                <Button
                  title="Kavramı Oluştur"
                  onPress={handleCreate}
                  loading={loading}
                  disabled={!name.trim()}
                  fullWidth
                />
              </View>

              <Text className="text-[10px] text-slate-500 text-center mt-3 leading-4">
                Kavramı oluşturduktan sonra Kavra ile sohbete başlayabilir,{'\n'}
                sınav tarihi belirleyebilir, harita üzerinde diğer kavramlarla bağlayabilirsin.
              </Text>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
