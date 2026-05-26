'use client'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { getSupabaseBrowserClient } from '../lib/supabase/client'

/**
 * Notebook Realtime — multi-device sync
 * ======================================
 *
 * Supabase Realtime channel subscribe:
 *   - notebook_sources status değişikliği (PDF işleme bittiğinde push)
 *   - notebook_messages yeni mesaj (mobile'dan eklenirse anında web'de görünür)
 *   - generated_content status (podcast hazır olunca bildir)
 *
 * Strategy: invalidateQueries on event, optimistic UI'yı bozmadan.
 */

export function useNotebookRealtime(notebookId: string | null) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!notebookId) return
    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel(`notebook:${notebookId}`)

      // Sources updates (status: pending → processing → ready)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notebook_sources',
          filter: `notebook_id=eq.${notebookId}`,
        },
        () => qc.invalidateQueries({ queryKey: ['notebook-sources', notebookId] }),
      )

      // New messages (mobile'dan gelirse web'de göster)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notebook_messages',
          filter: `notebook_id=eq.${notebookId}`,
        },
        () => qc.invalidateQueries({ queryKey: ['notebook-messages', notebookId] }),
      )

      // Studio outputs ready
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'generated_content',
          filter: `notebook_id=eq.${notebookId}`,
        },
        () => qc.invalidateQueries({ queryKey: ['notebook-studio', notebookId] }),
      )

      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [notebookId, qc])
}

/**
 * Clan messages realtime
 */
export function useClanRealtime(clanId: string | null) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!clanId) return
    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel(`clan:${clanId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clan_messages',
          filter: `clan_id=eq.${clanId}`,
        },
        () => qc.invalidateQueries({ queryKey: ['clan-messages', clanId] }),
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [clanId, qc])
}
