import type { FastifyInstance } from 'fastify'
import pptxgenjs from 'pptxgenjs'
import { supabase, verifyUserToken } from '../supabase.js'

const PptxGenJS = pptxgenjs as unknown as new () => any
type pptxgen = any

/**
 * Slides .pptx Export
 * ====================
 *
 * Studio'da generated content (content_type='slides') varsa,
 * onu gerçek bir PowerPoint dosyasına dönüştürür.
 *
 * Layout'lar:
 *   - title: Hero başlık + alt başlık (gradient bg)
 *   - bullet: Maddeli liste (sol başlık, sağ bullet)
 *   - quote: Büyük italik alıntı + yazar
 *   - comparison: 2 sütun split (vs.)
 *   - closing: "Teşekkürler" + soru ekranı
 *
 * Konuşma notları (speakerNotes) PowerPoint Notes panel'ında görünür.
 *
 * Kavra branding: indigo/amber renkleri, Instrument Serif başlık.
 */

const COLORS = {
  ink: '1E1B4B',
  amber: 'F59E0B',
  cream: 'FBF8F0',
  white: 'FFFFFF',
  slateLight: 'F1F5F9',
  slateMid: '475569',
  slateDark: '1E293B',
}

interface Slide {
  layout: 'title' | 'bullet' | 'quote' | 'comparison' | 'closing'
  title?: string
  subtitle?: string
  bullets?: string[]
  quote?: string
  author?: string
  comparison?: {
    left: { title: string; bullets: string[] }
    right: { title: string; bullets: string[] }
  }
  speakerNotes?: string
}

function renderTitleSlide(pres: pptxgen, slide: Slide) {
  const sl = pres.addSlide()
  sl.background = { color: COLORS.ink }

  sl.addText(slide.title ?? '', {
    x: 0.5,
    y: 2.0,
    w: 9,
    h: 1.8,
    fontFace: 'Georgia',
    fontSize: 54,
    color: COLORS.cream,
    bold: false,
    align: 'left',
  })

  if (slide.subtitle) {
    sl.addText(slide.subtitle, {
      x: 0.5,
      y: 4.0,
      w: 9,
      h: 0.8,
      fontFace: 'Helvetica',
      fontSize: 22,
      color: COLORS.amber,
      italic: true,
    })
  }

  // Branding
  sl.addText('Kavra', {
    x: 0.5,
    y: 4.9,
    w: 2,
    h: 0.4,
    fontFace: 'Helvetica',
    fontSize: 11,
    color: COLORS.amber,
    bold: true,
  })

  if (slide.speakerNotes) sl.addNotes(slide.speakerNotes)
}

function renderBulletSlide(pres: pptxgen, slide: Slide, slideNumber: number) {
  const sl = pres.addSlide()
  sl.background = { color: COLORS.cream }

  sl.addText(slide.title ?? '', {
    x: 0.5,
    y: 0.4,
    w: 9,
    h: 1.0,
    fontFace: 'Georgia',
    fontSize: 36,
    color: COLORS.ink,
  })

  // Amber underline
  sl.addShape(pres.ShapeType.line, {
    x: 0.5,
    y: 1.4,
    w: 1,
    h: 0,
    line: { color: COLORS.amber, width: 3 },
  })

  if (slide.bullets) {
    const bulletText = slide.bullets.map((b) => ({
      text: b,
      options: { bullet: { type: 'bullet', code: '25CF' } },
    }))

    sl.addText(bulletText as any, {
      x: 0.7,
      y: 1.8,
      w: 8.6,
      h: 4.0,
      fontFace: 'Helvetica',
      fontSize: 20,
      color: COLORS.slateDark,
      paraSpaceAfter: 12,
    })
  }

  // Page number
  sl.addText(`${slideNumber}`, {
    x: 9.0,
    y: 6.8,
    w: 0.5,
    h: 0.3,
    fontFace: 'Helvetica',
    fontSize: 9,
    color: COLORS.slateMid,
    align: 'right',
  })

  if (slide.speakerNotes) sl.addNotes(slide.speakerNotes)
}

function renderQuoteSlide(pres: pptxgen, slide: Slide) {
  const sl = pres.addSlide()
  sl.background = { color: COLORS.amber }

  sl.addText('"', {
    x: 0.5,
    y: 0.5,
    w: 1.5,
    h: 1.5,
    fontFace: 'Georgia',
    fontSize: 120,
    color: COLORS.ink,
    bold: true,
  })

  sl.addText(slide.quote ?? '', {
    x: 1.0,
    y: 2.0,
    w: 8,
    h: 3,
    fontFace: 'Georgia',
    fontSize: 30,
    italic: true,
    color: COLORS.ink,
    align: 'left',
  })

  if (slide.author) {
    sl.addText(`— ${slide.author}`, {
      x: 1.0,
      y: 5.5,
      w: 8,
      h: 0.5,
      fontFace: 'Helvetica',
      fontSize: 16,
      color: COLORS.slateDark,
      bold: true,
    })
  }

  if (slide.speakerNotes) sl.addNotes(slide.speakerNotes)
}

function renderComparisonSlide(pres: pptxgen, slide: Slide) {
  const sl = pres.addSlide()
  sl.background = { color: COLORS.cream }

  sl.addText(slide.title ?? '', {
    x: 0.5,
    y: 0.4,
    w: 9,
    h: 0.8,
    fontFace: 'Georgia',
    fontSize: 30,
    color: COLORS.ink,
  })

  // VS divider
  sl.addText('vs.', {
    x: 4.5,
    y: 3.0,
    w: 1,
    h: 1,
    fontFace: 'Georgia',
    fontSize: 36,
    italic: true,
    color: COLORS.amber,
    align: 'center',
  })

  // Sol kolon
  if (slide.comparison?.left) {
    sl.addText(slide.comparison.left.title, {
      x: 0.5,
      y: 1.5,
      w: 4,
      h: 0.6,
      fontFace: 'Helvetica',
      fontSize: 22,
      bold: true,
      color: COLORS.ink,
    })
    sl.addText(
      slide.comparison.left.bullets.map((b) => ({
        text: b,
        options: { bullet: { type: 'bullet' } },
      })) as any,
      {
        x: 0.5,
        y: 2.2,
        w: 4,
        h: 4,
        fontFace: 'Helvetica',
        fontSize: 14,
        color: COLORS.slateDark,
        paraSpaceAfter: 8,
      },
    )
  }

  // Sağ kolon
  if (slide.comparison?.right) {
    sl.addText(slide.comparison.right.title, {
      x: 5.5,
      y: 1.5,
      w: 4,
      h: 0.6,
      fontFace: 'Helvetica',
      fontSize: 22,
      bold: true,
      color: COLORS.ink,
    })
    sl.addText(
      slide.comparison.right.bullets.map((b) => ({
        text: b,
        options: { bullet: { type: 'bullet' } },
      })) as any,
      {
        x: 5.5,
        y: 2.2,
        w: 4,
        h: 4,
        fontFace: 'Helvetica',
        fontSize: 14,
        color: COLORS.slateDark,
        paraSpaceAfter: 8,
      },
    )
  }

  if (slide.speakerNotes) sl.addNotes(slide.speakerNotes)
}

function renderClosingSlide(pres: pptxgen, slide: Slide) {
  const sl = pres.addSlide()
  sl.background = { color: COLORS.ink }

  sl.addText(slide.title ?? 'Teşekkürler', {
    x: 0.5,
    y: 2.5,
    w: 9,
    h: 1.5,
    fontFace: 'Georgia',
    fontSize: 64,
    color: COLORS.cream,
    align: 'center',
  })

  if (slide.subtitle) {
    sl.addText(slide.subtitle, {
      x: 0.5,
      y: 4.2,
      w: 9,
      h: 0.6,
      fontFace: 'Helvetica',
      fontSize: 18,
      color: COLORS.amber,
      italic: true,
      align: 'center',
    })
  }

  sl.addText('Kavra ile hazırlandı · kavra.app', {
    x: 0.5,
    y: 6.5,
    w: 9,
    h: 0.3,
    fontFace: 'Helvetica',
    fontSize: 10,
    color: COLORS.amber,
    align: 'center',
  })

  if (slide.speakerNotes) sl.addNotes(slide.speakerNotes)
}

export async function exportPptxRoutes(fastify: FastifyInstance) {
  /** POST /api/studio/:id/export-pptx */
  fastify.post<{ Params: { id: string } }>('/api/studio/:id/export-pptx', async (req, reply) => {
    const userId = await verifyUserToken(req.headers.authorization)
    if (!userId) return reply.code(401).send({ error: 'unauthorized' })

    const { data: gen } = await supabase
      .from('generated_content')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single()

    if (!gen) return reply.code(404).send({ error: 'not_found' })
    if (gen.content_type !== 'slides') {
      return reply.code(400).send({ error: 'not_slides' })
    }

    const slides = (gen.raw_content as any)?.slides as Slide[]
    if (!slides || slides.length === 0) {
      return reply.code(400).send({ error: 'no_slides' })
    }

    // PPTX oluştur
    const pres = new PptxGenJS() as pptxgen
    pres.layout = 'LAYOUT_WIDE' // 16:9
    pres.author = 'Kavra'
    pres.company = 'Kavra'
    pres.title = gen.title ?? 'Sunum'

    slides.forEach((slide, idx) => {
      switch (slide.layout) {
        case 'title':
          renderTitleSlide(pres, slide)
          break
        case 'bullet':
          renderBulletSlide(pres, slide, idx + 1)
          break
        case 'quote':
          renderQuoteSlide(pres, slide)
          break
        case 'comparison':
          renderComparisonSlide(pres, slide)
          break
        case 'closing':
          renderClosingSlide(pres, slide)
          break
      }
    })

    // Buffer'a yaz
    const buffer = (await pres.write({ outputType: 'nodebuffer' })) as Buffer

    // Storage'a yükle
    const fileName = `${(gen.title ?? 'sunum').replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 50)}.pptx`
    const storagePath = `${userId}/exports/${gen.id}/${fileName}`

    await supabase.storage.from('notebook-outputs').upload(storagePath, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      upsert: true,
    })

    // Signed URL (1 saat)
    const { data: urlData } = await supabase.storage
      .from('notebook-outputs')
      .createSignedUrl(storagePath, 3600)

    return {
      url: urlData?.signedUrl,
      fileName,
      slideCount: slides.length,
      sizeBytes: buffer.length,
    }
  })
}
