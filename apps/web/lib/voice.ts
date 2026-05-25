'use client';

// Paylaşılan ses yardımcıları — canlı dikte (Web Speech API) + cümle segmentasyonu (TTS için).

export interface SRAlternative {
  transcript: string;
}
export interface SRResult {
  isFinal: boolean;
  0: SRAlternative;
}
export interface SREvent {
  resultIndex: number;
  results: { length: number; [i: number]: SRResult };
}
export interface SRInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
}
export type SRCtor = new () => SRInstance;

export function getSpeechRecognition(): SRCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SRCtor;
    webkitSpeechRecognition?: SRCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const SENTENCE_TERMINATORS = '.!?…\n';

/** Akan metni tamamlanmış cümlelere böler (sınır = sonlandırıcı + boşluk/satır). */
export function segmentSentences(text: string): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  let last = 0;
  for (let i = 0; i < text.length; i++) {
    if (!SENTENCE_TERMINATORS.includes(text[i]!)) continue;
    let j = i;
    while (j + 1 < text.length && SENTENCE_TERMINATORS.includes(text[j + 1]!)) j++;
    const next = text[j + 1];
    if (next === ' ' || next === '\n' || next === '\t') {
      const s = text.slice(last, j + 1).trim();
      if (s) sentences.push(s);
      last = j + 1;
    }
    i = j;
  }
  return { sentences, rest: text.slice(last) };
}

/** Tam metni seslendirme parçalarına böler. */
export function splitForSpeech(text: string): string[] {
  const { sentences, rest } = segmentSentences(text);
  const tail = rest.trim();
  if (tail) sentences.push(tail);
  return sentences;
}
