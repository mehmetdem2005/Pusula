import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

mkdirSync('design/mockups', { recursive: true });

const BASE = `
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#0b0b0f;--panel:#16161c;--soft:#20202a;--line:rgba(255,255,255,.08);
  --fg:#fff;--dim:rgba(255,255,255,.66);--faint:rgba(255,255,255,.40);
  --brand:#0095f6;--like:#ff3040;--green:#16a34a;--green2:#22c55e;--amber:#e0b34a;
  --iyi:#84cc16;--piyasa:#8b93a1;--pahali:#f97316;
}
html,body{background:var(--bg);color:var(--fg);font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
body{width:440px;position:relative;overflow:hidden;padding-bottom:28px}
.amb{position:absolute;inset:0;pointer-events:none;z-index:0}
.amb::before{content:"";position:absolute;top:-160px;left:-80px;width:420px;height:420px;border-radius:50%;
  background:radial-gradient(circle, rgba(0,149,246,.18), transparent 70%);filter:blur(20px)}
.amb::after{content:"";position:absolute;top:120px;right:-120px;width:360px;height:360px;border-radius:50%;
  background:radial-gradient(circle, rgba(22,163,74,.12), transparent 70%);filter:blur(20px)}
.wrap{position:relative;z-index:1}
.glass{background:rgba(18,18,24,.62);backdrop-filter:blur(18px) saturate(160%);-webkit-backdrop-filter:blur(18px) saturate(160%);border-bottom:1px solid var(--line)}
.hdr{display:flex;align-items:center;justify-content:space-between;padding:14px 16px}
.ic{width:38px;height:38px;display:grid;place-items:center;border-radius:50%;color:var(--fg)}
.ic.bg{background:rgba(255,255,255,.06)}
.t-title{font-size:15px;font-weight:600}
.pill{display:inline-flex;align-items:center;gap:6px;border-radius:999px;font-weight:600;line-height:1}
.card{background:linear-gradient(180deg,#17171e,#131318);border:1px solid var(--line);border-radius:22px;
  box-shadow:0 1px 0 rgba(255,255,255,.04) inset, 0 26px 54px -30px rgba(0,0,0,.85)}
.lbl{font-size:11px;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--faint)}
.tnum{font-variant-numeric:tabular-nums}
svg{display:block}
`;

const ring = (val, from, to) => `
<svg width="116" height="116" viewBox="0 0 116 116">
  <defs>
    <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <filter id="gl" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="${to}" flood-opacity="0.55"/>
    </filter>
  </defs>
  <circle cx="58" cy="58" r="48" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="10"/>
  <circle cx="58" cy="58" r="48" fill="none" stroke="url(#rg)" stroke-width="10" stroke-linecap="round"
    stroke-dasharray="${2*Math.PI*48}" stroke-dashoffset="${2*Math.PI*48*(1-val/100)}"
    transform="rotate(-90 58 58)" filter="url(#gl)"/>
</svg>`;

// ---------- Screen 1 ----------
const screen1 = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${BASE}</style></head><body><div class="amb"></div><div class="wrap">

<div class="glass hdr">
  <div class="ic"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></div>
  <div class="t-title">İlan</div>
  <div class="pill" style="padding:6px 11px;background:rgba(255,255,255,.07);color:var(--dim);font-size:11px;font-weight:600">yayında</div>
</div>

<div style="display:flex;align-items:center;gap:10px;padding:14px 16px 10px">
  <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#2a2342,#1a1a22);display:grid;place-items:center;font-size:13px;font-weight:700;border:1px solid var(--line)">M</div>
  <div style="font-size:13px;font-weight:600">@mudanya_ev</div>
  <div class="pill" style="margin-left:auto;padding:5px 10px;background:rgba(255,255,255,.06);color:var(--dim);font-size:10px;letter-spacing:.08em">KONUT</div>
</div>

<div style="position:relative;height:208px;margin:0 0 4px;background:radial-gradient(120% 100% at 30% 20%,#26324d,#0c0c11 72%);overflow:hidden">
  <div class="pill glass" style="position:absolute;top:14px;left:14px;padding:7px 12px;font-size:11px;color:var(--dim);border:1px solid var(--line)">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 6.9L21 11l-6.6 2.1L12 20l-2.4-6.9L3 11l6.6-2.1z"/></svg> Yapay zeka · temsilî</div>
  <div style="position:absolute;left:16px;bottom:14px">
    <div style="font-size:22px;font-weight:800;letter-spacing:-.01em" class="tnum">4.250.000 ₺</div>
  </div>
  <div style="position:absolute;inset:0;display:grid;place-items:center">
    <div style="width:58px;height:58px;border-radius:50%;background:rgba(255,255,255,.12);backdrop-filter:blur(6px);display:grid;place-items:center">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z"/></svg></div></div>
</div>

<div style="display:flex;align-items:center;gap:22px;padding:12px 16px">
  <div style="display:flex;align-items:center;gap:7px;color:var(--like)"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 20s-7-4.4-9.3-8.7C1.3 8.5 2.7 5.2 6 5.2c2 0 3.2 1.2 4 2.6.8-1.4 2-2.6 4-2.6 3.3 0 4.7 3.3 3.3 6.1C19 15.6 12 20 12 20Z"/></svg><span style="font-size:14px;font-weight:700;color:var(--fg)">12</span></div>
  <div style="display:flex;align-items:center;gap:7px"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v17l-6-4-6 4V4Z"/></svg><span style="font-size:14px;font-weight:600">Kaydet</span></div>
</div>

<div style="padding:2px 16px 0">
  <div style="font-size:17px;font-weight:600;letter-spacing:-.01em">Mudanya Bademli — denize bakan 3+1</div>
  <div style="font-size:13px;color:var(--dim);margin-top:3px">Bursa · Mudanya · Bademli</div>
  <div style="display:flex;gap:8px;margin-top:12px">
    <div class="pill" style="padding:7px 12px;background:var(--panel);border:1px solid var(--line);font-size:12px;color:var(--dim)">165 m²</div>
    <div class="pill" style="padding:7px 12px;background:var(--panel);border:1px solid var(--line);font-size:12px;color:var(--dim)">3+1</div>
    <div class="pill" style="padding:7px 12px;background:var(--panel);border:1px solid var(--line);font-size:12px;color:var(--dim)">6 yaş</div>
  </div>
</div>

<!-- SCORE CARD -->
<div class="card" style="margin:18px 16px 0;padding:20px">
  <div style="display:flex;align-items:center;justify-content:space-between">
    <div>
      <div class="lbl">Kelepir analizi</div>
      <div style="font-size:11px;color:var(--faint);margin-top:5px">Tek skor · fiyat avantajı</div>
    </div>
    <div class="pill" style="padding:7px 12px;border:1px solid rgba(224,179,74,.45);color:var(--amber);font-size:11px;font-weight:600">
      <span style="width:6px;height:6px;border-radius:50%;background:var(--amber);display:inline-block"></span> Orta güven</div>
  </div>

  <div style="display:flex;align-items:center;gap:18px;margin-top:14px">
    <div style="position:relative;width:116px;height:116px;flex:none">
      ${ring(78,'#16a34a','#22c55e')}
      <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
        <div style="font-size:38px;font-weight:800;line-height:1;letter-spacing:-.02em" class="tnum">78</div>
        <div style="font-size:11px;color:var(--faint);margin-top:2px">/100</div>
      </div>
    </div>
    <div style="flex:1">
      <div class="pill" style="padding:8px 14px;background:linear-gradient(180deg,#1b9c4e,#16a34a);color:#fff;font-size:13px;font-weight:700;box-shadow:0 8px 20px -8px rgba(22,163,74,.6)">Kelepir</div>
      <div style="display:flex;align-items:baseline;justify-content:space-between;margin:16px 0 7px">
        <span style="font-size:12px;color:var(--dim)">Fiyat avantajı</span>
        <span style="font-size:13px;font-weight:700" class="tnum">78</span>
      </div>
      <div style="height:9px;border-radius:999px;background:rgba(255,255,255,.07);overflow:hidden">
        <div style="height:100%;width:78%;border-radius:999px;background:linear-gradient(90deg,#16a34a,#22c55e);box-shadow:0 0 12px rgba(34,197,94,.5)"></div>
      </div>
    </div>
  </div>

  <div style="margin-top:18px;padding:14px;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid var(--line)">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:12px;color:var(--dim)">Mahalle medyanı</span>
      <span style="font-size:13px;font-weight:600" class="tnum">2.300 ₺/m²</span>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:9px">
      <span style="font-size:12px;color:var(--dim)">Bu ilan</span>
      <span style="display:flex;align-items:center;gap:7px">
        <span style="font-size:13px;font-weight:700" class="tnum">1.950 ₺/m²</span>
        <span class="pill" style="padding:3px 8px;background:rgba(22,163,74,.16);color:#4ade80;font-size:11px;font-weight:700">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7l10 10M17 17V9M17 17H9"/></svg> %15</span>
      </span>
    </div>
  </div>
  <div style="font-size:11px;color:var(--faint);margin-top:11px">Referans: 7 benzer ilan · eksikte mahalle tahmini (AI)</div>
</div>

<button style="margin:14px 16px 0;width:calc(100% - 32px);height:48px;border:none;border-radius:14px;background:linear-gradient(180deg,#1aa0ff,#0095f6);color:#fff;font-size:14px;font-weight:700;font-family:inherit;box-shadow:0 12px 26px -12px rgba(0,149,246,.7)">Asistana sor</button>
<div style="font-size:11px;color:var(--faint);text-align:center;margin-top:12px">Skoru deterministik motor hesaplar; AI yalnız yorumlar.</div>
</div></body></html>`;

// ---------- Screen 2 ----------
const row = (rank, title, sub, price, band, bandColor, bandText, score, ringFrom, ringTo, conf, top) => `
<div class="card" style="padding:14px;display:flex;align-items:center;gap:13px;${top?'border-color:rgba(0,149,246,.35);box-shadow:0 1px 0 rgba(255,255,255,.05) inset,0 26px 54px -30px rgba(0,0,0,.85),0 0 0 1px rgba(0,149,246,.18)':''}">
  <div style="position:relative;width:58px;height:58px;flex:none;border-radius:13px;background:radial-gradient(120% 120% at 30% 20%,#27314a,#0e0e14);overflow:hidden">
    <div style="position:absolute;top:6px;left:6px;width:22px;height:22px;border-radius:50%;background:${top?'linear-gradient(180deg,#1aa0ff,#0095f6)':'rgba(0,0,0,.55)'};display:grid;place-items:center;font-size:12px;font-weight:800">${rank}</div>
  </div>
  <div style="flex:1;min-width:0">
    <div style="font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${title}</div>
    <div style="font-size:11px;color:var(--faint);margin-top:2px">${sub}</div>
    <div style="display:flex;align-items:center;gap:9px;margin-top:7px">
      <span style="font-size:14px;font-weight:700" class="tnum">${price}</span>
      <span class="pill" style="padding:3px 9px;background:${bandColor};color:${bandText};font-size:10px;font-weight:700">${band}</span>
    </div>
  </div>
  <div style="text-align:right;flex:none">
    <div style="font-size:24px;font-weight:800;line-height:1;background:linear-gradient(180deg,${ringTo},${ringFrom});-webkit-background-clip:text;background-clip:text;color:transparent" class="tnum">${score}</div>
    <div style="font-size:10px;color:var(--faint);margin-top:4px">${conf}</div>
  </div>
</div>`;

const screen2 = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>${BASE}</style></head><body><div class="amb"></div><div class="wrap">

<div class="glass" style="padding-bottom:12px">
  <div class="hdr" style="padding-bottom:6px">
    <div class="ic"><svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg></div>
    <div class="t-title">Favorilerim</div>
    <div class="ic bg"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18M6 12h12M10 19h4"/></svg></div>
  </div>
  <div style="display:flex;gap:9px;padding:0 16px">
    <div style="flex:1;display:flex;background:var(--panel);border:1px solid var(--line);border-radius:11px;padding:4px">
      <div style="flex:1;text-align:center;padding:7px;border-radius:8px;font-size:12px;font-weight:600;color:var(--dim)">İlanlar</div>
      <div style="flex:1;text-align:center;padding:7px;border-radius:8px;font-size:12px;font-weight:700;background:var(--soft)">AI Analiz</div>
    </div>
    <button style="border:none;border-radius:11px;padding:0 16px;background:linear-gradient(180deg,#1aa0ff,#0095f6);color:#fff;font-size:12px;font-weight:700;font-family:inherit;box-shadow:0 10px 22px -12px rgba(0,149,246,.7)">Analiz et</button>
  </div>
</div>

<div style="padding:16px">
  <div class="card" style="padding:16px;background:linear-gradient(180deg,rgba(0,149,246,.10),#131318)">
    <div style="display:flex;align-items:center;gap:8px"><svg width="15" height="15" viewBox="0 0 24 24" fill="#4db5ff"><path d="M12 2l2.4 6.9L21 11l-6.6 2.1L12 20l-2.4-6.9L3 11l6.6-2.1z"/></svg><span class="lbl" style="color:#7cc4ff">AI değerlendirmesi</span></div>
    <div style="font-size:13px;color:var(--dim);line-height:1.55;margin-top:9px">En kelepir <b style="color:var(--fg)">Mudanya Bademli</b> — %15 piyasa altı, güçlü konum. 2. sıradaki dairenin fiyatı iyi ama bina yaşı yüksek. Aşağıdaki sıralama kelepirden aza dizili.</div>
  </div>

  <div style="display:flex;flex-direction:column;gap:11px;margin-top:14px">
    ${row(1,'Mudanya Bademli 3+1','Bursa · Mudanya','4.250.000 ₺','Kelepir','rgba(22,163,74,.18)','#4ade80',78,'#16a34a','#22c55e','orta güven',true)}
    ${row(2,'Nilüfer 2+1 daire','Bursa · Nilüfer','3.100.000 ₺','İyi Fiyat','rgba(132,204,22,.16)','#a3e635',64,'#65a30d','#84cc16','yüksek güven',false)}
    ${row(3,'Osmangazi 3+1','Bursa · Osmangazi','2.850.000 ₺','Piyasa','rgba(139,147,161,.18)','#c2c9d4',47,'#6b7280','#8b93a1','yüksek güven',false)}
    ${row(4,'Mudanya arsa 500 m²','Bursa · Mudanya','1.900.000 ₺','Pahalı','rgba(249,115,22,.16)','#fb923c',31,'#ea580c','#f97316','düşük güven',false)}
  </div>
  <div style="display:flex;gap:7px;margin-top:16px;flex-wrap:wrap">
    ${['İlçe','Fiyat','m²','Oda','Band','Sırala'].map(f=>`<span class="pill" style="padding:6px 12px;background:var(--panel);border:1px solid var(--line);font-size:11px;color:var(--dim)">${f}</span>`).join('')}
  </div>
</div>
</div></body></html>`;

const browser = await chromium.launch();
for (const [name, html] of [['kelepir-skor-karti', screen1], ['liste-ai-liderlik', screen2]]) {
  const page = await browser.newPage({ viewport: { width: 440, height: 900 }, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `design/mockups/${name}.png`, fullPage: true });
  await page.close();
  console.log('wrote design/mockups/' + name + '.png');
}
await browser.close();
