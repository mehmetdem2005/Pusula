'use client'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { ChatPanel } from '../../../../components/notebook/ChatPanel'
import { SourcesPanel } from '../../../../components/notebook/SourcesPanel'
import { StudioPanel } from '../../../../components/notebook/StudioPanel'
import { useNotebookRealtime } from '../../../../hooks/useNotebookRealtime'
import { apiFetch } from '../../../../lib/api'

export default function NotebookDetailPage() {
  const params = useParams()
  const id = params.id as string

  const { data: notebook } = useQuery({
    queryKey: ['notebook', id],
    queryFn: () => apiFetch<any>(`/api/notebooks/${id}`),
    enabled: !!id,
  })

  const { data: sourcesData } = useQuery({
    queryKey: ['notebook-sources', id],
    queryFn: () => apiFetch<{ sources: any[] }>(`/api/notebooks/${id}/sources`),
    enabled: !!id,
  })

  // Realtime sync — kaynak status değişikliklerini push'la
  useNotebookRealtime(id)

  const [activeSourceId, setActiveSourceId] = useState<string | null>(null)

  if (!notebook) {
    return <div className="p-8 text-slate-500">Yükleniyor...</div>
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-xl text-ink-900 truncate">{notebook.notebook?.title}</h1>
          {notebook.notebook?.description && (
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {notebook.notebook.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[10px] text-slate-500 font-mono">
            {sourcesData?.sources?.length ?? 0} kaynak
          </span>
        </div>
      </header>

      {/* 3-panel split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sources panel */}
        <div className="w-80 border-r border-slate-100 overflow-y-auto bg-white">
          <SourcesPanel
            notebookId={id}
            sources={sourcesData?.sources ?? []}
            activeSourceId={activeSourceId}
            onSelectSource={setActiveSourceId}
          />
        </div>

        {/* Chat panel */}
        <div className="flex-1 min-w-0 flex flex-col">
          <ChatPanel notebookId={id} sources={sourcesData?.sources ?? []} />
        </div>

        {/* Studio panel */}
        <div className="w-96 border-l border-slate-100 overflow-y-auto bg-white">
          <StudioPanel notebookId={id} sources={sourcesData?.sources ?? []} />
        </div>
      </div>
    </div>
  )
}
