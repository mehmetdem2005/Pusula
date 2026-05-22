/**
 * Structured logger interface. Implementasyon pino veya benzeri.
 * docs/15-observability-ve-slo.md §2'ye uygun.
 */

export interface LogContext {
  trace_id?: string;
  span_id?: string;
  user_id?: string;
  agent_name?: string;
  ilan_id?: string;
  intent?: string;
  persona?: string;
  [key: string]: unknown;
}

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error | unknown, context?: LogContext): void;
  child(bindings: LogContext): Logger;
}

/** Geçici no-op logger — gerçek implementation pino ile. */
export class NoopLogger implements Logger {
  debug(): void {
    /* noop */
  }
  info(): void {
    /* noop */
  }
  warn(): void {
    /* noop */
  }
  error(): void {
    /* noop */
  }
  child(): Logger {
    return this;
  }
}
