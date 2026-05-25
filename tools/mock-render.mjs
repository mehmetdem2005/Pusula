import { Resvg } from '@resvg/resvg-js';
import { writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('design/mockups', { recursive: true });

// Modern Dark palet
const C = {
  bg: '#0b0b0f', panel: '#16161c', soft: '#20202a', line: 'rgba(255,255,255,0.10)',
  fg: '#ffffff', dim: 'rgba(255,255,255,0.64)', faint: 'rgba(255,255,255,0.42)',
  brand: '#0095f6', like: '#ff3040',
  kelepir: '#16a34a', kacirilmaz: '#15803d', iyi: '#65a30d', piyasa: '#6b7280', pahali: '#ea580c',
  amber: '#d9a441',
};
const F = 'Liberation Sans, DejaVu Sans, sans-serif';

function ring(cx, cy, r, val, color) {
  const C2 = 2 * Math.PI * r;
  const off = C2 * (1 - val / 100);
  return `
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${C.soft}" stroke-width="9"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="9"
      stroke-linecap="round" stroke-dasharray="${C2}" stroke-dashoffset="${off}"
      transform="rotate(-90 ${cx} ${cy})"/>`;
}

// ───────── Mockup 1: Kelepir skor kartı (ilan detay) ─────────
const m1 = `<svg xmlns="http://www.w3.org/2000/svg" width="430" height="920" viewBox="0 0 430 920" font-family="${F}">
<rect width="430" height="920" fill="${C.bg}"/>
<!-- header -->
<rect width="430" height="52" fill="#101016"/>
<text x="20" y="33" fill="${C.fg}" font-size="20">‹</text>
<text x="215" y="33" fill="${C.fg}" font-size="15" font-weight="700" text-anchor="middle">İlan</text>
<rect x="346" y="16" width="64" height="22" rx="11" fill="rgba(255,255,255,0.10)"/>
<text x="378" y="31" fill="${C.dim}" font-size="11" text-anchor="middle">yayında</text>
<!-- owner row -->
<circle cx="36" cy="80" r="15" fill="${C.soft}"/>
<text x="36" y="85" fill="${C.fg}" font-size="13" text-anchor="middle">M</text>
<text x="60" y="85" fill="${C.fg}" font-size="13" font-weight="700">@mudanya_ev</text>
<rect x="350" y="70" width="60" height="20" rx="10" fill="rgba(255,255,255,0.10)"/>
<text x="380" y="84" fill="${C.dim}" font-size="10" text-anchor="middle">KONUT</text>
<!-- media banner -->
<defs>
 <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#243049"/><stop offset="1" stop-color="#0b0b0f"/>
 </linearGradient>
</defs>
<rect x="0" y="100" width="430" height="200" fill="url(#g1)"/>
<rect x="14" y="116" width="150" height="24" rx="12" fill="rgba(0,0,0,0.45)"/>
<text x="26" y="132" fill="${C.dim}" font-size="11">⟡ Yapay zeka · temsilî</text>
<rect x="14" y="262" width="150" height="30" rx="8" fill="rgba(0,0,0,0.5)"/>
<text x="26" y="283" fill="${C.fg}" font-size="17" font-weight="700">4.250.000 ₺</text>
<!-- actions -->
<text x="20" y="332" fill="${C.like}" font-size="20">♥</text>
<text x="44" y="332" fill="${C.fg}" font-size="14" font-weight="700">12</text>
<text x="86" y="332" fill="${C.fg}" font-size="18">⤓</text>
<text x="110" y="332" fill="${C.fg}" font-size="13" font-weight="700">Kaydet</text>
<!-- title/loc/attrs -->
<text x="20" y="368" fill="${C.fg}" font-size="15">Mudanya Bademli — denize bakan 3+1</text>
<text x="20" y="390" fill="${C.dim}" font-size="13">Bursa · Mudanya · Bademli</text>
<g font-size="12">
 <rect x="20" y="402" width="64" height="26" rx="8" fill="${C.panel}"/><text x="52" y="419" fill="${C.dim}" text-anchor="middle">165 m²</text>
 <rect x="92" y="402" width="50" height="26" rx="8" fill="${C.panel}"/><text x="117" y="419" fill="${C.dim}" text-anchor="middle">3+1</text>
 <rect x="150" y="402" width="64" height="26" rx="8" fill="${C.panel}"/><text x="182" y="419" fill="${C.dim}" text-anchor="middle">6 yaş</text>
</g>
<!-- KELEPIR SCORE CARD -->
<rect x="16" y="452" width="398" height="300" rx="18" fill="${C.panel}" stroke="${C.line}"/>
<text x="36" y="486" fill="${C.fg}" font-size="15" font-weight="700">Kelepir analizi</text>
<text x="36" y="506" fill="${C.faint}" font-size="11">Tek skor · fiyat avantajı · yalnız sen görüyorsun</text>
${ring(96, 590, 46, 78, C.kelepir)}
<text x="96" y="586" fill="${C.fg}" font-size="30" font-weight="700" text-anchor="middle">78</text>
<text x="96" y="606" fill="${C.faint}" font-size="11" text-anchor="middle">/100</text>
<!-- band + guven -->
<rect x="168" y="556" width="92" height="26" rx="13" fill="${C.kelepir}"/>
<text x="214" y="573" fill="#fff" font-size="12" font-weight="700" text-anchor="middle">Kelepir</text>
<rect x="270" y="556" width="120" height="26" rx="13" fill="none" stroke="${C.amber}"/>
<circle cx="286" cy="569" r="4" fill="${C.amber}"/>
<text x="298" y="573" fill="${C.amber}" font-size="11">Orta güven</text>
<!-- single advantage bar -->
<text x="168" y="606" fill="${C.dim}" font-size="12">Fiyat avantajı</text>
<text x="390" y="606" fill="${C.fg}" font-size="12" font-weight="700" text-anchor="end">78</text>
<rect x="168" y="614" width="222" height="8" rx="4" fill="${C.soft}"/>
<rect x="168" y="614" width="173" height="8" rx="4" fill="${C.kelepir}"/>
<!-- reference line -->
<rect x="36" y="648" width="358" height="58" rx="12" fill="${C.soft}"/>
<text x="50" y="672" fill="${C.dim}" font-size="12">Mahalle medyanı  2.300 ₺/m²</text>
<text x="50" y="692" fill="${C.fg}" font-size="12" font-weight="700">Bu ilan 1.950 ₺/m² · %15 daha ucuz</text>
<text x="36" y="730" fill="${C.faint}" font-size="11">Referans: 7 benzer ilan · eksikte mahalle tahmini (AI)</text>
<!-- AI sor CTA -->
<rect x="16" y="772" width="398" height="44" rx="12" fill="${C.brand}"/>
<text x="215" y="799" fill="#fff" font-size="14" font-weight="700" text-anchor="middle">Asistana sor</text>
<text x="20" y="852" fill="${C.faint}" font-size="11">Skor deterministik motorla hesaplanır; AI yalnız yorumlar.</text>
</svg>`;

// ───────── Mockup 2: Liste AI liderlik paneli ─────────
function rankItem(y, rank, title, price, band, bandLabel, score, guven) {
  return `
  <rect x="16" y="${y}" width="398" height="92" rx="14" fill="${C.panel}" stroke="${C.line}"/>
  <rect x="30" y="${y + 16}" width="60" height="60" rx="10" fill="${C.soft}"/>
  <circle cx="44" cy="${y + 30}" r="11" fill="rgba(0,0,0,0.6)"/>
  <text x="44" y="${y + 34}" fill="#fff" font-size="12" font-weight="700" text-anchor="middle">${rank}</text>
  <text x="104" y="${y + 34}" fill="${C.fg}" font-size="13" font-weight="700">${title}</text>
  <text x="104" y="${y + 54}" fill="${C.fg}" font-size="14" font-weight="700">${price}</text>
  <rect x="104" y="${y + 64}" width="${bandLabel.length * 7 + 22}" height="20" rx="10" fill="${band}"/>
  <text x="${104 + (bandLabel.length * 7 + 22) / 2}" y="${y + 78}" fill="#fff" font-size="11" font-weight="700" text-anchor="middle">${bandLabel}</text>
  <text x="398" y="${y + 40}" fill="${C.fg}" font-size="20" font-weight="700" text-anchor="end">${score}</text>
  <text x="398" y="${y + 60}" fill="${C.faint}" font-size="10" text-anchor="end">${guven}</text>`;
}
const m2 = `<svg xmlns="http://www.w3.org/2000/svg" width="430" height="920" viewBox="0 0 430 920" font-family="${F}">
<rect width="430" height="920" fill="${C.bg}"/>
<!-- header + tabs -->
<rect width="430" height="92" fill="#101016"/>
<text x="20" y="33" fill="${C.fg}" font-size="20">‹</text>
<text x="215" y="33" fill="${C.fg}" font-size="15" font-weight="700" text-anchor="middle">Favorilerim</text>
<text x="404" y="33" fill="${C.fg}" font-size="16" text-anchor="end">⚙</text>
<rect x="16" y="52" width="300" height="34" rx="9" fill="${C.panel}"/>
<rect x="20" y="56" width="146" height="26" rx="7" fill="${C.soft}"/>
<text x="93" y="73" fill="${C.dim}" font-size="12" font-weight="700" text-anchor="middle">İlanlar</text>
<text x="242" y="73" fill="${C.fg}" font-size="12" font-weight="700" text-anchor="middle">AI Analiz</text>
<rect x="324" y="52" width="90" height="34" rx="9" fill="${C.brand}"/>
<text x="369" y="73" fill="#fff" font-size="12" font-weight="700" text-anchor="middle">AI Analiz</text>
<!-- commentary -->
<rect x="16" y="104" width="398" height="92" rx="14" fill="${C.panel}" stroke="${C.line}"/>
<text x="32" y="128" fill="${C.faint}" font-size="11" font-weight="700">AI DEĞERLENDİRMESİ</text>
<text x="32" y="150" fill="${C.dim}" font-size="12">En kelepir: Mudanya Bademli (%15 piyasa altı, güçlü</text>
<text x="32" y="168" fill="${C.dim}" font-size="12">konum). 2. sıradaki daire fiyatı iyi ama bina yaşı</text>
<text x="32" y="186" fill="${C.dim}" font-size="12">yüksek. Aşağıdaki sıralama kelepirden aza dizili.</text>
${rankItem(212, 1, 'Mudanya Bademli 3+1', '4.250.000 ₺', C.kelepir, 'Kelepir', 78, 'orta güven')}
${rankItem(316, 2, 'Nilüfer 2+1 daire', '3.100.000 ₺', C.iyi, 'İyi Fiyat', 64, 'yüksek güven')}
${rankItem(420, 3, 'Osmangazi 3+1', '2.850.000 ₺', C.piyasa, 'Piyasa', 47, 'yüksek güven')}
${rankItem(524, 4, 'Mudanya arsa 500 m²', '1.900.000 ₺', C.pahali, 'Pahalı', 31, 'düşük güven')}
<text x="20" y="648" fill="${C.faint}" font-size="11">Filtre: ilçe · fiyat · m² · oda · band · sıralama</text>
</svg>`;

for (const [name, svg] of [['kelepir-skor-karti', m1], ['liste-ai-liderlik', m2]]) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: 860 },
    font: { loadSystemFonts: true, defaultFontFamily: 'Liberation Sans' },
    background: C.bg,
  });
  writeFileSync(`design/mockups/${name}.png`, r.render().asPng());
  console.log('wrote design/mockups/' + name + '.png');
}
