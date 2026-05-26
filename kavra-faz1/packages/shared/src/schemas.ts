import { z } from 'zod'

// ============================================================================
// API Key
// ============================================================================
export const AddApiKeySchema = z.object({
  provider: z.enum(['groq', 'openai', 'anthropic']).default('groq'),
  label: z.string().min(1).max(50),
  key: z.string().min(20).max(200),
})
export type AddApiKeyInput = z.infer<typeof AddApiKeySchema>

// ============================================================================
// Chat
// ============================================================================
export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
})

export const SendMessageSchema = z.object({
  lessonId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  modelId: z.string().uuid().optional(),
  attachmentIds: z.array(z.string().uuid()).optional(),
})
export type SendMessageInput = z.infer<typeof SendMessageSchema>

// ============================================================================
// Lesson
// ============================================================================
export const StartLessonSchema = z.object({
  subjectId: z.string().uuid().optional(),
  conceptId: z.string().uuid().optional(),
  techniqueCode: z.string().optional(),
  personalityId: z.string().uuid().optional(),
  modelId: z.string().uuid().optional(),
})
export type StartLessonInput = z.infer<typeof StartLessonSchema>

// ============================================================================
// Voice
// ============================================================================
export const TranscribeSchema = z.object({
  audioStoragePath: z.string(),
  language: z.string().length(2).optional(),
})

export const SynthesizeSchema = z.object({
  text: z.string().min(1).max(5000),
  language: z.string().length(2).default('tr'),
  voice: z.string().optional(),
  speed: z.number().min(0.5).max(2.0).default(1.0),
})
export type SynthesizeInput = z.infer<typeof SynthesizeSchema>

// ============================================================================
// Subject & Concept
// ============================================================================
export const CreateSubjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  targetLevel: z.string().optional(),
  targetDate: z.string().optional(), // ISO date
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
  icon: z.string().optional(),
})

// ============================================================================
// Reflection / Journal
// ============================================================================
export const CreateReflectionSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  content: z.string().min(1).max(5000),
  mood: z.number().int().min(1).max(5).optional(),
  energy: z.number().int().min(1).max(5).optional(),
})

// ============================================================================
// Preferences
// ============================================================================
export const UpdatePreferencesSchema = z.object({
  uiLanguage: z.enum(['tr', 'en']).optional(),
  contentLanguage: z.string().length(2).optional(),
  themeMode: z.enum(['light', 'dark', 'system']).optional(),
  colorTheme: z.string().optional(),
  fontSize: z.enum(['small', 'medium', 'large']).optional(),
  ttsMode: z.enum(['device', 'server', 'auto', 'off']).optional(),
  ttsVoice: z.string().optional(),
  ttsSpeed: z.number().min(0.5).max(2.0).optional(),
  voiceModeDefault: z.enum(['push_to_talk', 'continuous']).optional(),
  dailyGoalMinutes: z.number().int().min(5).max(480).optional(),
  defaultPersonalityId: z.string().uuid().optional(),
})
