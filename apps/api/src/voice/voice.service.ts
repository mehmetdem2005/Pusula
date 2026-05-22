import { BadRequestException, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);

  /** Gemini 2.5 TTS doğal sesleri (preview, Mayıs 2026). */
  static readonly AVAILABLE_VOICES = [
    { id: 'Kore', label: 'Kore — sıcak, kadın', gender: 'female' },
    { id: 'Charon', label: 'Charon — derin, erkek', gender: 'male' },
    { id: 'Puck', label: 'Puck — enerjik, erkek', gender: 'male' },
    { id: 'Aoede', label: 'Aoede — melodik, kadın', gender: 'female' },
    { id: 'Fenrir', label: 'Fenrir — sağlam, erkek', gender: 'male' },
    { id: 'Leda', label: 'Leda — yumuşak, kadın', gender: 'female' },
    { id: 'Orus', label: 'Orus — net, erkek', gender: 'male' },
    { id: 'Zephyr', label: 'Zephyr — parlak, kadın', gender: 'female' },
  ];

  /**
   * Groq Whisper Large V3 Turbo ile STT.
   * Çok hızlı (gerçek zamanlıdan hızlı), Türkçe %95+ doğruluk, ücretsiz tier.
   */
  async transcribe(
    audio: Buffer,
    contentType: string,
    language: string,
    prompt: string,
  ): Promise<{ text: string; duration_ms: number; provider: string; model: string }> {
    const t0 = Date.now();
    const apiKey = process.env.MANAGED_GROQ_KEY;
    if (!apiKey) throw new BadRequestException('Groq key yok (MANAGED_GROQ_KEY)');

    const ext = contentType.includes('webm') ? 'webm' : contentType.includes('mp3') ? 'mp3' : 'wav';
    const form = new FormData();
    form.append('file', new Blob([audio], { type: contentType }), `audio.${ext}`);
    form.append('model', 'whisper-large-v3-turbo');
    form.append('response_format', 'json');
    form.append('temperature', '0');
    if (language && language !== 'auto') form.append('language', language);
    if (prompt) form.append('prompt', prompt);

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Groq STT ${res.status}: ${err}`);
      throw new BadRequestException(`STT başarısız: ${res.status}`);
    }
    const data = (await res.json()) as { text: string };
    return {
      text: data.text.trim(),
      duration_ms: Date.now() - t0,
      provider: 'groq',
      model: 'whisper-large-v3-turbo',
    };
  }

  /**
   * Gemini 2.5 Flash TTS — doğal ses, 24kHz mono PCM (mp3'e dönüştürülür).
   * Ücretsiz tier free.
   */
  async synthesize(
    text: string,
    voice: string,
    _speed?: number,
  ): Promise<{ buffer: Buffer; mime: string }> {
    const apiKey = process.env.MANAGED_GEMINI_KEY;
    if (!apiKey) throw new BadRequestException('Gemini key yok (MANAGED_GEMINI_KEY)');

    const valid = VoiceService.AVAILABLE_VOICES.find((v) => v.id === voice) ?? VoiceService.AVAILABLE_VOICES[0];

    const body = {
      contents: [{ parts: [{ text }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: valid.id },
          },
        },
      },
    };

    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
      },
    );
    if (!res.ok) {
      const err = await res.text();
      this.logger.error(`Gemini TTS ${res.status}: ${err}`);
      throw new BadRequestException(`TTS başarısız: ${res.status}`);
    }
    const data = (await res.json()) as {
      candidates: Array<{ content: { parts: Array<{ inlineData: { data: string; mimeType: string } }> } }>;
    };
    const part = data.candidates[0]?.content?.parts?.[0]?.inlineData;
    if (!part) throw new BadRequestException('TTS boş yanıt');

    // Gemini PCM L16 24kHz mono döner — WAV header ekleyip browser-uyumlu yap
    const pcm = Buffer.from(part.data, 'base64');
    const wav = wrapPcmAsWav(pcm, 24_000, 1, 16);
    return { buffer: wav, mime: 'audio/wav' };
  }
}

/** Raw PCM → WAV (header eklemek için minimal helper). */
function wrapPcmAsWav(pcm: Buffer, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const dataSize = pcm.length;
  const totalSize = 44 + dataSize;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(totalSize - 8, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]);
}
