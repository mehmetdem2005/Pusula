import 'dotenv/config'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import Fastify from 'fastify'
import rawBody from 'fastify-raw-body'
import { adminRoutes } from './routes/admin.js'
import { aiImagesRoutes } from './routes/ai-images.js'
import { apiKeysRoutes } from './routes/api-keys.js'
import { authRoutes } from './routes/auth.js'
import { b2bBillingRoutes } from './routes/b2b-billing.js'
import { bookTTSRoutes } from './routes/book-tts.js'
import { booksRoutes } from './routes/books.js'
import { chatRoutes } from './routes/chat.js'
import { clansRoutes } from './routes/clans.js'
import { classesRoutes } from './routes/classes.js'
import { devicesRoutes } from './routes/devices.js'
import { dictionaryRoutes } from './routes/dictionary.js'
import { engineRoutes } from './routes/engine.js'
import { errorsRoutes } from './routes/errors.js'
import { exportPptxRoutes } from './routes/export-pptx.js'
import { handwritingRoutes } from './routes/handwriting.js'
import { launchRoutes } from './routes/launch.js'
import { modelsRoutes } from './routes/models.js'
import { moderationRoutes } from './routes/moderation.js'
import { motivationRoutes } from './routes/motivation.js'
import { notebookChatRoutes } from './routes/notebook-chat.js'
import { notebooksRoutes } from './routes/notebooks.js'
import { organizationsRoutes } from './routes/organizations.js'
import { podcastSynthesisRoutes } from './routes/podcast-synthesis.js'
import { provisioningRoutes } from './routes/provisioning.js'
import { quizRoutes } from './routes/quiz.js'
import { reflectionsRoutes } from './routes/reflections.js'
import { revenueCatRoutes } from './routes/revenuecat.js'
import { reviewRoutes } from './routes/review.js'
import { sharingRoutes } from './routes/sharing.js'
import { socialRoutes } from './routes/social.js'
import { sourcesRoutes } from './routes/sources.js'
import { studioRoutes } from './routes/studio.js'
import { subscriptionRoutes } from './routes/subscription.js'
import { translationsRoutes } from './routes/translations.js'
import { vocabReviewRoutes } from './routes/vocab-review.js'

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
  },
})

await app.register(helmet)
await app.register(rawBody, {
  field: 'rawBody',
  global: false, // sadece marked route'lar için
  encoding: 'utf8',
  runFirst: true,
})
await app.register(cors, {
  origin: (origin, cb) => {
    const allowed = [
      'http://localhost:3000',
      'http://localhost:8081',
      'https://kavra.app',
      'https://admin.kavra.app',
    ]
    if (!origin || allowed.includes(origin) || origin.startsWith('exp://')) {
      cb(null, true)
    } else {
      cb(new Error('CORS reddedildi'), false)
    }
  },
  credentials: true,
})
await app.register(rateLimit, {
  max: 60,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.headers.authorization ?? req.ip,
})

// Routes
await app.register(apiKeysRoutes)
await app.register(chatRoutes)
await app.register(modelsRoutes)
await app.register(engineRoutes)
await app.register(quizRoutes)
await app.register(reviewRoutes)
await app.register(errorsRoutes)
await app.register(reflectionsRoutes)
await app.register(motivationRoutes)
await app.register(subscriptionRoutes)
await app.register(authRoutes)
await app.register(adminRoutes)
await app.register(aiImagesRoutes)
await app.register(booksRoutes)
await app.register(dictionaryRoutes)
await app.register(bookTTSRoutes)
await app.register(vocabReviewRoutes)
await app.register(notebooksRoutes)
await app.register(sourcesRoutes)
await app.register(notebookChatRoutes)
await app.register(studioRoutes)
await app.register(podcastSynthesisRoutes)
await app.register(devicesRoutes)
await app.register(moderationRoutes)
await app.register(launchRoutes)
await app.register(revenueCatRoutes)
await app.register(translationsRoutes)
await app.register(exportPptxRoutes)
await app.register(sharingRoutes)
await app.register(clansRoutes)
await app.register(socialRoutes)
await app.register(handwritingRoutes)
await app.register(organizationsRoutes)
await app.register(classesRoutes)
await app.register(provisioningRoutes)
await app.register(b2bBillingRoutes)

// Health check
app.get('/health', async () => ({ status: 'ok', service: 'worker-llm', version: '0.1.0' }))

const port = Number(process.env.PORT ?? 4001)
app.listen({ port, host: '0.0.0.0' }, (err, addr) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  app.log.info(`🚀 worker-llm ${addr} üzerinde hazır`)
})
