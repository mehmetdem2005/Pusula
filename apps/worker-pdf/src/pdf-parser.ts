// Node.js'te pdfjs-dist için legacy build kullanıyoruz
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

// Worker'ı disable et (Node.js'te gerekmiyor)
GlobalWorkerOptions.workerSrc = ''

export interface ParsedPage {
  pageNumber: number
  text: string
}

export interface ParsedPDF {
  pageCount: number
  pages: ParsedPage[]
  totalChars: number
  hasText: boolean
}

export async function parsePDF(buffer: Buffer): Promise<ParsedPDF> {
  const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
  const doc = await getDocument({
    data: uint8,
    useSystemFonts: true,
    disableFontFace: true,
  }).promise

  const pages: ParsedPage[] = []
  let totalChars = 0

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum)
    const content = await page.getTextContent()

    // Items'ı yan yana getir + satır sonlarını koru
    let text = ''
    let lastY: number | null = null
    for (const item of content.items as any[]) {
      if (typeof item.str !== 'string') continue
      const y = item.transform?.[5]
      if (lastY !== null && Math.abs(y - lastY) > 2) text += '\n'
      text += item.str
      lastY = y
    }

    text = text.trim()
    pages.push({ pageNumber: pageNum, text })
    totalChars += text.length

    page.cleanup()
  }

  doc.destroy()

  return {
    pageCount: doc.numPages,
    pages,
    totalChars,
    hasText: totalChars > 50,
  }
}

/**
 * Metni overlap'li chunk'lara böl.
 * Whisper-tarzı yaklaşım: ~500 token (~2000 karakter), 50 token overlap.
 */
export interface Chunk {
  text: string
  pageNumber: number
  index: number
}

export function chunkText(
  parsed: ParsedPDF,
  opts: { maxChars?: number; overlap?: number } = {},
): Chunk[] {
  const maxChars = opts.maxChars ?? 2000
  const overlap = opts.overlap ?? 200
  const chunks: Chunk[] = []
  let chunkIndex = 0

  for (const page of parsed.pages) {
    if (!page.text) continue

    // Sayfa metnini paragraflara böl
    const paragraphs = page.text.split(/\n\n+/).filter((p) => p.trim().length > 0)
    let buffer = ''

    for (const para of paragraphs) {
      const trimmed = para.trim()

      if (buffer.length + trimmed.length + 2 > maxChars) {
        if (buffer.length > 100) {
          chunks.push({ text: buffer.trim(), pageNumber: page.pageNumber, index: chunkIndex++ })
          // Overlap için son N karakteri yeni buffer'a taşı
          buffer = buffer.slice(-overlap) + '\n\n' + trimmed
        } else {
          buffer += (buffer ? '\n\n' : '') + trimmed
        }
      } else {
        buffer += (buffer ? '\n\n' : '') + trimmed
      }
    }

    if (buffer.trim().length > 100) {
      chunks.push({ text: buffer.trim(), pageNumber: page.pageNumber, index: chunkIndex++ })
    }
  }

  return chunks
}
