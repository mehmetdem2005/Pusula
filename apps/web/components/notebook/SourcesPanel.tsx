'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Globe2, Mic, Plus, Trash2, Upload, X, Youtube } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { toast } from 'sonner'
import { apiFetch } from '../../lib/api'
import { getSupabaseBrowserClient } from '../../lib/supabase/client'

interface Source {
  id: string
  title: string
  source_type: string
  status: string
  external_url: string | null
  char_count: number
  created_at: string
}

interface Props {
  notebookId: string
  sources: Source[]
  activeSourceId: string | null
  onSelectSource: (id: string | null) => void
}

const TYPE_ICONS: Record<string, any> = {
  pdf: FileText,
  text: FileText,
  url: Globe2,
  audio: Mic,
  youtube: Youtube,
}

export function SourcesPanel({ notebookId, sources, activeSourceId, onSelectSource }: Props) {
  const qc = useQueryClient()
  const [dragActive, setDragActive] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const supabase = getSupabaseBrowserClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Önce giriş yap')

      // Direct Supabase Storage upload
      const path = `${user.id}/uploads/${Date.now()}-${file.name}`
      const { error: uploadErr } = await supabase.storage
        .from('user-uploads')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadErr) throw uploadErr

      // Backend'e bildir → işleme alır
      return apiFetch('/api/sources/upload', {
        method: 'POST',
        body: JSON.stringify({
          notebookId,
          storagePath: path,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        }),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notebook-sources', notebookId] })
      toast.success('Kaynak ekleniyor...')
    },
    onError: (e: any) => toast.error(e.message),
  })

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      const files = Array.from(e.dataTransfer.files)
      files.forEach((f) => uploadMut.mutate(f))
    },
    [uploadMut],
  )

  const deleteMut = useMutation({
    mutationFn: (sourceId: string) => apiFetch(`/api/sources/${sourceId}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notebook-sources', notebookId] }),
  })

  return (
    <div
      className={`h-full flex flex-col ${dragActive ? 'bg-amber-50' : 'bg-white'}`}
      onDragEnter={(e) => {
        e.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setDragActive(false)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <h2 className="font-mono text-[10px] text-slate-500 tracking-widest uppercase">
          Kaynaklar ({sources.length})
        </h2>
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="text-ink-900 hover:text-amber-600"
          aria-label="Kaynak ekle"
        >
          <Plus size={18} />
        </button>
      </div>

      {showAddMenu && (
        <div className="p-3 border-b border-slate-100 bg-cream-50 space-y-2">
          <button
            onClick={() => fileInput.current?.click()}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-left hover:border-amber-300 flex items-center gap-2"
          >
            <Upload size={14} className="text-amber-500" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-ink-900">PDF / Ses / Doküman</div>
              <div className="text-[10px] text-slate-500">Bilgisayardan yükle</div>
            </div>
          </button>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept=".pdf,.txt,.md,.epub,.mp3,.wav,.m4a"
            onChange={(e) => {
              if (e.target.files) Array.from(e.target.files).forEach((f) => uploadMut.mutate(f))
              setShowAddMenu(false)
            }}
            hidden
          />

          <UrlInput notebookId={notebookId} onClose={() => setShowAddMenu(false)} />
          <YoutubeInput notebookId={notebookId} onClose={() => setShowAddMenu(false)} />
        </div>
      )}

      {dragActive && (
        <div className="flex-1 flex items-center justify-center border-2 border-dashed border-amber-400 m-3 rounded-2xl">
          <div className="text-center">
            <Upload size={32} className="text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-ink-900 font-semibold">Dosyayı bırak</p>
            <p className="text-xs text-slate-500">PDF, ses, EPUB</p>
          </div>
        </div>
      )}

      {!dragActive && (
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {sources.length === 0 && (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-slate-500">Henüz kaynak yok</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Bir dosyayı sürükle veya yukarıdan ekle
              </p>
            </div>
          )}

          {sources.map((s) => {
            const Icon = TYPE_ICONS[s.source_type] ?? FileText
            const isActive = activeSourceId === s.id
            return (
              <button
                key={s.id}
                onClick={() => onSelectSource(isActive ? null : s.id)}
                className={`w-full text-left rounded-xl p-2.5 flex items-center gap-2.5 transition-colors ${
                  isActive
                    ? 'bg-amber-50 border border-amber-300'
                    : 'bg-cream-50 border border-transparent hover:border-slate-200'
                }`}
              >
                <Icon size={16} className="text-slate-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-ink-900 truncate">{s.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {s.status === 'ready'
                      ? `${(s.char_count / 1000).toFixed(1)}k karakter`
                      : statusLabel(s.status)}
                  </div>
                </div>
                {s.status === 'processing' && (
                  <div className="w-3 h-3 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm('Sil?')) deleteMut.mutate(s.id)
                  }}
                  className="text-slate-300 hover:text-red-500 flex-shrink-0"
                >
                  <X size={12} />
                </button>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function statusLabel(s: string): string {
  switch (s) {
    case 'pending':
      return 'Sırada...'
    case 'processing':
      return 'İşleniyor...'
    case 'failed':
      return 'Hata'
    default:
      return s
  }
}

function UrlInput({ notebookId, onClose }: { notebookId: string; onClose: () => void }) {
  const [url, setUrl] = useState('')
  const qc = useQueryClient()
  const mut = useMutation({
    mutationFn: () =>
      apiFetch('/api/sources', {
        method: 'POST',
        body: JSON.stringify({ notebookId, sourceType: 'url', externalUrl: url }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notebook-sources', notebookId] })
      onClose()
      toast.success('Web sayfası ekleniyor...')
    },
  })

  return (
    <div className="flex gap-1">
      <input
        type="url"
        placeholder="https://..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
      />
      <button
        onClick={() => mut.mutate()}
        disabled={!url || mut.isPending}
        className="bg-ink-900 text-cream-50 rounded-xl px-3 text-xs font-semibold disabled:opacity-50"
      >
        Ekle
      </button>
    </div>
  )
}

function YoutubeInput({ notebookId, onClose }: { notebookId: string; onClose: () => void }) {
  const [url, setUrl] = useState('')
  const qc = useQueryClient()
  const mut = useMutation({
    mutationFn: () =>
      apiFetch('/api/sources', {
        method: 'POST',
        body: JSON.stringify({
          notebookId,
          sourceType: 'youtube',
          externalUrl: url,
          title: 'YouTube Video',
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notebook-sources', notebookId] })
      onClose()
      toast.success('YouTube transkripti çekiliyor...')
    },
  })

  return (
    <div className="flex gap-1">
      <input
        type="url"
        placeholder="youtube.com/watch?v=..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs"
      />
      <button
        onClick={() => mut.mutate()}
        disabled={!url || mut.isPending}
        className="bg-ink-900 text-cream-50 rounded-xl px-3 text-xs font-semibold disabled:opacity-50"
      >
        YT
      </button>
    </div>
  )
}
