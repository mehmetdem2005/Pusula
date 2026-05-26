import Constants from 'expo-constants'
import { supabase } from './supabase'

const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  Constants.expoConfig?.extra?.apiBaseUrl ??
  'http://localhost:4001'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function apiFetch<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const auth = await getAuthHeader()
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...auth,
      ...(init?.headers ?? {}),
    },
  })

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await res.json() : await res.text()

  if (!res.ok) {
    throw new ApiError(
      (body as any)?.message ?? (body as any)?.error ?? res.statusText,
      res.status,
      body,
    )
  }
  return body as T
}

/**
 * SSE streaming. onDelta her "data: X\n\n" parçasında çağrılır.
 * Parça JSON olabilir (meta veya delta), raw string döndürülür — parse tüketiciye bırakılır.
 */
export async function apiStream(
  path: string,
  body: unknown,
  onDelta: (raw: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const auth = await getAuthHeader()
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...auth,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!res.ok) {
    const err = await res.text()
    throw new ApiError(err, res.status)
  }
  if (!res.body) throw new ApiError('No response body', 500)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') return

      try {
        const json = JSON.parse(data)
        if (json.error) throw new ApiError(json.error, 500)
      } catch (e) {
        if (e instanceof ApiError) throw e
      }
      onDelta(data)
    }
  }
}
