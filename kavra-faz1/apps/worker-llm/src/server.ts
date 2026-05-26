import 'dotenv/config'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import { apiKeysRoutes } from './routes/api-keys.js'
import { chatRoutes } from './routes/chat.js'
import { modelsRoutes } from './routes/models.js'

const isDev = process.env.NODE_ENV !== 'production'

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: isDev ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
  },
  bodyLimit: 10 * 1024 * 1024, // 10MB (PDF/ses için ileride)
})

await app.register(helmet, {
  // SSE için strict CSP'i gevşet
  contentSecurityPolicy: false,
})

await app.register(cors, {
  origin: (origin, cb) => {
    // Dev modda tüm origin'lere izin (Expo Go IP'si değişken)
    if (isDev) return cb(null, true)

    const allowed = ['https://kavra.app', 'https://admin.kavra.app', 'https://www.kavra.app']
    if (!origin) return cb(null, true) // mobil app (origin header'ı yok)
    if (allowed.includes(origin)) return cb(null, true)
    if (origin.startsWith('exp://') || origin.startsWith('exps://')) return cb(null, true)

    cb(new Error('CORS reddedildi'), false)
  },
  credentials: true,
})

await app.register(rateLimit, {
  max: 120,
  timeWindow: '1 minute',
  keyGenerator: (req) => {
    const auth = req.headers.authorization
    if (auth) return auth.slice(0, 40) // token'ın ilk 40 karakteri
    return req.ip
  },
  errorResponseBuilder: () => ({
    error: 'rate_limited',
    message: 'Çok fazla istek. Lütfen biraz bekle.',
  }),
})

await app.register(apiKeysRoutes)
await app.register(chatRoutes)
await app.register(modelsRoutes)

app.get('/health', async () => ({
  status: 'ok',
  service: 'worker-llm',
  version: '0.1.0',
  env: isDev ? 'development' : 'production',
}))

const port = Number(process.env.PORT ?? 4001)
const host = process.env.HOST ?? '0.0.0.0'

app.listen({ port, host }, (err, addr) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  app.log.info(`🚀 worker-llm ${addr}`)
  app.log.info(`   Expo cihazdan erişim için: http://<bilgisayar-ip>:${port}`)
})
