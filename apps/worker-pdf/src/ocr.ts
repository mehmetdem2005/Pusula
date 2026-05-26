import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'
import { groqVision } from './groq.js'

/**
 * Tarama PDF'leri için OCR fallback.
 * pdfjs-dist ile her sayfayı canvas benzeri bitmap'e render edip
 * Groq Llama 4 Scout vision'a "bu sayfadaki metni çıkar" deriz.
 *
 * Not: Node.js'te pdfjs-dist canvas olmadığından pdf-to-image alternatif gerekli.
 * Pragmatik çözüm: ilk iterasyonda sadece hata mesajı + manuel resim yükleme yönlendirmesi.
 * Gerçek OCR için pdf-img-convert veya sharp + poppler entegrasyonu Faz 5'te.
 */
export async function extractTextViaOCR(
  buffer: Buffer,
  groqApiKey: string,
  maxPages = 10,
): Promise<{ pages: Array<{ pageNumber: number; text: string }>; totalChars: number }> {
  // Bu implementasyon: pdfjs-dist Node'da bitmap render edemez (canvas gerekli)
  // Gerçek projede:
  //   - pnpm add pdf-img-convert veya poppler-utils
  //   - her sayfa → buffer → base64 → groqVision("extract_text")
  //
  // Şimdilik placeholder: hata fırlat, kullanıcı "resim olarak paylaş" yönlendirmesi alsın.
  throw new Error(
    'Tarama PDF\'ler için OCR henüz aktif değil. Lütfen sayfaları "Fotoğrafla" özelliğinden tek tek çek.',
  )

  // Gerçek implementasyon iskeleti (pdf-img-convert ile):
  /*
  const pdfImgConvert = await import('pdf-img-convert')
  const images = await pdfImgConvert.convert(buffer, {
    page_numbers: Array.from({ length: maxPages }, (_, i) => i + 1),
    scale: 2.0,
  })

  const pages: Array<{ pageNumber: number; text: string }> = []
  let totalChars = 0

  for (let i = 0; i < images.length; i++) {
    const img = images[i]
    if (!img) continue
    const base64 = Buffer.from(img).toString('base64')
    const text = await groqVision({
      apiKey: groqApiKey,
      imageBase64: base64,
      mimeType: 'image/png',
      prompt: 'Bu PDF sayfasındaki tüm metni olduğu gibi çıkar. Sadece metin, başka açıklama yok.',
    })
    pages.push({ pageNumber: i + 1, text })
    totalChars += text.length
  }

  return { pages, totalChars }
  */
}
