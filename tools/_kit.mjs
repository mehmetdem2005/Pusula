// Pusula tasarım çekirdeği — flagship'te onaylanan AÇIK (light) token tabanı.
// Tüm ekran üreticileri buradan beslenir: tek kaynak, tek dil.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';

export const FONTS =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';

// Gerçek fotoğraflar yerelden, data-URI (chromium uzak görseli güvenilmez çeker → inline).
const uri = (p) => `data:image/jpeg;base64,${readFileSync(p).toString('base64')}`;
export const PH = {
  p1: uri('design/mockups/assets/hero.jpg'),
  p2: uri('design/mockups/assets/g1.jpg'),
  p3: uri('design/mockups/assets/g2.jpg'),
  p4: uri('design/mockups/assets/g3.jpg'),
};

// ---- TOKEN TABANI (açık tema) ----
export const TOKENS = `
:root{
  --ink:#0a0b0d; --sub:#5b6470; --faint:#9aa1ab;
  --line:#ececf0; --line-2:#e4e6ea; --hair:#d4d7dd;
  --bg:#fff; --soft:#f6f7f9; --page:#e9eaee;
  --green:#15803d; --green-bg:#e7f3ec; --green-line:#cfe6d8;
  --amber:#b45309;
}`;

// ---- BİLEŞEN SINIFLARI ----
export const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
${TOKENS}
html,body{background:var(--page);font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.eyebrow{font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--faint)}
.tnum{font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.h{letter-spacing:-.022em}
.spec{color:var(--sub);font-size:15px;font-weight:500}
.divide{height:1px;background:var(--line)}
.dot{color:var(--hair);margin:0 9px}
.btn-dark{background:var(--ink);color:#fff;border:none;font:600 15px Inter;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}
.btn-ghost{background:#fff;color:var(--ink);border:1px solid var(--line-2);font:600 15px Inter;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}
.chip{display:inline-flex;align-items:center;gap:6px;background:var(--soft);border:1px solid var(--line);border-radius:999px;padding:7px 13px;font-size:13px;color:var(--sub);font-weight:500;cursor:pointer}
.chip.on{background:var(--ink);border-color:var(--ink);color:#fff}
.shadow-soft{box-shadow:0 1px 2px rgba(16,24,40,.04),0 12px 30px -16px rgba(16,24,40,.16)}
.shadow-card{box-shadow:0 1px 2px rgba(16,24,40,.05),0 8px 24px -18px rgba(16,24,40,.22)}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden}
.badge{position:absolute;display:inline-flex;align-items:center;gap:5px;border-radius:999px;font-size:12px;font-weight:700;padding:5px 10px;backdrop-filter:blur(6px)}
.badge-green{background:rgba(21,128,61,.92);color:#fff}
.badge-glass{background:rgba(10,11,13,.55);color:#fff}
.icirc{border-radius:50%;background:rgba(255,255,255,.85);backdrop-filter:blur(8px);display:grid;place-items:center}
.bar{height:6px;border-radius:999px;background:#eef0f3;overflow:hidden}
.bar>i{display:block;height:100%;border-radius:999px;background:var(--green)}
.score{font-size:54px;font-weight:700;line-height:.9;color:var(--ink)}
.navlink{font-size:14px;font-weight:500;color:var(--sub);cursor:pointer}
.navlink.on{color:var(--ink)}
.bubble{max-width:78%;font-size:15px;line-height:1.45;padding:12px 15px;border-radius:18px}
.bubble-ai{background:var(--soft);border:1px solid var(--line);color:var(--ink);border-bottom-left-radius:6px}
.bubble-me{background:var(--ink);color:#fff;border-bottom-right-radius:6px;margin-left:auto}
`;

// ---- IKONLAR (Lucide tarzı, stroke 1.8) ----
const I = (path, s = 20, sw = 1.8, stroke = '#0a0b0d') =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
export const icon = {
  back: (s, c) => I('<path d="M15 18l-6-6 6-6"/>', s, 2, c),
  save: (s, c, sw) => I('<path d="M6 4h12v16l-6-4-6 4V4Z"/>', s, sw || 1.8, c),
  heart: (s, c) => I('<path d="M19 14c1.5-1.5 2-3.3 2-5a4.5 4.5 0 0 0-8-2.8A4.5 4.5 0 0 0 5 9c0 1.7.5 3.5 2 5l5 5 5-5Z"/>', s, 1.8, c),
  search: (s, c) => I('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>', s, 1.9, c),
  filter: (s, c) => I('<path d="M3 5h18M6 12h12M10 19h4"/>', s, 1.9, c),
  mic: (s, c) => I('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>', s, 1.8, c),
  send: (s, c) => I('<path d="M5 12h14M13 6l6 6-6 6"/>', s, 1.9, c),
  plus: (s, c) => I('<path d="M12 5v14M5 12h14"/>', s, 2, c),
  home: (s, c) => I('<path d="M4 11l8-7 8 7M6 10v9h12v-9"/>', s, 1.8, c),
  compass: (s, c) => I('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5 5-2Z"/>', s, 1.8, c),
  layers: (s, c) => I('<path d="M12 3l9 5-9 5-9-5 9-5ZM3 13l9 5 9-5"/>', s, 1.8, c),
  user: (s, c) => I('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', s, 1.8, c),
  spark: (s, c) => I('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/>', s, 1.6, c),
  pin: (s, c) => I('<path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>', s, 1.8, c),
  check: (s, c) => I('<path d="M5 12l4 4 10-10"/>', s, 2, c),
  camera: (s, c) => I('<path d="M4 8h3l1.5-2h7L17 8h3v11H4V8Z"/><circle cx="12" cy="13" r="3.2"/>', s, 1.7, c),
  bed: (s, c) => I('<path d="M3 18v-7h13a4 4 0 0 1 4 4v3M3 18v-9M3 12h6"/>', s, 1.8, c),
};

// ---- ORTAK BİLEŞENLER ----
export const eyebrow = (t) => `<div class="eyebrow">${t}</div>`;

export const kelepirBadge = (score, glass) =>
  `<span class="badge ${glass ? 'badge-glass' : 'badge-green'}" style="top:12px;left:12px">${icon.spark(13, '#fff')} Kelepir ${score}</span>`;

// Bir ilan kartı (feed/keşfet için). opts: {photo,score,title,price,ppm,specs,loc, compact}
export const listingCard = (o) => `
<div class="card shadow-card" style="cursor:pointer">
  <div style="position:relative;aspect-ratio:${o.compact ? '4/3' : '16/10'};background:#e9eaee url('${o.photo}') center/cover">
    ${o.score ? kelepirBadge(o.score) : ''}
    <span class="icirc" style="position:absolute;top:10px;right:10px;width:32px;height:32px">${icon.save(16, '#0a0b0d')}</span>
  </div>
  <div style="padding:${o.compact ? '12px 13px 14px' : '14px 16px 16px'}">
    <div class="eyebrow" style="font-size:10px">${o.loc}</div>
    <div class="h" style="font-size:${o.compact ? 15 : 16}px;font-weight:600;color:var(--ink);margin-top:7px;line-height:1.25">${o.title}</div>
    <div style="display:flex;align-items:baseline;gap:10px;margin-top:10px">
      <div class="tnum" style="font-size:${o.compact ? 17 : 19}px;font-weight:700;color:var(--ink)">${o.price}</div>
      <div class="tnum" style="font-size:12px;color:var(--sub)">${o.ppm}</div>
    </div>
    <div class="spec" style="margin-top:9px;font-size:13px">${o.specs}</div>
  </div>
</div>`;

// Kelepir skoru bloğu (ilan-detay + asistan paneli)
export const scoreBlock = (roomy) => `
<div>
  ${eyebrow('Kelepir skoru')}
  <div style="display:flex;align-items:flex-end;gap:16px;margin-top:${roomy ? 16 : 12}px">
    <div class="score tnum">78</div>
    <div style="padding-bottom:6px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:15px;font-weight:600;color:var(--green)">Kelepir</span>
        <span style="font-size:12px;color:var(--faint)">· orta güven</span>
      </div>
      <div style="font-size:13px;color:var(--sub);margin-top:2px">7 benzer ilana göre</div>
    </div>
  </div>
  <div class="bar" style="margin-top:16px"><i style="width:78%"></i></div>
  <div style="display:flex;justify-content:space-between;margin-top:10px">
    <span style="font-size:13px;color:var(--sub)">Mahalle medyanı <b style="color:var(--ink)" class="tnum">2.300 ₺/m²</b></span>
    <span style="font-size:13px;color:var(--green);font-weight:600">%15 altında</span>
  </div>
</div>`;

// Mobil alt navigasyon (5'li, ortada + ilan ver)
export const bottomNav = (active) => {
  const item = (key, label, ico) => {
    const on = key === active;
    const c = on ? '#0a0b0d' : '#9aa1ab';
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer">
      ${ico(23, c)}<span style="font-size:10px;font-weight:${on ? 600 : 500};color:${c}">${label}</span></div>`;
  };
  return `<div style="position:absolute;left:0;right:0;bottom:0;height:78px;background:rgba(255,255,255,.86);backdrop-filter:blur(14px);border-top:1px solid var(--line);display:flex;align-items:center;justify-content:space-around;padding:0 14px 14px">
    ${item('akis', 'Akış', icon.home)}
    ${item('kesfet', 'Keşfet', icon.compass)}
    <div style="width:50px;height:50px;border-radius:16px;background:var(--ink);display:grid;place-items:center;cursor:pointer;margin-top:-6px;box-shadow:0 8px 20px -6px rgba(10,11,13,.5)">${icon.plus(24, '#fff')}</div>
    ${item('listeler', 'Listeler', icon.layers)}
    ${item('profil', 'Profil', icon.user)}
  </div>`;
};

// Masaüstü üst navigasyon
export const topNav = (active) => {
  const link = (key, label) =>
    `<span class="navlink ${key === active ? 'on' : ''}">${label}</span>`;
  return `<div style="height:64px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 40px;background:#fff">
    <div class="h" style="font-size:20px;font-weight:700;color:var(--ink)">Pusula</div>
    <div style="display:flex;gap:32px">
      ${link('akis', 'Akış')}${link('kesfet', 'Keşfet')}${link('listeler', 'Listelerim')}${link('asistan', 'Asistan')}
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      <button class="btn-ghost" style="height:38px;padding:0 16px;font-size:14px">${icon.plus(17)} İlan ver</button>
      <div style="width:34px;height:34px;border-radius:50%;background:#e9eaee url('${PH.p2}') center/cover"></div>
    </div>
  </div>`;
};

// Mobil cihaz çerçevesi
export const phone = (inner, h = 844) =>
  `<div style="width:390px;background:var(--bg);min-height:${h}px;position:relative;overflow:hidden">${inner}</div>`;

export const desktop = (inner, h = 860) =>
  `<div style="width:1200px;background:var(--bg);min-height:${h}px">${inner}</div>`;

export const doc = (body) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${FONTS}" rel="stylesheet">
<style>${CSS}</style></head><body>${body}</body></html>`;

// ---- RENDER ----
export async function render(screens) {
  mkdirSync('design/mockups', { recursive: true });
  const browser = await chromium.launch();
  for (const s of screens) {
    const page = await browser.newPage({
      viewport: { width: s.width, height: s.height || 860 },
      deviceScaleFactor: 2,
    });
    await page.setContent(doc(s.html), { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `design/mockups/${s.name}.png`, fullPage: true });
    await page.close();
    console.log('wrote', s.name);
  }
  await browser.close();
}
