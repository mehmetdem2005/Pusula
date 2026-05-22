/**
 * AgentBus — agent'lar arası in-process message routing.
 * Async/queue iletişim için BullMQ wrapper, sync için direct call.
 * docs/11-multi-agent-mimarisi.md §7'ye uygun.
 */
import { z, type ZodTypeAny } from 'zod';
import type { AgentName } from '../contracts/common.js';
import type { Logger } from './Logger.js';

export interface AgentHandler<TIn extends ZodTypeAny, TOut extends ZodTypeAny> {
  name: AgentName;
  inputSchema: TIn;
  outputSchema: TOut;
  handle(input: z.infer<TIn>): Promise<z.infer<TOut>>;
}

export class AgentBus {
  private handlers = new Map<AgentName, AgentHandler<ZodTypeAny, ZodTypeAny>>();

  constructor(private logger: Logger) {}

  register<TIn extends ZodTypeAny, TOut extends ZodTypeAny>(
    handler: AgentHandler<TIn, TOut>
  ): void {
    if (this.handlers.has(handler.name)) {
      throw new Error(`Agent ${handler.name} already registered`);
    }
    this.handlers.set(handler.name, handler as AgentHandler<ZodTypeAny, ZodTypeAny>);
  }

  async call<TIn, TOut>(
    targetAgent: AgentName,
    input: TIn,
    options: { traceId: string; timeoutMs?: number } = { traceId: crypto.randomUUID() }
  ): Promise<TOut> {
    const handler = this.handlers.get(targetAgent);
    if (!handler) {
      throw new Error(`Agent ${targetAgent} not registered`);
    }

    // Input validation
    const parseResult = handler.inputSchema.safeParse(input);
    if (!parseResult.success) {
      this.logger.error('Agent input validation failed', parseResult.error, {
        agent_name: targetAgent,
        trace_id: options.traceId,
      });
      throw new Error(`Invalid input for agent ${targetAgent}: ${parseResult.error.message}`);
    }

    const start = Date.now();
    this.logger.info('Agent call start', {
      agent_name: targetAgent,
      trace_id: options.traceId,
    });

    try {
      const output = await handler.handle(parseResult.data);

      // Output validation (contract enforcement)
      const outputCheck = handler.outputSchema.safeParse(output);
      if (!outputCheck.success) {
        this.logger.error('Agent output violates contract', outputCheck.error, {
          agent_name: targetAgent,
          trace_id: options.traceId,
        });
        throw new Error(`Output contract violation for ${targetAgent}`);
      }

      const duration = Date.now() - start;
      this.logger.info('Agent call success', {
        agent_name: targetAgent,
        trace_id: options.traceId,
        duration_ms: duration,
      });

      return output as TOut;
    } catch (err) {
      const duration = Date.now() - start;
      this.logger.error('Agent call failed', err, {
        agent_name: targetAgent,
        trace_id: options.traceId,
        duration_ms: duration,
      });
      throw err;
    }
  }
}
