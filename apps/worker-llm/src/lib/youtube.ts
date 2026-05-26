/**
 * YouTube Transcript Fetcher
 * ===========================
 *
 * Strateji (sırayla dener):
 *   1. Supadata `mode=auto` — varsa manual transcript, yoksa native ASR (en hızlı)
 *      $47/mo plan, 50k transcript request/ay
 *   2. youtube-transcript-api (third-party scrape) — fallback eğer Supadata yoksa
 *   3. Audio-only download → Groq Whisper Large v3 Turbo
 *      Yedek-yedek, en pahalı, ama her zaman çalışır
 *
 * Long video (>90 dk):
 *   - Whisper API max 25MB → audio chunked download + parallel transcribe
 *   - Çıktı tek seferde merge edilir
 */

const SUPADATA_API_KEY = process.env.SUPADATA_API_KEY
const GROQ_API_KEY = process.env.GROQ_API_KEY

export interface YouTubeTranscriptSegment {
  text: string
  startMs: number
  endMs: number
}

export interface YouTubeTranscriptResult {
  videoId: string
  language: string
  segments: YouTubeTranscriptSegment[]
  fullText: string
  durationSeconds: number
  source: 'supadata-auto' | 'supadata-asr' | 'youtube-scrape' | 'whisper-fallback'
  channelName?: string
  title?: string
}

/**
 * YouTube URL → videoId
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m?.[1]) return m[1]
  }
  return null
}

/**
 * Supadata API — primary
 */
async function fetchSupadata(videoId: string, language?: string): Promise<YouTubeTranscriptResult> {
  if (!SUPADATA_API_KEY) throw new Error('SUPADATA_API_KEY not configured')

  const url = `https://api.supadata.ai/v1/youtube/transcript?videoId=${videoId}&mode=auto${language ? `&lang=${language}` : ''}`
  const res = await fetch(url, { headers: { 'x-api-key': SUPADATA_API_KEY } })

  if (!res.ok) throw new Error(`Supadata: ${res.status} ${await res.text()}`)
  const data: any = await res.json()

  // Supadata response: { lang, content: [{ text, offset, duration }], availableLangs }
  const segments: YouTubeTranscriptSegment[] = (data.content ?? []).map((c: any) => ({
    text: c.text,
    startMs: c.offset,
    endMs: c.offset + c.duration,
  }))

  const fullText = segments.map((s) => s.text).join(' ')
  const last = segments[segments.length - 1]
  const durationSeconds = Math.round((last?.endMs ?? 0) / 1000)

  return {
    videoId,
    language: data.lang ?? language ?? 'en',
    segments,
    fullText,
    durationSeconds,
    source: data.isASR ? 'supadata-asr' : 'supadata-auto',
  }
}

/**
 * Public youtube-transcript scraper fallback (auth gerekmez ama rate-limit var)
 * youtubetranscript.com proxy kullanıyoruz — open-source.
 */
async function fetchPublicScraper(videoId: string): Promise<YouTubeTranscriptResult> {
  const url = `https://youtubetranscript.com/?server_vid2=${videoId}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  })

  if (!res.ok) throw new Error(`Public scraper: ${res.status}`)
  const xml = await res.text()

  // <text start="0.0" dur="3.5">Hello world</text>
  const segments: YouTubeTranscriptSegment[] = []
  const matches = xml.matchAll(/<text start="([\d.]+)" dur="([\d.]+)"[^>]*>([^<]+)<\/text>/g)

  for (const m of matches) {
    const startMs = Math.round(Number.parseFloat(m[1] ?? '0') * 1000)
    const durMs = Math.round(Number.parseFloat(m[2] ?? '0') * 1000)
    segments.push({
      text: decodeHTMLEntities(m[3] ?? ''),
      startMs,
      endMs: startMs + durMs,
    })
  }

  if (segments.length === 0) throw new Error('Public scraper: empty transcript')

  return {
    videoId,
    language: 'auto',
    segments,
    fullText: segments.map((s) => s.text).join(' '),
    durationSeconds: Math.round((segments[segments.length - 1]?.endMs ?? 0) / 1000),
    source: 'youtube-scrape',
  }
}

/**
 * Whisper fallback — en pahalı, ama her zaman çalışır.
 * yt-dlp ile audio download → Groq Whisper transcribe.
 *
 * Production'da Modal worker'da çalışmalı (yt-dlp gerektirir).
 * Render'da sadece Supadata + scraper kullan.
 */
async function fetchWhisperFallback(videoId: string): Promise<YouTubeTranscriptResult> {
  // NOT: bu fonksiyon sadece bir Modal worker veya yt-dlp olan ortamda çalışır.
  // Render container'ında yt-dlp yok, bu yüzden Modal API'sine delege ediyoruz.
  const modalEndpoint = process.env.MODAL_YT_TRANSCRIBE_URL
  if (!modalEndpoint || !GROQ_API_KEY) {
    throw new Error('Whisper fallback requires MODAL_YT_TRANSCRIBE_URL + GROQ_API_KEY')
  }

  const res = await fetch(modalEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId, groqApiKey: GROQ_API_KEY }),
  })

  if (!res.ok) throw new Error(`Modal Whisper: ${res.status}`)
  const data: any = await res.json()

  return {
    videoId,
    language: data.language ?? 'auto',
    segments: data.segments,
    fullText: data.fullText,
    durationSeconds: data.durationSeconds,
    source: 'whisper-fallback',
  }
}

/**
 * Master: 3-tier fallback strategy
 */
export async function fetchYouTubeTranscript(
  videoUrl: string,
  preferredLanguage?: string,
): Promise<YouTubeTranscriptResult> {
  const videoId = extractVideoId(videoUrl)
  if (!videoId) throw new Error('Geçerli bir YouTube URL/ID değil')

  const errors: string[] = []

  // 1. Supadata
  if (SUPADATA_API_KEY) {
    try {
      return await fetchSupadata(videoId, preferredLanguage)
    } catch (e: any) {
      errors.push(`supadata: ${e.message}`)
    }
  }

  // 2. Public scraper
  try {
    return await fetchPublicScraper(videoId)
  } catch (e: any) {
    errors.push(`scraper: ${e.message}`)
  }

  // 3. Whisper fallback
  try {
    return await fetchWhisperFallback(videoId)
  } catch (e: any) {
    errors.push(`whisper: ${e.message}`)
  }

  throw new Error(`Tüm transcript yöntemleri başarısız: ${errors.join(' | ')}`)
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number.parseInt(code)))
}

/**
 * Time-based chunking for YouTube — ~30 saniyelik bloklar.
 * Her chunk'a startMs ve endMs eklenir → citation'da [mm:ss] olarak gösterilir.
 */
export function chunkYouTubeTranscript(
  segments: YouTubeTranscriptSegment[],
  opts?: { targetDurationMs?: number; minChars?: number },
): Array<{
  text: string
  startMs: number
  endMs: number
  index: number
}> {
  const targetDuration = opts?.targetDurationMs ?? 30_000 // 30 saniye
  const minChars = opts?.minChars ?? 200 // en az 200 karakter

  const chunks: Array<any> = []
  let buf: YouTubeTranscriptSegment[] = []
  let bufChars = 0
  let bufStart = 0
  let idx = 0

  for (const seg of segments) {
    if (buf.length === 0) bufStart = seg.startMs
    buf.push(seg)
    bufChars += seg.text.length

    const elapsed = seg.endMs - bufStart
    if ((elapsed >= targetDuration && bufChars >= minChars) || bufChars > 2000) {
      chunks.push({
        text: buf.map((s) => s.text).join(' '),
        startMs: bufStart,
        endMs: seg.endMs,
        index: idx++,
      })
      buf = []
      bufChars = 0
    }
  }

  // Son kalan
  if (buf.length > 0) {
    chunks.push({
      text: buf.map((s) => s.text).join(' '),
      startMs: bufStart,
      endMs: buf[buf.length - 1]!.endMs,
      index: idx++,
    })
  }

  return chunks
}

/**
 * Format ms → "mm:ss" or "hh:mm:ss"
 */
export function formatTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}
