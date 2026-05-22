/**
 * Service Worker — extension background.
 *
 * Sorumluluklar:
 *  1. Content script ↔ side panel mesaj routing
 *  2. Web app ile auth bridge (session token paylaşımı)
 *  3. Backend API client (fetch + retry + auth header)
 *  4. Side panel açma/kapama action
 */

const API_BASE =
  (globalThis as { VITE_API_BASE_URL?: string }).VITE_API_BASE_URL ?? 'https://api.pusula.tr';
const WEB_BASE =
  (globalThis as { VITE_WEB_BASE_URL?: string }).VITE_WEB_BASE_URL ?? 'https://app.pusula.tr';

interface AuthState {
  jwt?: string;
  user_id?: string;
  expires_at?: number;
}

const state: { auth: AuthState } = { auth: {} };

chrome.runtime.onInstalled.addListener(() => {
  console.info('[Pusula] extension installed');
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  await chrome.sidePanel.open({ tabId: tab.id });
});

function decodeJwtExp(token: string): number | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const padded = part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/'))) as {
      exp?: number;
    };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Web app'in @supabase/ssr oturum cookie'sinden access_token'ı çıkar.
 * Cookie adı `sb-<ref>-auth-token` (büyük oturumlarda `.0`, `.1` parçaları),
 * değeri `base64-<base64(JSON session)>`. Eski tek-JWT formatına da düşer.
 */
async function readAccessTokenFromCookies(): Promise<string | null> {
  const cookies = await chrome.cookies.getAll({ url: WEB_BASE }).catch(() => []);
  const authCookies = cookies
    .filter((c) => /^sb-.*-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (authCookies.length === 0) return null;

  let raw = authCookies.map((c) => c.value).join('');
  if (raw.startsWith('base64-')) raw = raw.slice('base64-'.length);
  try {
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const session = JSON.parse(atob(b64)) as { access_token?: string };
    if (session.access_token) return session.access_token;
  } catch {
    // base64 değilse: legacy ham JWT olabilir
    if (raw.includes('.')) return raw;
  }
  return null;
}

async function ensureAuth(): Promise<string | null> {
  if (state.auth.jwt && state.auth.expires_at && state.auth.expires_at > Date.now() + 30_000) {
    return state.auth.jwt;
  }
  try {
    const token = await readAccessTokenFromCookies();
    if (token) {
      const exp = decodeJwtExp(token);
      state.auth.jwt = token;
      state.auth.expires_at = exp ?? Date.now() + 50 * 60 * 1000;
      return token;
    }
  } catch {
    // ignore
  }
  return null;
}

async function apiPost<TReq, TResp>(path: string, body: TReq, attempts = 3): Promise<TResp> {
  let lastErr: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const jwt = await ensureAuth();
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(t);
      if (res.status === 401) {
        state.auth = {}; // force refresh
        throw new Error('401 — re-auth');
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`API ${path}: ${res.status} ${text.slice(0, 200)}`);
      }
      return (await res.json()) as TResp;
    } catch (err) {
      lastErr = err;
      const backoff = 200 * Math.pow(2, i) + Math.random() * 100;
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr ?? new Error('apiPost failed');
}

chrome.runtime.onMessage.addListener(
  (message: { type: string; payload?: unknown }, sender, sendResponse) => {
    (async () => {
      try {
        switch (message.type) {
          case 'OPEN_SIDE_PANEL': {
            if (sender.tab?.id) await chrome.sidePanel.open({ tabId: sender.tab.id });
            sendResponse({ ok: true });
            break;
          }
          case 'INGEST_KONUT': {
            const resp = await apiPost<unknown, { id: string; score_id: string }>(
              '/v1/ilanlar/ingest',
              message.payload,
            );
            sendResponse({ ok: true, analyzeId: resp.score_id });
            break;
          }
          case 'INGEST_LIST_BATCH': {
            await apiPost<unknown, unknown>('/v1/ilanlar/list-batch', {
              items: message.payload,
            });
            sendResponse({ ok: true });
            break;
          }
          case 'BROADCAST_ANALYSIS': {
            chrome.runtime
              .sendMessage({ type: 'NEW_ANALYSIS', payload: message.payload })
              .catch(() => undefined);
            sendResponse({ ok: true });
            break;
          }
          case 'PARSE_FAILED': {
            await apiPost('/v1/telemetry/parser-error', message.payload).catch(() => undefined);
            sendResponse({ ok: true });
            break;
          }
          default:
            sendResponse({ ok: false, error: 'unknown message type' });
        }
      } catch (err) {
        console.error('[Pusula SW]', err);
        sendResponse({ ok: false, error: (err as Error).message });
      }
    })();
    return true;
  },
);
