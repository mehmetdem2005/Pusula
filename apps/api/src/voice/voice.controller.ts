import {
  Body,
  Controller,
  Get,
  Logger,
  PayloadTooLargeException,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { JwtAuthGuard, type AuthedUser, CurrentUser } from '../auth/jwt.guard.js';
import { VoiceService } from './voice.service.js';

@Controller('voice')
@UseGuards(JwtAuthGuard)
export class VoiceController {
  private readonly logger = new Logger(VoiceController.name);
  constructor(private readonly svc: VoiceService) {}

  /**
   * Konuşma → Metin (Groq Whisper Large V3 Turbo).
   * Body: raw audio bytes (webm/mp3/wav, max 25MB).
   * Query: ?lang=tr (default), ?prompt=... (opsiyonel bağlam)
   */
  @Post('stt')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async stt(
    @CurrentUser() user: AuthedUser,
    @Req() req: Request,
    @Query('lang') lang = 'tr',
    @Query('prompt') prompt = '',
  ): Promise<{ text: string; duration_ms: number; provider: string; model: string }> {
    const contentType = (req.headers['content-type'] as string | undefined) ?? 'audio/webm';
    const MAX_BYTES = 25 * 1024 * 1024; // 25MB — OOM/DoS koruması (akışı sınırla)
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const c of req) {
      const buf = c as Buffer;
      total += buf.length;
      if (total > MAX_BYTES) {
        req.destroy();
        throw new PayloadTooLargeException('Ses dosyası 25MB sınırını aşıyor');
      }
      chunks.push(buf);
    }
    const audio = Buffer.concat(chunks);
    this.logger.log(`STT: user=${user.id} bytes=${audio.length} type=${contentType}`);
    return this.svc.transcribe(audio, contentType, lang, prompt);
  }

  /**
   * Metin → Konuşma (Gemini 2.5 Flash TTS).
   * Body: { text, voice? = "Kore", speed? = 1.0 }
   * Yanıt: audio/mpeg (mp3 stream).
   */
  @Post('tts')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async tts(
    @CurrentUser() user: AuthedUser,
    @Body() body: { text: string; voice?: string; speed?: number },
    @Res() res: Response,
  ): Promise<void> {
    const text = (body.text ?? '').slice(0, 2000);
    const voice = body.voice ?? 'Kore';
    this.logger.log(`TTS: user=${user.id} len=${text.length} voice=${voice}`);
    const { buffer, mime } = await this.svc.synthesize(text, voice, body.speed);
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'no-store');
    res.end(buffer);
  }

  @Get('voices')
  voices() {
    return {
      voices: VoiceService.AVAILABLE_VOICES,
      stt: { provider: 'groq', model: 'whisper-large-v3-turbo', languages: ['tr', 'en', 'auto'] },
      tts: { provider: 'gemini', model: 'gemini-2.5-flash-preview-tts' },
    };
  }
}
