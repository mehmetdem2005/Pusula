// Admin paneli görsel önizleme (gerçek admin.css + örnek veri). Sadece tasarımı göstermek için.
import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
mkdirSync('design/mockups', { recursive: true });

const CSS = readFileSync('apps/web/app/admin/admin.css', 'utf8');

const NAV = [
  ['Genel Bakış', 'M4 11l8-7 8 7M6 10v9h12v-9'],
  ['Kullanıcılar', 'M16 19c0-2.8-2-4-4-4s-4 1.2-4 4M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  ['İlanlar', 'M4 5h16v14H4zM4 9h16M9 9v10'],
  ['Raporlar', 'M5 3v18M5 4h11l-2 4 2 4H5'],
  ['Adminler', 'M12 3l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V6l7-3ZM9.5 12l1.8 1.8L15 10'],
  ['Sağlayıcılar', 'M4 7h16M4 12h16M4 17h16'],
];
const ic = (d) =>
  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;

const side = (active) => `
<aside class="admin-side">
  <div class="admin-brand">Pusula<small>Yönetim</small></div>
  ${NAV.map(([l, d]) => `<a class="admin-navlink${l === active ? ' on' : ''}">${ic(d)}${l}</a>`).join('')}
  <div style="margin-top:auto;padding-top:16px"><span class="a-badge" style="background:var(--ink);color:#fff">Süper admin</span></div>
</aside>`;

const stat = (label, value, sub) => `
<div class="a-card" style="padding:18px 20px">
  <div style="font-size:13px;color:var(--sub)">${label}</div>
  <div class="tnum" style="font-size:30px;font-weight:700;margin-top:8px">${value}</div>
  ${sub ? `<div style="font-size:12px;color:var(--faint);margin-top:4px">${sub}</div>` : ''}
</div>`;

const badge = (tone, text) => {
  const t = {
    green: 'background:var(--green-bg);border-color:var(--green-line);color:var(--green)',
    red: 'background:var(--red-bg);border-color:#f1c8c8;color:var(--red)',
    amber: 'background:var(--amber-bg);border-color:#f3e1c6;color:var(--amber)',
    gray: 'background:var(--soft);border-color:var(--line);color:var(--sub)',
    ink: 'background:var(--ink);border-color:var(--ink);color:#fff',
  }[tone];
  return `<span class="a-badge" style="${t}">${text}</span>`;
};

const overview = `
<div class="admin-root"><div class="admin-shell">${side('Genel Bakış')}
<main class="admin-main">
  <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:24px">
    <div><div class="eyebrow">Yönetim</div><h1 style="font-size:28px;margin-top:8px">Genel Bakış</h1></div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:14px">
    ${stat('Kullanıcı', '2.418', '14 admin · 6 askıda')}
    ${stat('Yayındaki ilan', '1.207')}
    ${stat('Bekleyen ilan', '63', 'taslak / işleniyor')}
    ${stat('Kaldırılan ilan', '38')}
    ${stat('Açık rapor', '9')}
  </div>
  <div class="a-card" style="margin-top:28px;overflow:hidden">
    <div style="padding:16px 18px;border-bottom:1px solid var(--line)"><h2 style="font-size:16px">Son işlemler</h2></div>
    <table class="a-table"><thead><tr><th>İşlem</th><th>Hedef</th><th>Tarih</th></tr></thead><tbody>
      ${[
        ['listing.takedown', 'listing · 8c1f2a90', '25 May 2026'],
        ['user.update', 'user · 4b7e1102', '25 May 2026'],
        ['admin.add', 'user · a90c33d1', '24 May 2026'],
        ['report.resolve', 'report · 2f55ab10', '24 May 2026'],
      ]
        .map(
          ([a, t, d]) =>
            `<tr><td style="font-weight:600">${a}</td><td style="color:var(--sub)">${t}</td><td style="color:var(--sub)">${d}</td></tr>`,
        )
        .join('')}
    </tbody></table>
  </div>
</main></div></div>`;

const roleSelect = (v) =>
  `<select class="a-select" style="height:32px;font-size:13px">${['individual', 'agent', 'dealer', 'admin'].map((r) => `<option ${r === v ? 'selected' : ''}>${r}</option>`).join('')}</select>`;

const users = `
<div class="admin-root"><div class="admin-shell">${side('Kullanıcılar')}
<main class="admin-main">
  <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:24px">
    <div><div class="eyebrow">Yönetim</div><h1 style="font-size:28px;margin-top:8px">Kullanıcılar</h1></div>
  </div>
  <div style="display:flex;gap:10px;margin-bottom:18px">
    <input class="a-input" style="flex:1;max-width:360px" value="" placeholder="E-posta ara…"/>
    <button class="a-btn-ghost">Ara</button>
  </div>
  <div class="a-card" style="overflow:hidden">
    <table class="a-table"><thead><tr><th>Kullanıcı</th><th>Rol</th><th>Durum</th><th>Kayıt</th><th style="text-align:right">İşlem</th></tr></thead><tbody>
      ${[
        ['mehmetdem782100@gmail.com', 'Mehmet Demir', 'admin', true],
        ['ezgi.yatirim@gmail.com', 'Ezgi K.', 'dealer', true],
        ['hasan.emlak@outlook.com', 'Hasan Bey', 'agent', true],
        ['berke.selin@gmail.com', null, 'individual', false],
      ]
        .map(
          ([email, name, role, active]) => `<tr>
        <td><div style="font-weight:600">${email}</div>${name ? `<div style="font-size:12px;color:var(--faint)">${name}</div>` : ''}</td>
        <td>${roleSelect(role)}</td>
        <td>${active ? badge('green', 'Aktif') : badge('red', 'Askıda')}</td>
        <td style="color:var(--sub)">12 May 2026</td>
        <td style="text-align:right"><button class="a-btn-sm ${active ? 'a-btn-danger' : 'a-btn-ghost'}">${active ? 'Askıya al' : 'Askıyı kaldır'}</button></td>
      </tr>`,
        )
        .join('')}
    </tbody></table>
  </div>
</main></div></div>`;

const doc = (b) =>
  `<!doctype html><html><head><meta charset="utf-8"><style>${CSS} body{margin:0}</style></head><body>${b}</body></html>`;

const browser = await chromium.launch();
for (const [name, html, h] of [
  ['admin-genel', overview, 720],
  ['admin-kullanicilar', users, 640],
]) {
  const page = await browser.newPage({ viewport: { width: 1200, height: h }, deviceScaleFactor: 1.5 });
  await page.setContent(doc(html), { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `design/mockups/${name}.png`, fullPage: true });
  await page.close();
  console.log('wrote', name);
}
await browser.close();
