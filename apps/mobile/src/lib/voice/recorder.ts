import { Audio } from 'expo-av'
import * as FileSystem from 'expo-file-system'

export interface RecordingResult {
  uri: string
  duration: number
  size: number
}

/**
 * Ses kayıt için yönetici sınıf. Push-to-talk ve continuous mode için.
 */
export class VoiceRecorder {
  private recording: Audio.Recording | null = null
  private startedAt = 0

  async requestPermission(): Promise<boolean> {
    const { status } = await Audio.requestPermissionsAsync()
    return status === 'granted'
  }

  async start(): Promise<void> {
    if (this.recording) {
      throw new Error('Kayıt zaten devam ediyor')
    }

    // Audio mode ayarı (iOS/Android uyumlu)
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    })

    const { recording } = await Audio.Recording.createAsync({
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.MEDIUM,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 64000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 64000,
      },
    })

    this.recording = recording
    this.startedAt = Date.now()
  }

  async stop(): Promise<RecordingResult> {
    if (!this.recording) {
      throw new Error('Aktif kayıt yok')
    }

    await this.recording.stopAndUnloadAsync()
    const uri = this.recording.getURI()
    if (!uri) throw new Error('Kayıt URI alınamadı')

    const info = await FileSystem.getInfoAsync(uri)
    const duration = (Date.now() - this.startedAt) / 1000

    this.recording = null
    this.startedAt = 0

    // Audio mode'u reset
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    })

    return {
      uri,
      duration,
      size: (info as any).size ?? 0,
    }
  }

  async cancel(): Promise<void> {
    if (!this.recording) return
    try {
      await this.recording.stopAndUnloadAsync()
      const uri = this.recording.getURI()
      if (uri) await FileSystem.deleteAsync(uri, { idempotent: true })
    } catch {
      // ignore
    }
    this.recording = null
    this.startedAt = 0
  }

  isRecording(): boolean {
    return this.recording !== null
  }

  getCurrentDuration(): number {
    return this.recording ? (Date.now() - this.startedAt) / 1000 : 0
  }
}

export const voiceRecorder = new VoiceRecorder()
