/**
 * Microsoft Edge TTS — Ücretsiz Neural TTS
 * ==========================================
 *
 * Microsoft'un Edge tarayıcısında kullanılan TTS API'si — gerçekten kaliteli
 * neural sesler, ücretsiz, rate limit yok.
 *
 * Türkçe sesler:
 * - tr-TR-EmelNeural (kadın)
 * - tr-TR-AhmetNeural (erkek)
 *
 * İngilizce ve diğer 70+ dil mevcut.
 *
 * NOT: Bu Microsoft'un public API'si değil — Edge tarayıcı kullanıyor.
 * Production için ücretli Azure TTS önerilir, ama Free tier için bu yeterli.
 *
 * Kavra free tier: Edge TTS
 * Kavra Pro: ElevenLabs (kaliteli) ya da Voice Cloning (F5-TTS)
 */

import crypto from 'node:crypto'
import { WebSocket } from 'ws'

const EDGE_TTS_TRUSTED_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4'
const EDGE_TTS_WSS_URL =
  'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=' +
  EDGE_TTS_TRUSTED_TOKEN

export interface EdgeTTSVoice {
  shortName: string
  displayName: string
  gender: 'Male' | 'Female'
  locale: string
  styles?: string[]
}

export const TURKISH_VOICES: EdgeTTSVoice[] = [
  { shortName: 'tr-TR-EmelNeural', displayName: 'Emel', gender: 'Female', locale: 'tr-TR' },
  { shortName: 'tr-TR-AhmetNeural', displayName: 'Ahmet', gender: 'Male', locale: 'tr-TR' },
]

export const ENGLISH_VOICES: EdgeTTSVoice[] = [
  {
    shortName: 'en-US-AvaMultilingualNeural',
    displayName: 'Ava (Multilingual)',
    gender: 'Female',
    locale: 'en-US',
  },
  {
    shortName: 'en-US-AndrewMultilingualNeural',
    displayName: 'Andrew (Multilingual)',
    gender: 'Male',
    locale: 'en-US',
  },
  { shortName: 'en-US-AriaNeural', displayName: 'Aria', gender: 'Female', locale: 'en-US' },
  { shortName: 'en-US-GuyNeural', displayName: 'Guy', gender: 'Male', locale: 'en-US' },
]

export interface EdgeTTSParams {
  text: string
  voice?: string // varsayılan: tr-TR-EmelNeural
  rate?: number // -100 .. +100 (% hız değişimi)
  pitch?: number // -100 .. +100 (Hz pitch değişimi)
  volume?: number // -100 .. +100 (% ses değişimi)
}

/**
 * Edge TTS ile metni MP3'e çevir.
 * WebSocket bazlı protokol — Microsoft'un Edge tarayıcısının kullandığı API.
 */
export async function edgeTTS(params: EdgeTTSParams): Promise<Buffer> {
  const voice = params.voice ?? 'tr-TR-EmelNeural'
  const rate = params.rate ?? 0
  const pitch = params.pitch ?? 0
  const volume = params.volume ?? 0

  const ratePct = `${rate >= 0 ? '+' : ''}${rate}%`
  const pitchHz = `${pitch >= 0 ? '+' : ''}${pitch}Hz`
  const volumePct = `${volume >= 0 ? '+' : ''}${volume}%`

  const requestId = crypto.randomBytes(16).toString('hex')

  return new Promise<Buffer>((resolve, reject) => {
    const ws = new WebSocket(EDGE_TTS_WSS_URL, {
      headers: {
        Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
      },
    })

    const audioChunks: Buffer[] = []
    let finished = false
    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true
        ws.terminate()
        reject(new Error('Edge TTS timeout'))
      }
    }, 30_000)

    ws.on('open', () => {
      // 1. Config message
      const configMessage = [
        `X-Timestamp:${new Date().toISOString()}`,
        'Content-Type:application/json; charset=utf-8',
        'Path:speech.config',
        '',
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' },
                outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
              },
            },
          },
        }),
      ].join('\r\n')
      ws.send(configMessage)

      // 2. SSML message
      const ssml = `<speak version='1.0' xml:lang='${voice.split('-').slice(0, 2).join('-')}' xmlns='http://www.w3.org/2001/10/synthesis'>
        <voice name='${voice}'>
          <prosody rate='${ratePct}' pitch='${pitchHz}' volume='${volumePct}'>
            ${escapeXml(params.text)}
          </prosody>
        </voice>
      </speak>`

      const ssmlMessage = [
        `X-RequestId:${requestId}`,
        'Content-Type:application/ssml+xml',
        `X-Timestamp:${new Date().toISOString()}Z`,
        'Path:ssml',
        '',
        ssml,
      ].join('\r\n')
      ws.send(ssmlMessage)
    })

    ws.on('message', (data: Buffer) => {
      // Mesajlar binary frame içinde, header + body
      // Audio chunks "Path:audio" header'ı ile gelir
      const headerEnd = data.indexOf('\r\n\r\n')
      if (headerEnd === -1) return

      const headerStr = data.slice(0, headerEnd).toString('utf-8')

      if (headerStr.includes('Path:audio')) {
        const audioStart = headerEnd + 4
        const audioBuffer = data.slice(audioStart)
        audioChunks.push(audioBuffer)
      } else if (headerStr.includes('Path:turn.end')) {
        if (!finished) {
          finished = true
          clearTimeout(timeout)
          ws.close()
          resolve(Buffer.concat(audioChunks))
        }
      }
    })

    ws.on('error', (err: Error) => {
      if (!finished) {
        finished = true
        clearTimeout(timeout)
        reject(err)
      }
    })

    ws.on('close', () => {
      if (!finished) {
        finished = true
        clearTimeout(timeout)
        if (audioChunks.length > 0) {
          resolve(Buffer.concat(audioChunks))
        } else {
          reject(new Error('Edge TTS closed without audio'))
        }
      }
    })
  })
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Edge TTS voice seçimi - dile göre otomatik
 */
export function defaultVoiceForLanguage(lang: string, gender?: 'Male' | 'Female'): string {
  const langPrefix = lang.toLowerCase().split('-')[0] ?? 'tr'

  const voices: Record<string, [string, string]> = {
    tr: ['tr-TR-EmelNeural', 'tr-TR-AhmetNeural'],
    en: ['en-US-AvaMultilingualNeural', 'en-US-AndrewMultilingualNeural'],
    de: ['de-DE-KatjaNeural', 'de-DE-ConradNeural'],
    fr: ['fr-FR-DeniseNeural', 'fr-FR-HenriNeural'],
    es: ['es-ES-ElviraNeural', 'es-ES-AlvaroNeural'],
    it: ['it-IT-ElsaNeural', 'it-IT-DiegoNeural'],
    ja: ['ja-JP-NanamiNeural', 'ja-JP-KeitaNeural'],
    ar: ['ar-SA-ZariyahNeural', 'ar-SA-HamedNeural'],
  }

  const pair = voices[langPrefix] ?? voices.tr!
  return gender === 'Male' ? pair[1] : pair[0]
}
