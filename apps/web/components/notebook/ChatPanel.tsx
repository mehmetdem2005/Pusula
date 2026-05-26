'use client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send, Sparkles } from 'lucide-react'
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdownImport from 'react-markdown'
import remarkGfm from 'remark-gfm'

const ReactMarkdown = ReactMarkdownImport as unknown as React.ComponentType<{
  children?: React.ReactNode
  remarkPlugins?: unknown[]
}>
import { apiFetch } from '../../lib/api'

interface Source {
  id: string
  title: string
  source_type: string
  youtube_video_id?: string
}
interface Citation {
  chunk_id: string
  source_id: string
  source_title: string
  snippet: string
  page_number: number | null
  start_time_ms: number | null
}
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  created_at: string
}

const SUGGESTIONS = [
  'Bu kaynaklarda ana fikir ne?',
  'En önemli 5 kavramı listele',
  '3 paragrafta özetle',
  'Sınavda çıkabilecek soruları çıkar',
  'Karşılaştırmalı tablo yap',
]

export function ChatPanel({ notebookId, sources }: { notebookId: string; sources: Source[] }) {
  const qc = useQueryClient()
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data } = useQuery({
    queryKey: ['notebook-messages', notebookId],
    queryFn: () => apiFetch<{ messages: Message[] }>(`/api/notebooks/${notebookId}/messages`),
    enabled: !!notebookId,
  })

  const messages = data?.messages ?? []

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const sendMut = useMutation({
    mutationFn: (message: string) =>
      apiFetch(`/api/notebooks/${notebookId}/chat`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
    onMutate: async (message) => {
      // Optimistic
      const optimistic: Message = {
        id: `optim-${Date.now()}`,
        role: 'user',
        content: message,
        created_at: new Date().toISOString(),
      }
      qc.setQueryData(['notebook-messages', notebookId], (old: any) => ({
        messages: [...(old?.messages ?? []), optimistic],
      }))
      setInput('')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notebook-messages', notebookId] }),
    onError: () => {
      qc.invalidateQueries({ queryKey: ['notebook-messages', notebookId] })
    },
  })

  const sourceCount = sources.filter((s) => (s as any).status === 'ready').length

  return (
    <div className="h-full flex flex-col bg-cream-50">
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        {messages.length === 0 ? (
          <EmptyChat sources={sources} onSelectSuggestion={(s) => sendMut.mutate(s)} />
        ) : (
          <div className="max-w-3xl mx-auto px-6 py-6">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} sources={sources} />
            ))}
            {sendMut.isPending && (
              <div className="flex gap-3 mb-6">
                <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={14} className="text-ink-900" />
                </div>
                <div className="flex-1 pt-1.5">
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 bg-white p-4">
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (input.trim() && sourceCount > 0) sendMut.mutate(input.trim())
            }}
            className="flex gap-2 bg-cream-50 rounded-2xl border border-slate-200 p-1.5"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (input.trim() && sourceCount > 0) sendMut.mutate(input.trim())
                }
              }}
              placeholder={sourceCount === 0 ? 'Önce kaynak ekle...' : 'Bir şey sor...'}
              disabled={sourceCount === 0 || sendMut.isPending}
              rows={1}
              className="flex-1 resize-none bg-transparent border-none outline-none px-3 py-2 text-sm max-h-32"
            />
            <button
              type="submit"
              disabled={!input.trim() || sendMut.isPending || sourceCount === 0}
              className="bg-ink-900 text-cream-50 rounded-xl px-3 py-2 disabled:opacity-30"
            >
              <Send size={14} />
            </button>
          </form>
          <p className="text-[10px] text-slate-400 text-center mt-2">
            {sourceCount} hazır kaynaktan cevaplıyor · ⏎ gönder · ⇧⏎ yeni satır
          </p>
        </div>
      </div>
    </div>
  )
}

function EmptyChat({
  sources,
  onSelectSuggestion,
}: { sources: Source[]; onSelectSuggestion: (s: string) => void }) {
  const sourceCount = sources.filter((s: any) => s.status === 'ready').length

  return (
    <div className="h-full flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500 flex items-center justify-center mx-auto mb-4">
          <Sparkles size={24} className="text-ink-900" />
        </div>
        <h2 className="font-serif text-2xl text-ink-900">Bir şey sor</h2>
        <p className="text-sm text-slate-600 mt-2 mb-6">
          {sourceCount > 0
            ? `${sourceCount} hazır kaynaktan kaynak gösterimli cevap alacaksın.`
            : 'Sol panelden bir kaynak ekle, sonra sor.'}
        </p>

        {sourceCount > 0 && (
          <div className="space-y-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => onSelectSuggestion(s)}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-left hover:border-amber-300 hover:bg-amber-50 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MessageBubble({ message, sources }: { message: Message; sources: Source[] }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-6">
        <div className="bg-ink-900 text-cream-50 rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-sm">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 mb-6">
      <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
        <Sparkles size={14} className="text-ink-900" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-ink-900 leading-6 prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content.replace(/\[\[(\d+)\]\]/g, '`[$1]`')}
          </ReactMarkdown>
        </div>

        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {message.citations.slice(0, 5).map((c, i) => (
              <CitationCard key={i} index={i + 1} citation={c} sources={sources} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CitationCard({
  index,
  citation,
  sources,
}: { index: number; citation: Citation; sources: Source[] }) {
  const source = sources.find((s) => s.id === citation.source_id)
  const isYoutube = source?.source_type === 'youtube' && citation.start_time_ms != null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex gap-2 cursor-default">
      <div className="bg-amber-500 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] text-ink-900 font-bold">{index}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-ink-900 font-semibold truncate">
          {citation.source_title}
          {citation.page_number && ` · s.${citation.page_number}`}
          {isYoutube &&
            citation.start_time_ms != null &&
            ` · ${formatTimestamp(citation.start_time_ms)}`}
        </p>
        <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-2">{citation.snippet}</p>
      </div>
    </div>
  )
}

function formatTimestamp(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
