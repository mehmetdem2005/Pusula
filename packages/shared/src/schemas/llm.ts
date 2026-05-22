import { z } from 'zod';

export const Provider = z.enum(['groq', 'gemini', 'deepseek', 'anthropic', 'openai', 'openrouter']);
export type Provider = z.infer<typeof Provider>;

export const TaskType = z.enum([
  'quick-chat',
  'score-explanation',
  'marketing-copy',
  'reasoning',
  'vision',
  'long-report',
]);
export type TaskType = z.infer<typeof TaskType>;

export const KeySource = z.enum(['user_byok', 'platform_pool']);
export type KeySource = z.infer<typeof KeySource>;

export const ContentPart = z.union([
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({ type: z.literal('image'), image_url: z.string().url().optional(), image_base64: z.string().optional() }),
]);
export type ContentPart = z.infer<typeof ContentPart>;

export const ChatMessage = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.union([z.string(), z.array(ContentPart)]),
  name: z.string().optional(),
  tool_call_id: z.string().optional(),
});
export type ChatMessage = z.infer<typeof ChatMessage>;

export const ToolDefinition = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.record(z.unknown()), // JSON Schema
});
export type ToolDefinition = z.infer<typeof ToolDefinition>;

export const ChatOptions = z.object({
  taskType: TaskType,
  provider: Provider.optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().optional(),
  jsonSchema: z.record(z.unknown()).optional(),
  tools: z.array(ToolDefinition).optional(),
  stream: z.boolean().default(false),
});
export type ChatOptions = z.infer<typeof ChatOptions>;

export const Usage = z.object({
  input: z.number().int().min(0),
  output: z.number().int().min(0),
  total: z.number().int().min(0),
});
export type Usage = z.infer<typeof Usage>;

export const ChatResponse = z.object({
  text: z.string(),
  usage: Usage,
  cost_usd: z.number().min(0),
  provider: Provider,
  model: z.string(),
  finish_reason: z.string(),
  latency_ms: z.number().int().min(0),
});
export type ChatResponse = z.infer<typeof ChatResponse>;
