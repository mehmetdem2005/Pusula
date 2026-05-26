'use client'
import { getSupabaseBrowserClient } from './supabase/client'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'https://api.kavra.app'

export async function apiFetch<T = any>(
  path: string,
  init?: RequestInit & { body?: any },
): Promise<T> {
  const supabase = getSupabaseBrowserClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as any),
  }
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`
  }

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers })

  if (!res.ok) {
    const text = await res.text()
    let parsed: any = null
    try {
      parsed = JSON.parse(text)
    } catch {}
    const err = new Error(parsed?.message ?? parsed?.error ?? text) as any
    err.status = res.status
    err.body = parsed
    throw err
  }

  if (res.status === 204) return null as any
  return await res.json()
}
