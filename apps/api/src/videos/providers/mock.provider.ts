import { randomUUID } from 'node:crypto';
import type { VideoPollResult, VideoProvider, VideoStartInput, VideoStartResult } from './types.js';

/**
 * Mock sağlayıcı — gerçek video ÜRETMEZ. Akışı (kuyruk→iş→durum→UI) uçtan uca doğrular.
 * `start` sahte bir iş kimliği döner; `poll` anında "succeeded" (videoUrl yok) döner.
 * Gerçek sağlayıcı bağlanınca yalnız bu sınıfın yerine yenisi konur; üst katman aynı kalır.
 */
export class MockVideoProvider implements VideoProvider {
  readonly name = 'mock';

  async start(_input: VideoStartInput): Promise<VideoStartResult> {
    return { providerJobId: `mock_${randomUUID()}` };
  }

  async poll(_providerJobId: string): Promise<VideoPollResult> {
    // Mock: çıktı dosyası yok → media satırı oluşturulmaz, iş yine de "başarılı" sayılır.
    return { status: 'succeeded', videoUrl: undefined, costUsd: 0 };
  }
}
