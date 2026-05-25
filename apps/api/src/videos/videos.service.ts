import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../supabase/supabase.module.js';
import { QueueService } from '../queue/queue.module.js';
import { Q } from '../queue/queue.tokens.js';
import { loadEnv } from '../config/env.schema.js';
import { createVideoProvider, type VideoProvider } from './providers/index.js';
import type { CreateVideoInput } from './dto.js';

interface JobRow {
  id: string;
  listing_id: string;
  owner_user_id: string;
  status: string;
  provider: string;
  prompt: string | null;
  template_id: string | null;
  input_media_ids: string[];
  output_media_id: string | null;
  cost_usd: number;
  error: string | null;
  created_at: string;
}

const GENERATED_BUCKET = 'generated-videos';

@Injectable()
export class VideosService {
  private readonly logger = new Logger(VideosService.name);
  private readonly provider: VideoProvider;
  private readonly env = loadEnv();

  constructor(
    @Inject(SUPABASE) private readonly sb: SupabaseClient,
    private readonly queue: QueueService,
  ) {
    this.provider = createVideoProvider(this.env);
  }

  /** İş oluştur: sahiplik + günlük adet kapağı → kayıt. Mock anında işlenir; gerçek sağlayıcı kuyruğa. */
  async createJob(userId: string, body: CreateVideoInput): Promise<{ id: string; status: string }> {
    const { data: listing } = await this.sb
      .from('ilanlar')
      .select('id')
      .eq('id', body.listing_id)
      .eq('owner_user_id', userId)
      .maybeSingle();
    if (!listing) throw new NotFoundException('İlan bulunamadı');

    // Günlük adet kapağı (maliyet guardrail'i — enqueue ÖNCESİ).
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const { count } = await this.sb
      .from('video_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('owner_user_id', userId)
      .gte('created_at', dayStart.toISOString());
    if ((count ?? 0) >= this.env.VIDEO_MAX_PER_USER_DAY) {
      throw new HttpException(
        `Günlük video üretim limitine ulaşıldı (${this.env.VIDEO_MAX_PER_USER_DAY}). Yarın tekrar dene.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Girdi medyası: verilmediyse ilanın hazır fotoğrafları.
    let inputIds = body.input_media_ids ?? [];
    if (inputIds.length === 0) {
      const { data: media } = await this.sb
        .from('media')
        .select('id')
        .eq('listing_id', body.listing_id)
        .eq('processing_status', 'ready')
        .order('ordinal', { ascending: true })
        .limit(8);
      inputIds = (media ?? []).map((m) => m.id as string);
    }

    const id = randomUUID();
    const { error } = await this.sb.from('video_jobs').insert({
      id,
      listing_id: body.listing_id,
      owner_user_id: userId,
      status: 'queued',
      provider: this.provider.name,
      prompt: body.prompt ?? null,
      template_id: body.template_id ?? null,
      input_media_ids: inputIds,
    });
    if (error) {
      this.logger.error(`createJob failed: ${error.message}`);
      throw error;
    }

    if (this.provider.name === 'mock') {
      // Mock: worker/Redis gerektirmeden anında tamamla (akış canlıda görünür).
      await this.processJob(id).catch((e) =>
        this.logger.warn(`mock processJob failed: ${(e as Error).message}`),
      );
    } else {
      // Gerçek sağlayıcı: ayrı worker dyno'su işler (uzun süren üretim).
      await this.queue.enqueue(Q.VIDEO_GENERATE, { job_id: id }, { attempts: 2 });
    }

    const { data: fresh } = await this.sb
      .from('video_jobs')
      .select('status')
      .eq('id', id)
      .maybeSingle();
    return { id, status: (fresh?.status as string) ?? 'queued' };
  }

  /**
   * İşi işle (mock inline VEYA worker çağırır). provider.start→poll; başarılı + videoUrl varsa
   * çıktıyı generated-videos'a yükler + media satırı (is_ai_generated) oluşturur.
   */
  async processJob(jobId: string): Promise<void> {
    const { data } = await this.sb.from('video_jobs').select('*').eq('id', jobId).maybeSingle();
    if (!data) throw new NotFoundException('İş bulunamadı');
    const job = data as JobRow;
    if (job.status === 'succeeded' || job.status === 'failed') return;

    await this.sb
      .from('video_jobs')
      .update({ status: 'running', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    try {
      const imageUrls =
        this.provider.name === 'mock' ? [] : await this.signImageUrls(job.input_media_ids);
      const started = await this.provider.start({
        prompt: job.prompt ?? 'Mekânı gezdiren kısa sinematik tur',
        templateId: job.template_id ?? undefined,
        imageUrls,
      });
      const result = await this.provider.poll(started.providerJobId);

      if (result.status === 'failed') {
        await this.fail(jobId, result.error ?? 'Üretim başarısız');
        return;
      }
      if (result.status === 'running') {
        // Gerçek sağlayıcıda worker gecikmeli tekrar poll eder; mock buraya düşmez.
        await this.sb
          .from('video_jobs')
          .update({ provider_job_id: started.providerJobId, updated_at: new Date().toISOString() })
          .eq('id', jobId);
        return;
      }

      let outputMediaId: string | null = null;
      if (result.videoUrl) {
        outputMediaId = await this.storeOutput(job, result.videoUrl);
      }
      await this.sb
        .from('video_jobs')
        .update({
          status: 'succeeded',
          provider_job_id: started.providerJobId,
          output_media_id: outputMediaId,
          cost_usd: result.costUsd ?? 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId);
    } catch (e) {
      await this.fail(jobId, (e as Error).message);
    }
  }

  private async fail(jobId: string, error: string): Promise<void> {
    await this.sb
      .from('video_jobs')
      .update({
        status: 'failed',
        error: error.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  /** Çıktı mp4'ünü indirip generated-videos'a yükler + media satırı (is_ai_generated). */
  private async storeOutput(job: JobRow, videoUrl: string): Promise<string | null> {
    try {
      const resp = await fetch(videoUrl);
      if (!resp.ok) throw new Error(`indirme ${resp.status}`);
      const bytes = new Uint8Array(await resp.arrayBuffer());
      const mediaId = randomUUID();
      const path = `${job.owner_user_id}/${job.listing_id}/${mediaId}.mp4`;
      const { error: upErr } = await this.sb.storage
        .from(GENERATED_BUCKET)
        .upload(path, bytes, { contentType: 'video/mp4', upsert: true });
      if (upErr) throw upErr;

      const { error: mErr } = await this.sb.from('media').insert({
        id: mediaId,
        listing_id: job.listing_id,
        owner_user_id: job.owner_user_id,
        type: 'video',
        bucket: GENERATED_BUCKET,
        storage_path: path,
        ordinal: 999,
        is_ai_generated: true,
        processing_status: 'ready',
      });
      if (mErr) throw mErr;
      return mediaId;
    } catch (e) {
      this.logger.warn(`storeOutput failed: ${(e as Error).message}`);
      return null;
    }
  }

  private async signImageUrls(mediaIds: string[]): Promise<string[]> {
    if (mediaIds.length === 0) return [];
    const { data } = await this.sb.from('media').select('bucket, storage_path').in('id', mediaIds);
    const urls: string[] = [];
    for (const m of data ?? []) {
      const { data: signed } = await this.sb.storage
        .from(m.bucket as string)
        .createSignedUrl(m.storage_path as string, 3600);
      if (signed?.signedUrl) urls.push(signed.signedUrl);
    }
    return urls;
  }

  async getJob(userId: string, id: string): Promise<unknown> {
    const { data } = await this.sb
      .from('video_jobs')
      .select('id, listing_id, status, prompt, template_id, output_media_id, error, created_at')
      .eq('id', id)
      .eq('owner_user_id', userId)
      .maybeSingle();
    if (!data) throw new NotFoundException('İş bulunamadı');
    return data;
  }

  async listForListing(userId: string, listingId: string): Promise<unknown[]> {
    if (!listingId) throw new ForbiddenException('listing_id gerekli');
    const { data } = await this.sb
      .from('video_jobs')
      .select('id, status, prompt, template_id, output_media_id, error, created_at')
      .eq('owner_user_id', userId)
      .eq('listing_id', listingId)
      .order('created_at', { ascending: false });
    return data ?? [];
  }
}
