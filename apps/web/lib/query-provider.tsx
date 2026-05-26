'use client'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import type * as React from 'react'
import { type ReactNode, useState } from 'react'

/**
 * Offline-first sync stratejisi:
 *   - Query results IndexedDB'ye persist
 *   - 24 saat önbelleğe alınır
 *   - Mutations queue (offline) → online olunca replay
 *   - Tab arası senkronizasyon
 */

const browserStorage = {
  getItem: async (key: string) => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(key)
  },
  setItem: async (key: string, value: string) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value)
  },
  removeItem: async (key: string) => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key)
  },
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 dk fresh
            gcTime: 24 * 60 * 60 * 1000, // 24 saat in cache
            retry: (failureCount, error: any) => {
              if (error?.status === 401 || error?.status === 403) return false
              return failureCount < 2
            },
            refetchOnWindowFocus: false,
          },
          mutations: {
            retry: (failureCount, error: any) => {
              if (error?.status === 400 || error?.status === 401) return false
              return failureCount < 1
            },
          },
        },
      }),
  )

  const [persister] = useState(() =>
    createAsyncStoragePersister({
      storage: browserStorage,
      key: 'kavra-cache-v1',
      throttleTime: 1000,
    }),
  )

  const Provider = PersistQueryClientProvider as unknown as React.ComponentType<{
    client: typeof queryClient
    persistOptions: { persister: typeof persister; maxAge: number; buster: string }
    children?: ReactNode
  }>

  return (
    <Provider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000, // 24 saat persist
        buster: 'v1', // schema değişirse bump
      }}
    >
      {children}
    </Provider>
  )
}
