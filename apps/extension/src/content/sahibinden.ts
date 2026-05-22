/**
 * Content script — sahibinden.com sayfalarında çalışır.
 *
 * Görev:
 *  1. Detay sayfasında: ilan'ı parse et, service worker'a gönder
 *  2. Liste/arama sayfasında: passive collector — görünen kartları yakalar (scroll-on-demand)
 *  3. Floating button: "Pusula paneli aç" + "Kaydet"
 */
import { parseKonutDetay, PARSER_VERSION } from '../parsers/sahibinden-konut-v3.js';

type PageType = 'detay' | 'liste' | 'arama' | 'bilinmiyor';

function detectPageType(): PageType {
  const path = location.pathname;
  if (/\/ilan\//.test(path)) return 'detay';
  if (/\/kategori\//.test(path) || /\/arama\//.test(path)) return 'liste';
  return 'bilinmiyor';
}

async function send<T>(message: { type: string; payload?: unknown }): Promise<T> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (resp) => resolve(resp as T));
  });
}

/**
 * Floating action button — kullanıcının "Pusula Paneli" butonu.
 */
function mountFloatingButton(): void {
  if (document.querySelector('#pusula-fab')) return;
  const fab = document.createElement('button');
  fab.id = 'pusula-fab';
  fab.textContent = '🧭 Pusula Analiz';
  fab.setAttribute('aria-label', 'Pusula analiz panelini aç');
  Object.assign(fab.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '999999',
    padding: '12px 18px',
    background: '#0ea5e9',
    color: 'white',
    fontWeight: '600',
    fontSize: '14px',
    border: 'none',
    borderRadius: '999px',
    boxShadow: '0 8px 24px rgba(14,165,233,0.4)',
    cursor: 'pointer',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  });
  fab.onclick = async () => {
    await send({ type: 'OPEN_SIDE_PANEL' });
  };
  document.body.appendChild(fab);
}

/**
 * Detay sayfasında: parse et + service worker'a gönder + cache et.
 */
async function handleDetayPage(): Promise<void> {
  const ilan = parseKonutDetay(document, location.href);
  if (!ilan) {
    console.warn('[Pusula] parse failed');
    await send({ type: 'PARSE_FAILED', payload: { url: location.href, parser: PARSER_VERSION } });
    return;
  }
  console.info('[Pusula] parsed ilan:', ilan);
  const resp = await send<{ ok: boolean; analyzeId?: string }>({
    type: 'INGEST_KONUT',
    payload: ilan,
  });
  if (resp.ok && resp.analyzeId) {
    // Side panel'a görmesi için broadcast
    await send({ type: 'BROADCAST_ANALYSIS', payload: { analyzeId: resp.analyzeId } });
  }
}

/**
 * Liste sayfasında: passive collector — IntersectionObserver ile görünen kartları topla.
 *
 * Kullanıcı scroll'da gördüğü kartları biz de "görmüş" sayılırız;
 * backend'e batch halinde gönderiyoruz, tek tek HTTP request değil.
 */
function setupPassiveCollector(): void {
  const seen = new Set<string>();
  const batch: { url: string; baslik: string; fiyat: string }[] = [];
  let flushTimer: number | undefined;

  const cardSelector = '[data-id], .classifiedItem, [data-testid="listing-card"]';

  const flush = async () => {
    if (batch.length === 0) return;
    const payload = [...batch];
    batch.length = 0;
    await send({ type: 'INGEST_LIST_BATCH', payload });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const card = e.target as HTMLElement;
        const link = card.querySelector('a[href*="/ilan/"]') as HTMLAnchorElement | null;
        if (!link || seen.has(link.href)) continue;
        seen.add(link.href);
        batch.push({
          url: link.href,
          baslik: link.textContent?.trim() ?? '',
          fiyat: card.querySelector('.classified-price, .price')?.textContent?.trim() ?? '',
        });
        observer.unobserve(card);
        if (flushTimer) clearTimeout(flushTimer);
        flushTimer = window.setTimeout(flush, 1500);
      }
    },
    { threshold: 0.5 },
  );

  // İlk kartları ve mutation ile sonradan gelenleri observe et
  const observeAll = () => {
    document.querySelectorAll(cardSelector).forEach((card) => observer.observe(card));
  };
  observeAll();
  new MutationObserver(observeAll).observe(document.body, { childList: true, subtree: true });
}

(async function main() {
  const pageType = detectPageType();
  console.info('[Pusula] page type:', pageType, location.href);

  mountFloatingButton();

  if (pageType === 'detay') {
    await handleDetayPage();
  } else if (pageType === 'liste') {
    setupPassiveCollector();
  }
})();
