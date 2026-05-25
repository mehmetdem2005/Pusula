import { Logger } from '@nestjs/common';
import type { Env } from '../../config/env.schema.js';
import { MockVideoProvider } from './mock.provider.js';
import type { VideoProvider } from './types.js';

export * from './types.js';
export { MockVideoProvider };

/**
 * Env'e göre sağlayıcı seç. Gerçek sağlayıcılar (veo/runway/kling) henüz uygulanmadı →
 * key gelene kadar mock'a düşülür (graceful). Uygulanınca buraya eklenir.
 */
export function createVideoProvider(env: Env): VideoProvider {
  const logger = new Logger('VideoProvider');
  switch (env.VIDEO_PROVIDER) {
    case 'mock':
      return new MockVideoProvider();
    case 'veo':
    case 'runway':
    case 'kling':
      logger.warn(`VIDEO_PROVIDER='${env.VIDEO_PROVIDER}' henüz uygulanmadı — mock kullanılıyor.`);
      return new MockVideoProvider();
    default:
      return new MockVideoProvider();
  }
}
