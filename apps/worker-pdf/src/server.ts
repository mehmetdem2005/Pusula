import 'dotenv/config'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import { pdfRoutes } from './routes/pdf.js'

const isDev = process.env.NODE_ENV !== 'production'

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: isDev ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
  },
  bodyLimit: 50 * 1024 * 1024, // 50MB (büyük PDF + base64 image)
})

await app.register(helmet, { contentSecurityPolicy: false })

await app.register(cors, {
  origin: (origin, cb) => {
    if (isDev) return cb(null, true)
    const allowed = ['https://kavra.app', 'https://admin.kavra.app']
    if (!origin) return cb(null, true)
    if (allowed.includes(origin)) return cb(null, true)
    if (origin.startsWith('exp://') || origin.startsWith('exps://')) return cb(null, true)
    cb(new Error('CORS reddedildi'), false)
  },
  credentials: true,
})

await app.register(rateLimit, {
  max: 30, // PDF işleme pahalı, daha sıkı
  timeWindow: '1 minute',
  keyGenerator: (req) => req.headers.authorization?.slice(0, 40) ?? req.ip,
})

await app.register(pdfRoutes)

app.get('/health', async () => ({
  status: 'ok',
  service: 'worker-pdf',
  version: '0.1.0',
  hasOpenAI: !!process.env.OPENAI_API_KEY,
}))

const port = Number(process.env.PORT ?? 4003)
const host = process.env.HOST ?? '0.0.0.0'

app.listen({ port, host }, (err, addr) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  app.log.info(`📄 worker-pdf ${addr}`)
})
