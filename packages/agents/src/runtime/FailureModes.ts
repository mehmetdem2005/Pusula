/**
 * FMEA enforcement — agent çağrılarını timeout, budget, retry guard'lar ile sarar.
 * docs/11-multi-agent-mimarisi.md §12'deki FMEA tablosuyla uyumlu.
 */

export interface ExecutionGuards {
  /** Maksimum süre (ms). Bu süreyi aşan çağrı abort edilir. */
  timeoutMs: number;
  /** Bir turn içinde toplam LLM USD bütçesi. Aşılırsa hata. */
  maxCostUsd?: number;
  /** Maksimum recursion derinliği (function call loop önleme). */
  maxDepth?: number;
  /** Retry policy. */
  retry?: {
    maxAttempts: number;
    backoffMs: number;
    retryableErrors: readonly ('timeout' | 'rate_limit' | 'server' | 'network')[];
  };
}

export const DEFAULT_GUARDS: ExecutionGuards = {
  timeoutMs: 8000,
  maxCostUsd: 0.2,
  maxDepth: 6,
  retry: {
    maxAttempts: 2,
    backoffMs: 500,
    retryableErrors: ['timeout', 'rate_limit', 'server', 'network'],
  },
};

export class GuardedExecution {
  constructor(private guards: ExecutionGuards = DEFAULT_GUARDS) {}

  async run<T>(
    name: string,
    fn: () => Promise<T>,
    overrides: Partial<ExecutionGuards> = {},
  ): Promise<T> {
    const g = { ...this.guards, ...overrides };
    return this.withTimeout(g.timeoutMs, () => this.withRetry(g, name, fn));
  }

  private async withTimeout<T>(ms: number, fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new TimeoutError(ms)), ms);
      fn().then(
        (val) => {
          clearTimeout(t);
          resolve(val);
        },
        (err) => {
          clearTimeout(t);
          reject(err);
        },
      );
    });
  }

  private async withRetry<T>(g: ExecutionGuards, name: string, fn: () => Promise<T>): Promise<T> {
    const retry = g.retry;
    if (!retry) return fn();
    let lastErr: unknown;
    for (let attempt = 0; attempt < retry.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (!this.isRetryable(err, retry.retryableErrors)) throw err;
        await this.sleep(retry.backoffMs * (attempt + 1));
      }
    }
    throw lastErr;
  }

  private isRetryable(err: unknown, retryable: readonly string[]): boolean {
    if (err instanceof TimeoutError) return retryable.includes('timeout');
    const e = err as { kind?: string };
    return !!e.kind && retryable.includes(e.kind);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }
}

export class TimeoutError extends Error {
  constructor(public timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

export class BudgetExceededError extends Error {
  constructor(
    public spent: number,
    public budget: number,
  ) {
    super(`Budget exceeded: spent $${spent} / budget $${budget}`);
    this.name = 'BudgetExceededError';
  }
}
