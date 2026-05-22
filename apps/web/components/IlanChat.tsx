'use client';

import { useRef, useState, type ReactElement } from 'react';
import { authedFetch } from '../lib/api';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTIONS = [
  'Bu skoru açıkla',
  'Pazarlık payı ne olur?',
  'Yatırım için uygun mu?',
  'Riskler neler?',
];

/**
 * İlan detay AI sohbet paneli — platform AI (key girişsiz) ile.
 * `context` skor/ilan özetini içeren system promptudur; LLM skoru değiştirmez, yorumlar.
 */
export function IlanChat({ context }: { context: string }): ReactElement {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    setError(null);
    const next: Msg[] = [...messages, { role: 'user', content: q }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const resp = await authedFetch<{ text: string }>('/v1/llm/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'system', content: context }, ...next],
          options: { taskType: 'quick-chat' },
        }),
      });
      setMessages((m) => [...m, { role: 'assistant', content: resp.text }]);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 1e9 }));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg bg-white p-6">
      <h2 className="mb-3 text-lg font-semibold">AI Danışman</h2>

      {messages.length === 0 && (
        <p className="mb-3 text-sm text-slate-500">
          Skor hakkında soru sor — pazarlık, yatırım, riskler. Yapay zeka uygulama içinde sağlanır.
        </p>
      )}

      <div ref={scrollRef} className="mb-3 max-h-80 space-y-3 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'text-right' : 'text-left'}>
            <span
              className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                m.role === 'user' ? 'bg-[#0F1F4B] text-white' : 'bg-slate-100 text-slate-800'
              }`}
            >
              {m.content}
            </span>
          </div>
        ))}
        {loading && <p className="text-sm text-slate-400">Düşünüyor…</p>}
      </div>

      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

      <div className="mb-2 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={loading}
            onClick={() => void send(s)}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Bir soru yazın…"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1F4B]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-md bg-[#D4A22E] px-4 py-2 text-sm font-semibold text-[#0F1F4B] disabled:opacity-60"
        >
          Gönder
        </button>
      </form>
    </div>
  );
}
