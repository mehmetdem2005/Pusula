import { Global, Logger, Module, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { loadEnv } from '../config/env.schema.js';
import { Q, type QueueName } from './queue.tokens.js';

/**
 * BullMQ wrapper — dinamik import, paket veya Redis yoksa no-op moduna düşer.
 *
 * Producer: enqueue() ile job at.
 * Worker: registerWorker(name, processor) — Render/k8s'te ayrı dyno olarak çalıştır.
 */
@Injectable()
export class QueueService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(QueueService.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queues = new Map<QueueName, any>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private workers: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private connection: any = null;
  private available = false;

  async onModuleInit(): Promise<void> {
    const env = loadEnv();
    try {
      const { Queue } = await import('bullmq').catch(() => ({ Queue: null }) as never);
      const { Redis } = await import('ioredis').catch(() => ({ Redis: null }) as never);
      if (!Queue || !Redis) {
        this.logger.warn('bullmq veya ioredis yüklü değil — kuyruk no-op modunda');
        return;
      }
      this.connection = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });
      for (const name of Object.values(Q)) {
        this.queues.set(name, new Queue(name, { connection: this.connection }));
      }
      this.available = true;
      this.logger.log(`BullMQ ${this.queues.size} kuyruk hazır`);
    } catch (err) {
      this.logger.warn(`Kuyruk init başarısız: ${(err as Error).message}`);
    }
  }

  async enqueue<T extends object>(
    name: QueueName,
    data: T,
    opts: { jobId?: string; delay?: number; attempts?: number } = {},
  ): Promise<void> {
    const q = this.queues.get(name);
    if (!q) {
      this.logger.warn(`Kuyruk ${name} yok — job atılmadı (no-op)`);
      return;
    }
    await q.add(name, data, {
      jobId: opts.jobId,
      delay: opts.delay,
      attempts: opts.attempts ?? 3,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: { age: 86_400, count: 5_000 },
      removeOnFail: { age: 7 * 86_400 },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async registerWorker(name: QueueName, processor: (job: any) => Promise<unknown>): Promise<void> {
    if (!this.available) return;
    const { Worker } = await import('bullmq');
    const w = new Worker(name, processor, {
      connection: this.connection,
      concurrency: 4,
    });
    w.on('failed', (job, err) => {
      this.logger.error(`Worker ${name} failed: ${err.message}`, { job_id: job?.id });
    });
    this.workers.push(w);
  }

  async onApplicationShutdown(): Promise<void> {
    for (const w of this.workers) {
      await w.close().catch(() => {});
    }
    for (const q of this.queues.values()) {
      await q.close().catch(() => {});
    }
    await this.connection?.quit().catch(() => {});
  }
}

@Global()
@Module({
  providers: [QueueService],
  exports: [QueueService],
})
export class QueueModule {}
