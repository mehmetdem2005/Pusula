import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
mkdirSync('design/mockups', { recursive: true });

const FONTS = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&family=Sora:wght@400;600;700;800&display=swap';

// Her konsept bir "telefon" çerçevesi + palet/font künyesi.
function col(c) {
  const score = c.dark ? '#22c55e' : '#16a34a';
  return `
  <div style="width:392px">
    <div style="font:700 22px ${c.head};color:#fff;letter-spacing:-.01em">${c.name}</div>
    <div style="font:400 13px Inter;color:rgba(255,255,255,.55);margin:6px 0 16px">${c.desc}</div>

    <div style="width:360px;height:660px;border-radius:34px;background:${c.bg};overflow:hidden;
      box-shadow:0 40px 90px -40px rgba(0,0,0,.8);border:1px solid rgba(255,255,255,.08);position:relative">
      <!-- top bar -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 20px 0">
        <div style="font:700 22px ${c.head};color:${c.text};letter-spacing:-.02em">Pusula</div>
        <div style="display:flex;gap:8px">
          <div style="width:34px;height:34px;border-radius:50%;background:${c.chip}"></div>
          <div style="width:34px;height:34px;border-radius:50%;background:${c.accent}"></div>
        </div>
      </div>
      <!-- hero -->
      <div style="padding:22px 20px 8px">
        <div style="font:${c.headW} 30px ${c.head};color:${c.text};line-height:1.05;letter-spacing:-.02em">Evini paylaş,<br><span style="color:${c.accent}">kelepiri</span> bul.</div>
        <div style="font:400 13px ${c.body};color:${c.dim};margin-top:10px;line-height:1.5">Dikey akışta keşfet, kaydet, AI ile değerlendir.</div>
      </div>
      <!-- property card -->
      <div style="margin:14px 20px;border-radius:${c.r}px;background:${c.surface};border:1px solid ${c.border};overflow:hidden;
        box-shadow:${c.shadow}">
        <div style="height:118px;background:${c.img}"></div>
        <div style="padding:14px">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div style="font:700 17px ${c.body};color:${c.text}" >4.250.000 ₺</div>
            <div style="font:700 11px Inter;color:#fff;background:${score};padding:5px 10px;border-radius:999px">Kelepir · 78</div>
          </div>
          <div style="font:400 12px ${c.body};color:${c.dim};margin-top:5px">Mudanya · 3+1 · 165 m² · %15 piyasa altı</div>
        </div>
      </div>
      <!-- button + chips -->
      <div style="padding:4px 20px">
        <div style="height:50px;border-radius:14px;background:${c.accent};color:${c.onAccent};font:700 15px ${c.body};display:flex;align-items:center;justify-content:center;box-shadow:0 14px 30px -14px ${c.accent}">İlan paylaş</div>
        <div style="display:flex;gap:8px;margin-top:14px">
          ${['Konut', 'Arsa', 'Araç'].map((t, i) => `<div style="padding:8px 14px;border-radius:999px;font:600 12px ${c.body};${i === 0 ? `background:${c.text};color:${c.bg}` : `background:${c.chip};color:${c.dim}`}">${t}</div>`).join('')}
        </div>
      </div>
    </div>

    <!-- palette + fonts -->
    <div style="display:flex;gap:8px;margin-top:16px">
      ${[c.bg, c.surface, c.text, c.accent].map((x) => `<div style="width:40px;height:40px;border-radius:10px;background:${x};border:1px solid rgba(255,255,255,.12)"></div>`).join('')}
    </div>
    <div style="font:400 12px Inter;color:rgba(255,255,255,.5);margin-top:10px">Aa — <b style="color:#fff;font-family:${c.head}">${c.headName}</b> + <span style="font-family:${c.body};color:#fff">${c.bodyName}</span></div>
  </div>`;
}

const A = {
  name: 'A · Sıcak Editöryel', desc: 'Aydınlık, lüks emlak, kil/krem · zarif serif',
  bg: '#f7f1e8', surface: '#fffdf9', text: '#241a12', dim: '#7c6c5d', accent: '#c2410c', onAccent: '#fff',
  border: 'rgba(0,0,0,.07)', chip: 'rgba(0,0,0,.05)', img: 'linear-gradient(135deg,#d9c4a8,#b08a63)',
  shadow: '0 18px 40px -26px rgba(80,50,20,.5)', r: 18, head: 'Fraunces, serif', headName: 'Fraunces', headW: 600,
  body: 'Inter, sans-serif', bodyName: 'Inter', dark: false,
};
const B = {
  name: 'B · Net Aydınlık', desc: 'Beyaz, ferah, tek canlı vurgu · modern grotesk',
  bg: '#ffffff', surface: '#f7f8fa', text: '#0b0d12', dim: '#697586', accent: '#059669', onAccent: '#fff',
  border: '#ebedf1', chip: '#f1f3f6', img: 'linear-gradient(135deg,#cfe8df,#9fd6c4)',
  shadow: '0 18px 40px -26px rgba(20,30,40,.25)', r: 16, head: 'Sora, sans-serif', headName: 'Sora', headW: 700,
  body: 'Inter, sans-serif', bodyName: 'Inter', dark: false,
};
const C = {
  name: 'C · Sıcak Koyu', desc: 'Nötr kömür (mavi YOK), kehribar vurgu · video-dostu',
  bg: '#141312', surface: '#1d1b19', text: '#f5f1ea', dim: '#a39a8e', accent: '#f59e0b', onAccent: '#1a1206',
  border: 'rgba(255,255,255,.09)', chip: 'rgba(255,255,255,.07)', img: 'linear-gradient(135deg,#3a342b,#15110d)',
  shadow: '0 22px 46px -28px rgba(0,0,0,.8)', r: 18, head: 'Sora, sans-serif', headName: 'Sora', headW: 800,
  body: 'Inter, sans-serif', bodyName: 'Inter', dark: true,
};

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS}" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0c0c0e;padding:40px}</style></head>
<body><div style="display:flex;gap:40px;width:max-content">${col(A)}${col(B)}${col(C)}</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
await page.setViewportSize({ width: 1320, height: 900 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await page.screenshot({ path: 'design/mockups/konsept-secenekleri.png', fullPage: true });
await browser.close();
console.log('wrote design/mockups/konsept-secenekleri.png');
