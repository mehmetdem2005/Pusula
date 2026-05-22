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

async function apiPost<TReq, TResp>(
  path: string,
  body: TReq,
  opts: { attempts?: number; timeoutMs?: number } = {},
): Promise<TResp> {
  const attempts = opts.attempts ?? 3;
  const timeoutMs = opts.timeoutMs ?? 15_000;
  let lastErr: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const jwt = await ensureAuth();
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), timeoutMs);
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

function detectKaynak(url?: string): string {
  const u = url ?? '';
  if (u.includes('sahibinden.com')) return 'sahibinden';
  if (u.includes('hepsiemlak.com')) return 'hepsiemlak';
  if (u.includes('emlakjet.com')) return 'emlakjet';
  return 'manuel';
}

function bufToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

/**
 * Aktif sekmenin TAM SAYFA ekran görüntüsünü al: kademeli scroll + her görünür alanı yakala,
 * OffscreenCanvas ile birleştir, genişliği 1080px'e indirip JPEG data URL döndür.
 * captureVisibleTab hız limiti için adımlar arası ~600ms beklenir; en çok 12 segment.
 */
async function captureFullPage(tabId: number, windowId: number): Promise<string> {
  const [metricsRes] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => ({
      total: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      vh: window.innerHeight,
    }),
  });
  const { total, vh } = (metricsRes?.result as { total: number; vh: number }) ?? {
    total: 0,
    vh: 0,
  };
  if (!vh) throw new Error('Sayfa ölçülemedi');

  const steps = Math.min(12, Math.max(1, Math.ceil(total / vh)));
  const shots: { dataUrl: string; y: number }[] = [];
  for (let i = 0; i < steps; i++) {
    const y = i * vh;
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (yy: number) => window.scrollTo(0, yy),
      args: [y],
    });
    await new Promise((r) => setTimeout(r, 600));
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 70 });
    shots.push({ dataUrl, y });
  }
  await chrome.scripting
    .executeScript({ target: { tabId }, func: () => window.scrollTo(0, 0) })
    .catch(() => undefined);

  const bitmaps = await Promise.all(
    shots.map(async (s) => createImageBitmap(await (await fetch(s.dataUrl)).blob())),
  );
  const first = bitmaps[0];
  if (!first) throw new Error('Görüntü alınamadı');
  const w = first.width;
  const segH = first.height;
  const scale = segH / vh; // device px / CSS px
  const fullH = Math.min(Math.round(total * scale), segH * steps);
  const maxW = 1080;
  const outScale = w > maxW ? maxW / w : 1;

  const canvas = new OffscreenCanvas(Math.round(w * outScale), Math.round(fullH * outScale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context yok');
  bitmaps.forEach((bmp, i) => {
    const destY = Math.round((shots[i]?.y ?? 0) * scale * outScale);
    ctx.drawImage(bmp, 0, 0, w, segH, 0, destY, w * outScale, segH * outScale);
    bmp.close();
  });
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
  return `data:image/jpeg;base64,${bufToBase64(await blob.arrayBuffer())}`;
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
          case 'CAPTURE_AND_EXTRACT': {
            const tab =
              sender.tab ?? (await chrome.tabs.query({ active: true, lastFocusedWindow: true }))[0];
            if (!tab?.id || tab.windowId == null) {
              sendResponse({ ok: false, error: 'Aktif sekme bulunamadı' });
              break;
            }
            const screenshot = await captureFullPage(tab.id, tab.windowId);
            const resp = await apiPost<unknown, { id: string; score_id: string }>(
              '/v1/ilanlar/extract',
              { screenshot_base64: screenshot, url: tab.url, kaynak: detectKaynak(tab.url) },
              { attempts: 2, timeoutMs: 60_000 },
            );
            chrome.runtime
              .sendMessage({ type: 'NEW_ANALYSIS', payload: { analyzeId: resp.score_id } })
              .catch(() => undefined);
            sendResponse({ ok: true, analyzeId: resp.score_id });
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
