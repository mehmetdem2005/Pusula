/**
 * OpenTelemetry tracing adapter.
 * docs/15-observability-ve-slo.md §4'e uygun.
 */
import { trace, type Tracer, type Span, SpanStatusCode } from '@opentelemetry/api';

export interface TelemetryProvider {
  tracer: Tracer;
  startSpan(name: string, attributes?: Record<string, string | number | boolean>): Span;
  recordError(span: Span, error: Error | unknown): void;
}

export class OtelTelemetry implements TelemetryProvider {
  readonly tracer: Tracer;

  constructor(serviceName = 'pusula-agents') {
    this.tracer = trace.getTracer(serviceName);
  }

  startSpan(name: string, attributes: Record<string, string | number | boolean> = {}): Span {
    const span = this.tracer.startSpan(name);
    for (const [key, value] of Object.entries(attributes)) {
      span.setAttribute(key, value);
    }
    return span;
  }

  recordError(span: Span, error: Error | unknown): void {
    span.setStatus({ code: SpanStatusCode.ERROR });
    if (error instanceof Error) {
      span.recordException(error);
    } else {
      span.recordException(new Error(String(error)));
    }
  }
}
