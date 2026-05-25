/**
 * AI video sağlayıcı soyutlaması (llm-gateway deseni). Gerçek sağlayıcı (Veo/Runway/Kling)
 * bu arayüzü uygulayıp `createVideoProvider`'a eklenir; üst katman değişmez.
 */
export interface VideoStartInput {
  prompt: string;
  templateId?: string | undefined;
  /** Girdi fotoğraflarının imzalı okuma URL'leri (görsel→video). */
  imageUrls: string[];
  durationSec?: number | undefined;
}

export interface VideoStartResult {
  providerJobId: string;
}

export interface VideoPollResult {
  status: 'running' | 'succeeded' | 'failed';
  /** Başarılıysa indirilebilir mp4 URL'i (mock'ta yok). */
  videoUrl?: string | undefined;
  error?: string | undefined;
  costUsd?: number | undefined;
}

export interface VideoProvider {
  readonly name: string;
  start(input: VideoStartInput): Promise<VideoStartResult>;
  poll(providerJobId: string): Promise<VideoPollResult>;
}
