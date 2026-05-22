/**
 * Konuşma state machine — XState 5 ile.
 * docs/12-konusmasal-mod-spec.md §3'e uygun.
 */
import { createMachine, assign } from 'xstate';
import type { UserPersona, IntentClass } from '../contracts/common.js';

export interface ChatContext {
  user_id: string;
  thread_id: string;
  persona: UserPersona | null;
  active_ilan_id: string | null;
  budget_range: [number, number] | null;
  preferred_locations: string[];
  message_history: Array<{ role: 'user' | 'assistant'; content: string }>;
  last_intent: IntentClass | null;
  last_intent_confidence: number;
}

type ChatEvent =
  | { type: 'USER_REPLY'; message: string }
  | { type: 'INTENT_DETECTED'; intent: IntentClass; confidence: number; persona?: UserPersona }
  | { type: 'PERSONA_CHANGED'; persona: UserPersona }
  | { type: 'ANALYZE_REQUEST' }
  | { type: 'COMPARE_REQUEST' }
  | { type: 'NEGOTIATE_REQUEST' }
  | { type: 'MARKETING_REQUEST' }
  | { type: 'RESEARCH_REQUEST' }
  | { type: 'FAREWELL' };

export function createChatMachine(initialContext: Partial<ChatContext> = {}) {
  return createMachine({
    id: 'pusulaChat',
    initial: 'greeting',
    types: {} as { context: ChatContext; events: ChatEvent },
    context: {
      user_id: '',
      thread_id: '',
      persona: null,
      active_ilan_id: null,
      budget_range: null,
      preferred_locations: [],
      message_history: [],
      last_intent: null,
      last_intent_confidence: 0,
      ...initialContext,
    },
    states: {
      greeting: {
        on: {
          USER_REPLY: { target: 'intentDetection' },
        },
      },
      intentDetection: {
        on: {
          INTENT_DETECTED: [
            { target: 'clarify', guard: ({ event }) => event.confidence < 0.65 },
            { target: 'personaLocked', guard: ({ event }) => !!event.persona,
              actions: assign({ persona: ({ event }) => event.persona ?? null }) },
            { target: 'taskLoop',
              actions: assign({ last_intent: ({ event }) => event.intent }) },
          ],
        },
      },
      clarify: {
        on: { USER_REPLY: { target: 'intentDetection' } },
      },
      personaLocked: {
        always: { target: 'taskLoop' },
      },
      taskLoop: {
        on: {
          USER_REPLY: { target: 'intentDetection' },
          ANALYZE_REQUEST: 'analyzing',
          COMPARE_REQUEST: 'comparing',
          NEGOTIATE_REQUEST: 'negotiating',
          MARKETING_REQUEST: 'marketing',
          RESEARCH_REQUEST: 'researching',
          PERSONA_CHANGED: {
            target: 'personaLocked',
            actions: assign({ persona: ({ event }) => event.persona }),
          },
          FAREWELL: 'farewell',
        },
      },
      analyzing: { on: { USER_REPLY: 'taskLoop' } },
      comparing: { on: { USER_REPLY: 'taskLoop' } },
      negotiating: { on: { USER_REPLY: 'taskLoop' } },
      marketing: { on: { USER_REPLY: 'taskLoop' } },
      researching: { on: { USER_REPLY: 'taskLoop' } },
      farewell: { type: 'final' },
    },
  });
}
