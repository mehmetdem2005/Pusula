import 'dotenv/config'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import { checkPiper } from './piper.js'
import { synthesizeV2Routes } from './routes/synthesize-v2.js'
import { synthesizeRoutes } from './routes/synthesize.js'
import { transcribeRoutes } from './routes/transcribe.js'
import { voiceCloneRoutes } from './routes/voice-clones.js'

const isDev = process.env.NODE_ENV !== 'production'

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport: isDev ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
  },
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
  max: 60,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.headers.authorization?.slice(0, 40) ?? req.ip,
})

await app.register(transcribeRoutes)
await app.register(synthesizeRoutes)
await app.register(synthesizeV2Routes)
await app.register(voiceCloneRoutes)

app.get('/health', async () => {
  const piperOk = await checkPiper()
  return {
    status: piperOk ? 'ok' : 'degraded',
    service: 'worker-voice',
    version: '0.1.0',
    piper: piperOk ? 'ok' : 'missing',
  }
})

const port = Number(process.env.PORT ?? 4002)
const host = process.env.HOST ?? '0.0.0.0'

app.listen({ port, host }, (err, addr) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  app.log.info(`🎙️ worker-voice ${addr}`)
})
