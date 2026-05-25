import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
mkdirSync('design/mockups', { recursive: true });

const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
// Gerçek fotoğraflar yerelden, data-URI (chromium uzak görseli güvenilmez çekiyor → inline).
const uri = (p) => `data:image/jpeg;base64,${readFileSync(p).toString('base64')}`;
const HERO = uri('design/mockups/assets/hero.jpg');
const G2 = uri('design/mockups/assets/g1.jpg');
const G3 = uri('design/mockups/assets/g2.jpg');
const G4 = uri('design/mockups/assets/g3.jpg');

const CSS = `
*{margin:0;padding:0;box-sizing:border-box}
:root{--ink:#0a0b0d;--sub:#5b6470;--faint:#9aa1ab;--line:#ececf0;--bg:#fff;--soft:#f6f7f9;--green:#15803d}
html,body{background:#e9eaee;font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
.eyebrow{font-size:11px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--faint)}
.tnum{font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.h{letter-spacing:-.022em}
.btn-dark{background:var(--ink);color:#fff;border:none;font:600 15px Inter;border-radius:12px;display:flex;align-items:center;justify-content:center}
.btn-ghost{background:#fff;color:var(--ink);border:1px solid #e4e6ea;font:600 15px Inter;border-radius:12px;display:flex;align-items:center;justify-content:center}
.divide{height:1px;background:var(--line)}
.spec{color:var(--sub);font-size:15px;font-weight:500}
.score{font-size:54px;font-weight:700;line-height:.9;color:var(--ink)}
.bar{height:6px;border-radius:999px;background:#eef0f3;overflow:hidden}
.bar>i{display:block;height:100%;border-radius:999px;background:var(--green)}
.chip-soft{display:inline-flex;align-items:center;gap:6px;background:var(--soft);border:1px solid var(--line);border-radius:999px;padding:6px 12px;font-size:13px;color:var(--sub);font-weight:500}
.shadow-soft{box-shadow:0 1px 2px rgba(16,24,40,.04),0 12px 30px -16px rgba(16,24,40,.16)}
`;

const scoreBlock = (roomy) => `
<div>
  <div class="eyebrow">Kelepir skoru</div>
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

// ---------- MOBILE ----------
const mobile = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${FONTS}" rel="stylesheet">
<style>${CSS}</style></head>
<body><div style="width:390px;background:var(--bg);min-height:844px;position:relative">
  <div style="position:relative;height:430px;background:#e9eaee url('${HERO}') center/cover">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.28),transparent 22%,transparent 70%,rgba(0,0,0,.10))"></div>
    <div style="position:absolute;top:16px;left:16px;width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.85);backdrop-filter:blur(8px);display:grid;place-items:center">
      <svg width="20" height="20" fill="none" stroke="#0a0b0d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></div>
    <div style="position:absolute;top:16px;right:16px;display:flex;gap:8px">
      <div style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.85);backdrop-filter:blur(8px);display:grid;place-items:center"><svg width="18" height="18" fill="none" stroke="#0a0b0d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v17l-6-4-6 4V4Z"/></svg></div>
    </div>
    <div style="position:absolute;right:16px;bottom:16px;background:rgba(10,11,13,.55);backdrop-filter:blur(6px);color:#fff;font-size:12px;font-weight:600;padding:5px 11px;border-radius:999px" class="tnum">1 / 8</div>
  </div>

  <div style="padding:24px 22px 120px">
    <div class="eyebrow">Bursa · Mudanya</div>
    <h1 class="h" style="font-size:26px;font-weight:600;color:var(--ink);margin-top:10px;line-height:1.12">Bademli’de denize bakan 3+1</h1>
    <div style="display:flex;align-items:baseline;gap:12px;margin-top:16px">
      <div class="tnum" style="font-size:30px;font-weight:700;color:var(--ink)">4.250.000 ₺</div>
      <div class="tnum" style="font-size:14px;color:var(--sub)">1.950 ₺/m²</div>
    </div>
    <div class="spec" style="margin-top:14px">165 m²<span style="color:#d4d7dd;margin:0 10px">·</span>3+1<span style="color:#d4d7dd;margin:0 10px">·</span>2018<span style="color:#d4d7dd;margin:0 10px">·</span>2. kat</div>

    <div class="divide" style="margin:24px 0"></div>
    ${scoreBlock(false)}
    <div class="divide" style="margin:24px 0"></div>

    <div class="eyebrow">Galeri</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:14px">
      ${[G2, G3, G4].map((u) => `<div style="aspect-ratio:1;border-radius:12px;background:#e9eaee url('${u}') center/cover"></div>`).join('')}
    </div>
  </div>

  <div style="position:absolute;left:0;right:0;bottom:0;padding:16px 22px 28px;background:linear-gradient(180deg,rgba(255,255,255,0),#fff 26%)">
    <div style="display:flex;gap:10px">
      <button class="btn-ghost" style="width:52px;height:52px;border-radius:14px"><svg width="22" height="22" fill="none" stroke="#0a0b0d" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v17l-6-4-6 4V4Z"/></svg></button>
      <button class="btn-dark" style="flex:1;height:52px;border-radius:14px">Asistana sor</button>
    </div>
  </div>
</div></body></html>`;

// ---------- DESKTOP ----------
const desktop = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="${FONTS}" rel="stylesheet">
<style>${CSS}</style></head>
<body><div style="width:1200px;background:var(--bg);min-height:860px">
  <div style="height:64px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 40px">
    <div class="h" style="font-size:20px;font-weight:700;color:var(--ink)">Pusula</div>
    <div style="display:flex;gap:32px;font-size:14px;font-weight:500;color:var(--sub)">
      <span style="color:var(--ink)">Akış</span><span>Keşfet</span><span>Listelerim</span><span>Asistan</span></div>
    <div style="display:flex;align-items:center;gap:14px">
      <span style="font-size:14px;font-weight:600;color:var(--ink)">İlan ver</span>
      <div style="width:34px;height:34px;border-radius:50%;background:#e9eaee url('${G2}') center/cover"></div></div>
  </div>

  <div style="max-width:1120px;margin:0 auto;padding:34px 40px 60px">
    <div class="eyebrow" style="margin-bottom:18px">Anasayfa · Konut · Bursa</div>
    <div style="display:grid;grid-template-columns:1.55fr 1fr;gap:40px;align-items:start">
      <!-- gallery -->
      <div>
        <div style="aspect-ratio:16/10;border-radius:18px;background:#e9eaee url('${HERO}') center/cover" class="shadow-soft"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-top:14px">
          ${[G2, G3, G4].map((u) => `<div style="aspect-ratio:4/3;border-radius:14px;background:#e9eaee url('${u}') center/cover"></div>`).join('')}
        </div>
      </div>
      <!-- sticky info -->
      <div>
        <div class="eyebrow">Bursa · Mudanya · Bademli</div>
        <h1 class="h" style="font-size:34px;font-weight:600;color:var(--ink);margin-top:12px;line-height:1.08">Denize bakan<br>3+1 daire</h1>
        <div style="display:flex;align-items:baseline;gap:14px;margin-top:20px">
          <div class="tnum" style="font-size:36px;font-weight:700;color:var(--ink)">4.250.000 ₺</div>
          <div class="tnum" style="font-size:15px;color:var(--sub)">1.950 ₺/m²</div>
        </div>
        <div class="spec" style="margin-top:16px">165 m²<span style="color:#d4d7dd;margin:0 10px">·</span>3+1<span style="color:#d4d7dd;margin:0 10px">·</span>2018<span style="color:#d4d7dd;margin:0 10px">·</span>2. kat</div>
        <div class="divide" style="margin:26px 0"></div>
        ${scoreBlock(true)}
        <div style="display:flex;gap:12px;margin-top:28px">
          <button class="btn-dark" style="flex:1;height:54px">Asistana sor</button>
          <button class="btn-ghost" style="width:54px;height:54px"><svg width="22" height="22" fill="none" stroke="#0a0b0d" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v17l-6-4-6 4V4Z"/></svg></button>
        </div>
        <div style="margin-top:18px;font-size:13px;color:var(--faint)">İletişim platform dışıdır · Pusula komisyoncu değildir</div>
      </div>
    </div>
  </div>
</div></body></html>`;

const browser = await chromium.launch();
for (const [name, html, w] of [['flagship-mobil', mobile, 390], ['flagship-web', desktop, 1200]]) {
  const page = await browser.newPage({ viewport: { width: w, height: 860 }, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `design/mockups/${name}.png`, fullPage: true });
  await page.close();
  console.log('wrote', name);
}
await browser.close();
