// Pusula ekranları — açık token tabanından (tools/_kit.mjs) beslenen mockup'lar.
// Kullanım:  node tools/screens.mjs            → hepsini render et
//            node tools/screens.mjs asistan    → adı 'asistan' ile başlayanları
import {
  PH, icon, listingCard, scoreBlock, bottomNav, topNav, eyebrow, render,
} from './_kit.mjs';

const X = (s = 13) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`;

const LISTINGS = [
  { photo: PH.p1, score: 78, title: 'Bademli’de denize bakan 3+1', price: '4.250.000 ₺', ppm: '1.950 ₺/m²', specs: '165 m² · 3+1 · 2018', loc: 'Bursa · Mudanya' },
  { photo: PH.p2, score: 64, title: 'Site içinde bahçeli 2+1', price: '2.890.000 ₺', ppm: '2.140 ₺/m²', specs: '135 m² · 2+1 · 2015', loc: 'İzmir · Karşıyaka' },
  { photo: PH.p3, title: 'Merkezde yenilenmiş 1+1', price: '1.650.000 ₺', ppm: '2.750 ₺/m²', specs: '60 m² · 1+1 · 2009', loc: 'Ankara · Çankaya' },
  { photo: PH.p4, score: 71, title: 'Müstakil bahçe katı 4+1', price: '6.100.000 ₺', ppm: '1.780 ₺/m²', specs: '210 m² · 4+1 · 2021', loc: 'Bursa · Nilüfer' },
  { photo: PH.p3, score: 69, title: 'Şehir manzaralı yüksek kat 3+1', price: '5.400.000 ₺', ppm: '2.020 ₺/m²', specs: '170 m² · 3+1 · 2020', loc: 'İstanbul · Kadıköy' },
  { photo: PH.p1, title: 'Köşe konumda ferah 2+1', price: '3.180.000 ₺', ppm: '2.260 ₺/m²', specs: '128 m² · 2+1 · 2016', loc: 'Antalya · Konyaaltı' },
];

const searchBar = (h = 46, ph = 'Mahalle, fiyat, oda…') => `
<div style="display:flex;align-items:center;gap:10px;height:${h}px;background:var(--soft);border:1px solid var(--line);border-radius:14px;padding:0 14px;cursor:text">
  ${icon.search(19, '#9aa1ab')}
  <span style="flex:1;font-size:15px;color:var(--faint)">${ph}</span>
  <span style="width:1px;height:20px;background:var(--line)"></span>
  ${icon.filter(19, '#5b6470')}
</div>`;

const fchip = (t) =>
  `<span class="chip on" style="gap:7px;color:#fff">${t}<span style="opacity:.6;display:inline-flex">${X(12)}</span></span>`;

const miniCard = (o) => `
<div style="background:#fff;border:1px solid var(--line);border-radius:14px;padding:10px;display:flex;gap:12px;align-items:center;max-width:80%;box-shadow:0 8px 22px -18px rgba(16,24,40,.3)">
  <div style="width:80px;height:80px;border-radius:10px;background:#e9eaee url('${o.photo}') center/cover;flex-shrink:0"></div>
  <div style="min-width:0">
    <span style="display:inline-flex;align-items:center;gap:5px;background:var(--green-bg);border:1px solid var(--green-line);color:var(--green);font-size:11px;font-weight:700;border-radius:999px;padding:3px 8px">${icon.spark(11, '#15803d')} Kelepir ${o.score}</span>
    <div class="h" style="font-size:14px;font-weight:600;color:var(--ink);margin-top:7px;line-height:1.2">${o.title}</div>
    <div class="tnum" style="font-size:15px;font-weight:700;color:var(--ink);margin-top:4px">${o.price}</div>
  </div>
</div>`;

// ============================== AKIŞ ==============================
const akisMobil = `
<div style="width:390px;height:844px;background:#fff;position:relative;overflow:hidden">
  <div style="padding:20px 18px 12px;display:flex;align-items:center;justify-content:space-between">
    <div class="h" style="font-size:21px;font-weight:700;color:var(--ink)">Pusula</div>
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:38px;height:38px;border-radius:50%;border:1px solid var(--line-2);display:grid;place-items:center;cursor:pointer">${icon.search(19, '#0a0b0d')}</div>
      <div style="width:36px;height:36px;border-radius:50%;background:#e9eaee url('${PH.p4}') center/cover"></div>
    </div>
  </div>
  <div style="display:flex;gap:8px;padding:4px 18px 14px;overflow:hidden">
    <span class="chip on">Tümü</span><span class="chip">${icon.spark(13, '#5b6470')} Kelepir</span><span class="chip">Yeni</span><span class="chip">Yakınımda</span>
  </div>
  <div style="position:absolute;top:120px;bottom:78px;left:0;right:0;overflow:hidden;padding:6px 18px;display:flex;flex-direction:column;gap:16px">
    ${listingCard(LISTINGS[0])}${listingCard(LISTINGS[1])}${listingCard(LISTINGS[3])}
  </div>
  ${bottomNav('akis')}
</div>`;

const akisWeb = `
${topNav('akis')}
<div style="max-width:1120px;margin:0 auto;padding:34px 40px 60px">
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>${eyebrow('Senin için')}<h1 class="h" style="font-size:28px;font-weight:600;color:var(--ink);margin-top:10px">Akış</h1></div>
    <div style="display:flex;align-items:center;gap:8px">
      <span class="chip on">Tümü</span><span class="chip">${icon.spark(13, '#5b6470')} Kelepir</span><span class="chip">Yeni</span><span class="chip">Yakınımda</span>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:22px;margin-top:26px">
    ${LISTINGS.map((l) => listingCard(l)).join('')}
  </div>
</div>`;

// ============================== KEŞFET ==============================
const kesfetMobil = `
<div style="width:390px;height:844px;background:#fff;position:relative;overflow:hidden">
  <div style="padding:18px 16px 10px">${searchBar()}</div>
  <div style="display:flex;gap:8px;padding:2px 16px 10px;overflow:hidden">
    ${fchip('Bursa')}${fchip('3+1')}${fchip('≤ 4,5M ₺')}${fchip('Kelepir')}
  </div>
  <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 16px 12px">
    <span style="font-size:13px;color:var(--sub)"><b style="color:var(--ink)" class="tnum">248</b> ilan</span>
    <span style="display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer">Kelepire göre
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a0b0d" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></span>
  </div>
  <div style="position:absolute;top:178px;bottom:78px;left:0;right:0;overflow:hidden;padding:0 16px;display:grid;grid-template-columns:1fr 1fr;gap:12px;align-content:start">
    ${[LISTINGS[0], LISTINGS[3], LISTINGS[1], LISTINGS[4]].map((l) => listingCard({ ...l, compact: true })).join('')}
  </div>
  ${bottomNav('kesfet')}
</div>`;

const fieldRow = (label, val) => `
<div style="margin-bottom:22px">
  <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:10px">${label}</div>
  ${val}
</div>`;

const kesfetWeb = `
${topNav('kesfet')}
<div style="max-width:1180px;margin:0 auto;padding:28px 40px 60px">
  ${searchBar(50, 'Mahalle, ilçe ya da “deniz manzaralı 3+1” yaz…')}
  <div style="display:grid;grid-template-columns:266px 1fr;gap:36px;margin-top:26px;align-items:start">
    <aside style="border:1px solid var(--line);border-radius:18px;padding:22px 20px">
      <div class="h" style="font-size:16px;font-weight:700;color:var(--ink);margin-bottom:20px">Filtrele</div>
      ${fieldRow('Fiyat aralığı', `
        <div style="display:flex;gap:8px">
          <div style="flex:1;height:42px;border:1px solid var(--line-2);border-radius:10px;display:flex;align-items:center;padding:0 12px;font-size:14px;color:var(--sub)" class="tnum">1,5M ₺</div>
          <div style="flex:1;height:42px;border:1px solid var(--line-2);border-radius:10px;display:flex;align-items:center;padding:0 12px;font-size:14px;color:var(--sub)" class="tnum">4,5M ₺</div>
        </div>`)}
      ${fieldRow('Oda sayısı', `<div style="display:flex;flex-wrap:wrap;gap:8px"><span class="chip">1+1</span><span class="chip">2+1</span><span class="chip on">3+1</span><span class="chip">4+1</span></div>`)}
      ${fieldRow('Kelepir skoru', `
        <div class="bar" style="height:6px;margin-top:6px"><i style="width:64%"></i></div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px;color:var(--faint)"><span>en az 60</span><span style="color:var(--green);font-weight:600">Kelepir+</span></div>`)}
      ${fieldRow('Mahalle', `
        <div style="display:flex;flex-direction:column;gap:11px;font-size:14px;color:var(--ink)">
          ${['Mudanya', 'Nilüfer', 'Osmangazi'].map((m, i) => `<label style="display:flex;align-items:center;gap:10px;cursor:pointer"><span style="width:18px;height:18px;border-radius:5px;border:1.5px solid ${i === 0 ? 'var(--ink)' : 'var(--line-2)'};background:${i === 0 ? 'var(--ink)' : '#fff'};display:grid;place-items:center">${i === 0 ? icon.check(12, '#fff') : ''}</span>${m}</label>`).join('')}
        </div>`)}
      <button class="btn-ghost" style="width:100%;height:42px;margin-top:6px">Filtreleri temizle</button>
    </aside>
    <div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <h1 class="h" style="font-size:22px;font-weight:600;color:var(--ink)"><span class="tnum">248</span> ilan · Bursa</h1>
        <span style="display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:var(--ink);cursor:pointer">Kelepire göre <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a0b0d" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px">
        ${[LISTINGS[0], LISTINGS[3], LISTINGS[4], LISTINGS[1], LISTINGS[5], LISTINGS[2]].map((l) => listingCard({ ...l, compact: true })).join('')}
      </div>
    </div>
  </div>
</div>`;

// ============================== ASİSTAN ==============================
const quick = (t) => `<span class="chip" style="background:#fff">${t}</span>`;

const asistanThread = `
<div class="bubble bubble-ai">Merhaba! Bütçen ve bölgen için en uygun kelepirleri tarayabilirim. Ne arıyorsun?</div>
<div class="bubble bubble-me">Mudanya’da 4 milyon altı, deniz manzaralı 3+1</div>
<div class="bubble bubble-ai">7 ilan içinde 3 kelepir buldum. En güçlüsü bu — mahalle medyanının <b>%15 altında</b>:</div>
${miniCard(LISTINGS[0])}
<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:2px">${quick('Daha uygunları')}${quick('Haritada göster')}${quick('Bunu kaydet')}</div>`;

const asistanMobil = `
<div style="width:390px;height:844px;background:#fff;position:relative;overflow:hidden">
  <div style="display:flex;align-items:center;gap:11px;padding:16px 18px;border-bottom:1px solid var(--line)">
    <div style="width:40px;height:40px;border-radius:12px;background:var(--ink);display:grid;place-items:center">${icon.spark(20, '#fff')}</div>
    <div><div class="h" style="font-size:16px;font-weight:600;color:var(--ink)">Pusula Asistan</div>
    <div style="font-size:12px;color:var(--green);font-weight:500;display:flex;align-items:center;gap:5px"><span style="width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block"></span>ilanları senin için tarıyor</div></div>
  </div>
  <div style="position:absolute;top:74px;bottom:84px;left:0;right:0;overflow:hidden;padding:18px 18px;display:flex;flex-direction:column;gap:12px;align-items:flex-start">
    ${asistanThread}
  </div>
  <div style="position:absolute;left:0;right:0;bottom:0;padding:12px 16px 24px;border-top:1px solid var(--line);background:#fff;display:flex;align-items:center;gap:10px">
    <div style="flex:1;height:46px;background:var(--soft);border:1px solid var(--line);border-radius:14px;display:flex;align-items:center;padding:0 16px;font-size:15px;color:var(--faint)">Mesaj yaz…</div>
    <div style="width:46px;height:46px;border-radius:14px;border:1px solid var(--line-2);display:grid;place-items:center;cursor:pointer">${icon.mic(21, '#0a0b0d')}</div>
    <div style="width:46px;height:46px;border-radius:14px;background:var(--ink);display:grid;place-items:center;cursor:pointer">${icon.send(20, '#fff')}</div>
  </div>
</div>`;

const asistanWeb = `
${topNav('asistan')}
<div style="display:grid;grid-template-columns:1fr 384px;height:796px">
  <div style="position:relative;display:flex;flex-direction:column">
    <div style="max-width:720px;width:100%;margin:0 auto;flex:1;padding:30px 32px 0;display:flex;flex-direction:column;gap:13px;align-items:flex-start;overflow:hidden">
      ${eyebrow('Bugün')}
      ${asistanThread}
    </div>
    <div style="border-top:1px solid var(--line);padding:16px 32px 24px;background:#fff">
      <div style="max-width:720px;margin:0 auto;display:flex;align-items:center;gap:10px">
        <div style="flex:1;height:50px;background:var(--soft);border:1px solid var(--line);border-radius:14px;display:flex;align-items:center;padding:0 18px;font-size:15px;color:var(--faint)">Pusula’ya bir şey sor…</div>
        <div style="width:50px;height:50px;border-radius:14px;border:1px solid var(--line-2);display:grid;place-items:center;cursor:pointer">${icon.mic(22, '#0a0b0d')}</div>
        <div style="width:50px;height:50px;border-radius:14px;background:var(--ink);display:grid;place-items:center;cursor:pointer">${icon.send(21, '#fff')}</div>
      </div>
    </div>
  </div>
  <aside style="border-left:1px solid var(--line);background:#fcfcfd;padding:26px 24px;overflow:hidden">
    ${eyebrow('Konuşulan ilan')}
    <div style="margin-top:14px">${listingCard({ ...LISTINGS[0], compact: true })}</div>
    <div class="divide" style="margin:22px 0"></div>
    ${scoreBlock(false)}
    <div style="display:flex;gap:10px;margin-top:24px">
      <button class="btn-dark" style="flex:1;height:46px">İlanı aç</button>
      <button class="btn-ghost" style="width:46px;height:46px">${icon.save(20, '#0a0b0d')}</button>
    </div>
  </aside>
</div>`;

// ============================== SESLİ ==============================
const vsvg = (p, s = 22, sw = 1.8, c = '#0a0b0d') =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const micOff = (c) => vsvg('<path d="M3 3l18 18M9 9v2a3 3 0 0 0 4.5 2.6M15 11V5a3 3 0 0 0-5.8-1M19 11a7 7 0 0 1-1 3.5M12 18v3"/>', 22, 1.8, c);
const keyboard = (c) => vsvg('<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8"/>', 22, 1.8, c);

const orb = (size) => `
<div style="position:relative;width:${size}px;height:${size}px;display:grid;place-items:center">
  <div style="position:absolute;inset:0;border-radius:50%;border:1px solid var(--line)"></div>
  <div style="position:absolute;inset:${size * 0.13}px;border-radius:50%;border:1px solid var(--line-2)"></div>
  <div style="position:absolute;inset:${size * 0.26}px;border-radius:50%;border:1.5px solid var(--green-line);box-shadow:0 0 0 7px rgba(21,128,61,.05)"></div>
  <div style="width:${size * 0.46}px;height:${size * 0.46}px;border-radius:50%;background:var(--ink);display:flex;align-items:center;justify-content:center;gap:5px">
    ${[15, 27, 19, 33, 17, 24].map((h) => `<span style="width:5px;height:${h * (size / 220)}px;border-radius:3px;background:#fff;opacity:.95"></span>`).join('')}
  </div>
</div>`;

const statusPill = `<div style="display:inline-flex;align-items:center;gap:7px;background:var(--green-bg);border:1px solid var(--green-line);color:var(--green);font-size:13px;font-weight:600;padding:6px 14px;border-radius:999px"><span style="width:7px;height:7px;border-radius:50%;background:var(--green)"></span>Dinliyor…</div>`;

const ctrl = (ico, fill, big) =>
  `<div style="width:${big ? 72 : 58}px;height:${big ? 72 : 58}px;border-radius:50%;${fill ? 'background:var(--ink)' : 'background:#fff;border:1px solid var(--line-2)'};display:grid;place-items:center;cursor:pointer">${ico}</div>`;

const sesliCaption = (sz) => `
<div style="text-align:center;padding:0 ${sz > 24 ? 60 : 30}px">
  <div class="h" style="font-size:${sz}px;font-weight:600;color:var(--ink);line-height:1.32">“Mudanya’da bütçene uyan 3 kelepir buldum — en uygununu açayım mı?”</div>
  <div style="font-size:14px;color:var(--faint);margin-top:16px">Sen: “Evet, deniz manzaralı olanı göster”</div>
</div>`;

const sesliMobil = `
<div style="width:390px;height:844px;background:#fff;position:relative;overflow:hidden">
  <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 18px">
    <div class="eyebrow">Sesli · Asistan</div>
    <div style="width:36px;height:36px;border-radius:50%;border:1px solid var(--line-2);display:grid;place-items:center;color:var(--sub);cursor:pointer">${X(15)}</div>
  </div>
  <div style="position:absolute;top:118px;left:0;right:0;display:flex;flex-direction:column;align-items:center">
    ${statusPill}
    <div style="margin-top:34px">${orb(216)}</div>
    <div style="margin-top:40px">${sesliCaption(22)}</div>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:46px;display:flex;justify-content:center;gap:22px;align-items:center">
    ${ctrl(micOff('#0a0b0d'), false, false)}
    ${ctrl(`<span style="color:#fff;display:grid;place-items:center">${X(26)}</span>`, true, true)}
    ${ctrl(keyboard('#0a0b0d'), false, false)}
  </div>
</div>`;

const tline = (who, text, me) => `
<div style="display:flex;gap:16px;padding:13px 0;border-bottom:1px solid var(--line)">
  <div style="width:58px;flex-shrink:0;font-size:12px;font-weight:700;color:${me ? 'var(--ink)' : 'var(--green)'}">${who}</div>
  <div style="font-size:15px;color:var(--sub);line-height:1.5">${text}</div>
</div>`;

const sesliWeb = `
${topNav('asistan')}
<div style="max-width:760px;margin:0 auto;padding:40px 40px 60px;display:flex;flex-direction:column;align-items:center">
  ${statusPill}
  <div style="margin-top:34px">${orb(248)}</div>
  <div style="margin-top:38px">${sesliCaption(27)}</div>
  <div style="margin-top:40px;display:flex;gap:24px;align-items:center">
    ${ctrl(micOff('#0a0b0d'), false, false)}
    ${ctrl(`<span style="color:#fff;display:grid;place-items:center">${X(26)}</span>`, true, true)}
    ${ctrl(keyboard('#0a0b0d'), false, false)}
  </div>
  <div class="divide" style="width:100%;max-width:620px;margin:40px 0 8px"></div>
  <div style="width:100%;max-width:620px">
    <div class="eyebrow" style="margin-bottom:4px">Döküm</div>
    ${tline('Asistan', 'Merhaba, bugün neyi aramak istersin?')}
    ${tline('Sen', 'Mudanya’da 4 milyon altı, deniz manzaralı 3+1', true)}
    ${tline('Asistan', '7 ilan içinde 3 kelepir buldum. En güçlüsü mahalle medyanının %15 altında.')}
    ${tline('Sen', 'En uygununu göster', true)}
  </div>
</div>`;

// ============================== İLAN VER ==============================
const field = (label, control) =>
  `<div style="margin-bottom:18px"><div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:8px">${label}</div>${control}</div>`;
const inputBox = (val, ph, suffix, h = 50) =>
  `<div style="height:${h}px;background:var(--soft);border:1px solid var(--line);border-radius:12px;display:flex;align-items:center;padding:0 14px;font-size:15px;color:${val ? 'var(--ink)' : 'var(--faint)'};font-weight:${val ? 600 : 400}">${val || ph}${suffix ? `<span style="margin-left:auto;color:var(--faint);font-weight:500">${suffix}</span>` : ''}</div>`;
const odaChips = (sel) => `<div style="display:flex;flex-wrap:wrap;gap:8px">${['1+1', '2+1', '3+1', '4+1', '5+1'].map((o) => `<span class="chip ${o === sel ? 'on' : ''}">${o}</span>`).join('')}</div>`;

const uploader = (cols) => `
<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px">
  <div style="aspect-ratio:1;border-radius:12px;background:#e9eaee url('${PH.p1}') center/cover;position:relative">
    <span class="badge badge-glass" style="bottom:7px;left:7px;font-size:10px;padding:3px 8px">Kapak</span></div>
  <div style="aspect-ratio:1;border-radius:12px;background:#e9eaee url('${PH.p2}') center/cover"></div>
  ${cols > 3 ? `<div style="aspect-ratio:1;border-radius:12px;background:#e9eaee url('${PH.p3}') center/cover"></div>` : ''}
  <div style="aspect-ratio:1;border-radius:12px;border:1.5px dashed var(--line-2);background:var(--soft);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;cursor:pointer">
    ${icon.camera(22, '#9aa1ab')}<span style="font-size:12px;color:var(--faint);font-weight:500">Ekle</span></div>
</div>`;

const kelepirEstimate = `
<div style="background:var(--green-bg);border:1px solid var(--green-line);border-radius:16px;padding:16px">
  <div style="display:flex;align-items:center;gap:8px">${icon.spark(16, '#15803d')}<span style="font-size:13px;font-weight:700;color:var(--green)">Kelepir tahmini</span></div>
  <div style="display:flex;align-items:flex-end;gap:13px;margin-top:11px">
    <div class="tnum" style="font-size:38px;font-weight:700;color:var(--green);line-height:.85">72</div>
    <div style="font-size:13px;color:#3f7a55;padding-bottom:4px;line-height:1.4">Mahalle medyanının <b>%12 altında</b>.<br>Verilere göre daha hızlı satılır.</div>
  </div>
</div>`;

const ilanVerMobil = `
<div style="width:390px;height:844px;background:#fff;position:relative;overflow:hidden">
  <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--line)">
    <div style="width:32px;color:#0a0b0d;cursor:pointer">${icon.back(22)}</div>
    <div class="h" style="font-size:16px;font-weight:600;color:var(--ink)">İlan ver</div>
    <div class="tnum" style="width:32px;text-align:right;font-size:13px;font-weight:600;color:var(--faint)">2/4</div>
  </div>
  <div style="position:absolute;top:57px;bottom:92px;left:0;right:0;overflow:hidden;padding:18px">
    <div class="eyebrow">Fotoğraflar</div>
    <div style="margin-top:12px">${uploader(3)}</div>
    <div class="divide" style="margin:20px 0"></div>
    ${field('Başlık', inputBox('Bademli’de denize bakan 3+1', ''))}
    ${field('Fiyat', inputBox('4.250.000', '', '₺'))}
    <div style="margin-bottom:18px">${kelepirEstimate}</div>
    ${field('Oda sayısı', odaChips('3+1'))}
    ${field('Alan', inputBox('165', '', 'm²'))}
  </div>
  <div style="position:absolute;left:0;right:0;bottom:0;padding:14px 18px 26px;border-top:1px solid var(--line);background:#fff">
    <button class="btn-dark" style="width:100%;height:52px">Devam</button>
  </div>
</div>`;

const step = (n, label, state) => `
<div style="display:flex;align-items:center;gap:9px">
  <span style="width:24px;height:24px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:700;${state === 'on' ? 'background:var(--ink);color:#fff' : state === 'done' ? 'background:var(--green);color:#fff' : 'background:var(--soft);color:var(--faint);border:1px solid var(--line)'}">${state === 'done' ? icon.check(13, '#fff') : n}</span>
  <span style="font-size:13px;font-weight:${state === 'on' ? 600 : 500};color:${state === 'on' ? 'var(--ink)' : 'var(--faint)'}">${label}</span>
</div>`;
const stepLine = `<span style="flex:1;height:1px;background:var(--line);margin:0 14px"></span>`;

const ilanVerWeb = `
${topNav('')}
<div style="max-width:1080px;margin:0 auto;padding:34px 40px 60px">
  <div>${eyebrow('Yeni ilan')}<h1 class="h" style="font-size:28px;font-weight:600;color:var(--ink);margin-top:10px">İlan ver</h1></div>
  <div style="display:flex;align-items:center;margin:26px 0 30px;max-width:680px">
    ${step('1', 'Bilgiler', 'on')}${stepLine}${step('2', 'Fotoğraf', 'idle')}${stepLine}${step('3', 'Konum', 'idle')}${stepLine}${step('4', 'Yayınla', 'idle')}
  </div>
  <div style="display:grid;grid-template-columns:1fr 380px;gap:40px;align-items:start">
    <div>
      <div class="eyebrow">Fotoğraflar</div>
      <div style="margin-top:12px">${uploader(4)}</div>
      <div class="divide" style="margin:24px 0"></div>
      ${field('Başlık', inputBox('Bademli’de denize bakan 3+1', ''))}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        ${field('Fiyat', inputBox('4.250.000', '', '₺'))}
        ${field('Alan', inputBox('165', '', 'm²'))}
      </div>
      ${field('Oda sayısı', odaChips('3+1'))}
      ${field('Konum', inputBox('Bursa · Mudanya · Bademli', '', ''))}
      ${field('Açıklama', `<div style="min-height:104px;background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:13px 14px;font-size:15px;color:var(--sub);line-height:1.5">Denize sıfır, 2018 yapımı, güney cephe. Site içinde otopark ve havuz mevcut…</div>`)}
    </div>
    <aside>
      <div class="eyebrow">Önizleme</div>
      <div style="margin-top:12px">${listingCard({ ...LISTINGS[0], compact: true })}</div>
      <div style="margin-top:16px">${kelepirEstimate}</div>
      <button class="btn-dark" style="width:100%;height:50px;margin-top:18px">Yayınla</button>
      <button class="btn-ghost" style="width:100%;height:46px;margin-top:10px">Taslak kaydet</button>
    </aside>
  </div>
</div>`;

// ============================== LİSTELER ==============================
const mosaic = (photos) =>
  `<div style="display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:3px;aspect-ratio:4/3">${photos.map((p) => `<div style="background:#e9eaee url('${p}') center/cover"></div>`).join('')}</div>`;
const listCard = (o) => `
<div class="card shadow-card">
  ${mosaic(o.photos)}
  <div style="padding:13px 15px 15px">
    <div style="display:flex;align-items:center;gap:7px"><div class="h" style="font-size:16px;font-weight:600;color:var(--ink)">${o.name}</div>${o.heart ? icon.heart(15, '#15803d') : ''}</div>
    <div style="font-size:13px;color:var(--sub);margin-top:4px"><span class="tnum">${o.count}</span> ilan${o.note ? ` · ${o.note}` : ''}</div>
  </div>
</div>`;
const LISTS = [
  { name: 'Deniz manzaralı', count: 8, photos: [PH.p1, PH.p3, PH.p4, PH.p2] },
  { name: 'Bütçe dostu', count: 12, photos: [PH.p3, PH.p2, PH.p1, PH.p4] },
  { name: 'Favoriler', count: 5, heart: true, photos: [PH.p4, PH.p1, PH.p2, PH.p3] },
  { name: 'Yatırımlık', count: 3, photos: [PH.p2, PH.p4, PH.p3, PH.p1] },
];

const listelerMobil = `
<div style="width:390px;height:844px;background:#fff;position:relative;overflow:hidden">
  <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 18px 12px">
    <div class="h" style="font-size:21px;font-weight:700;color:var(--ink)">Listeler</div>
    <div style="width:38px;height:38px;border-radius:50%;border:1px solid var(--line-2);display:grid;place-items:center;cursor:pointer">${icon.plus(20)}</div>
  </div>
  <div style="position:absolute;top:72px;bottom:78px;left:0;right:0;overflow:hidden;padding:6px 18px;display:grid;grid-template-columns:1fr 1fr;gap:14px;align-content:start">
    ${LISTS.map((l) => listCard(l)).join('')}
  </div>
  ${bottomNav('listeler')}
</div>`;

const listelerWeb = `
${topNav('listeler')}
<div style="max-width:1120px;margin:0 auto;padding:34px 40px 60px">
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>${eyebrow('Kaydettiklerin')}<h1 class="h" style="font-size:28px;font-weight:600;color:var(--ink);margin-top:10px">Listelerim</h1></div>
    <button class="btn-ghost" style="height:42px;padding:0 18px;font-size:14px">${icon.plus(17)} Yeni liste</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-top:26px">
    ${LISTS.map((l) => listCard(l)).join('')}
  </div>
</div>`;

// ============================== PROFİL ==============================
const verified = `<span style="width:18px;height:18px;border-radius:50%;background:var(--green);display:inline-grid;place-items:center;vertical-align:middle">${icon.check(11, '#fff')}</span>`;
const stat = (v, l) => `<div style="text-align:center"><div class="tnum h" style="font-size:19px;font-weight:700;color:var(--ink)">${v}</div><div style="font-size:12px;color:var(--faint);margin-top:2px">${l}</div></div>`;
const vbar = `<div style="width:1px;height:30px;background:var(--line)"></div>`;
const tabs = (active) =>
  `<div style="display:flex;gap:26px;border-bottom:1px solid var(--line)">${['İlanları', 'Listeler', 'Değerlendirme'].map((t) => `<div style="padding:13px 0;font-size:14px;font-weight:${t === active ? 600 : 500};color:${t === active ? 'var(--ink)' : 'var(--faint)'};border-bottom:2px solid ${t === active ? 'var(--ink)' : 'transparent'};margin-bottom:-1px;cursor:pointer">${t}</div>`).join('')}</div>`;

const profilMobil = `
<div style="width:390px;height:844px;background:#fff;position:relative;overflow:hidden">
  <div style="position:absolute;top:0;bottom:78px;left:0;right:0;overflow:hidden">
    <div style="padding:26px 18px 0;display:flex;flex-direction:column;align-items:center;text-align:center">
      <div style="width:84px;height:84px;border-radius:50%;background:#e9eaee url('${PH.p4}') center/cover"></div>
      <div class="h" style="font-size:20px;font-weight:700;color:var(--ink);margin-top:14px;display:flex;align-items:center;gap:7px">Mehmet Demir ${verified}</div>
      <div style="font-size:14px;color:var(--sub);margin-top:3px">@mehmetdemir</div>
      <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--faint);margin-top:8px">${icon.pin(14, '#9aa1ab')} Bursa · 2023’ten beri üye</div>
      <div style="display:flex;align-items:center;gap:22px;margin-top:20px">${stat('4', 'İlan')}${vbar}${stat('11', 'Satış')}${vbar}${stat('4.9', 'Puan')}</div>
      <button class="btn-ghost" style="width:100%;height:46px;margin-top:20px">Profili düzenle</button>
    </div>
    <div style="margin-top:22px;padding:0 18px">${tabs('İlanları')}</div>
    <div style="padding:16px 18px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
      ${[LISTINGS[0], LISTINGS[3]].map((l) => listingCard({ ...l, compact: true })).join('')}
    </div>
  </div>
  ${bottomNav('profil')}
</div>`;

const profilWeb = `
${topNav('')}
<div style="max-width:1120px;margin:0 auto;padding:40px 40px 60px">
  <div style="display:flex;align-items:center;gap:24px">
    <div style="width:96px;height:96px;border-radius:50%;background:#e9eaee url('${PH.p4}') center/cover;flex-shrink:0"></div>
    <div style="flex:1">
      <div class="h" style="font-size:26px;font-weight:700;color:var(--ink);display:flex;align-items:center;gap:9px">Mehmet Demir ${verified}</div>
      <div style="font-size:15px;color:var(--sub);margin-top:4px">@mehmetdemir</div>
      <div style="display:flex;align-items:center;gap:6px;font-size:14px;color:var(--faint);margin-top:8px">${icon.pin(15, '#9aa1ab')} Bursa · 2023’ten beri üye</div>
    </div>
    <button class="btn-ghost" style="height:44px;padding:0 20px">Profili düzenle</button>
  </div>
  <div style="display:flex;align-items:center;gap:40px;margin-top:26px">${stat('4', 'İlan')}${vbar}${stat('11', 'Satış')}${vbar}${stat('4.9', 'Puan')}${vbar}${stat('128', 'Takipçi')}</div>
  <div class="divide" style="margin:28px 0 0"></div>
  <div style="margin-top:0">${tabs('İlanları')}</div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:24px">
    ${[LISTINGS[0], LISTINGS[3], LISTINGS[4]].map((l) => listingCard({ ...l, compact: true })).join('')}
  </div>
</div>`;

// ============================== GİRİŞ / KAYIT ==============================
const eye = (c) => vsvg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>', 18, 1.7, c);
const chatIco = (c) => vsvg('<path d="M21 12a8 8 0 0 1-11.4 7.2L4 20l1-4.4A8 8 0 1 1 21 12Z"/>', 22, 1.7, c);
const kebab = `<svg width="18" height="18" viewBox="0 0 24 24" fill="#9aa1ab"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>`;
const googleG = `<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.7 1.1 7.8 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-8 20-20 0-1.3-.1-2.3-.4-3.5Z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7A20 20 0 0 0 6.3 14.7Z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5C9.5 39.6 16.2 44 24 44Z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.9 36 44 30.6 44 24c0-1.3-.1-2.3-.4-3.5Z"/></svg>`;
const appleLogo = (c) => `<svg width="17" height="17" viewBox="0 0 24 24" fill="${c}"><path d="M17.05 12.04c-.03-2.6 2.13-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.9-1.75.03-3.36 1.02-4.26 2.58-1.81 3.14-.46 7.78 1.3 10.32.86 1.24 1.88 2.63 3.21 2.58 1.29-.05 1.78-.83 3.34-.83 1.55 0 2 .83 3.37.81 1.39-.03 2.27-1.26 3.12-2.51.98-1.44 1.39-2.83 1.41-2.9-.03-.01-2.71-1.04-2.74-4.13M14.7 4.5c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44"/></svg>`;
const oauthBtn = (ico, label) => `<button class="btn-ghost" style="width:100%;height:50px;gap:10px">${ico}${label}</button>`;
const authDivider = `<div style="display:flex;align-items:center;gap:14px;margin:18px 0"><span style="flex:1;height:1px;background:var(--line)"></span><span style="font-size:12px;color:var(--faint);font-weight:500">ya da</span><span style="flex:1;height:1px;background:var(--line)"></span></div>`;
const pwBox = `<div style="height:50px;background:var(--soft);border:1px solid var(--line);border-radius:12px;display:flex;align-items:center;padding:0 14px"><span style="flex:1;font-size:17px;letter-spacing:3px;color:var(--ink)">••••••••</span><span style="cursor:pointer">${eye('#9aa1ab')}</span></div>`;
const pwField = `<div style="margin-bottom:18px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span style="font-size:13px;font-weight:600;color:var(--ink)">Şifre</span><span style="font-size:13px;font-weight:600;color:var(--sub);cursor:pointer">Şifremi unuttum</span></div>${pwBox}</div>`;

const girisMobil = `
<div style="width:390px;height:844px;background:#fff;position:relative;overflow:hidden">
  <div style="padding:30px 26px">
    <div class="h" style="font-size:20px;font-weight:700;color:var(--ink)">Pusula</div>
    <div style="margin-top:38px">
      <h1 class="h" style="font-size:26px;font-weight:700;color:var(--ink)">Tekrar hoş geldin</h1>
      <div style="font-size:15px;color:var(--sub);margin-top:6px">Hesabına giriş yap, kaldığın yerden devam et.</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:26px">${oauthBtn(googleG, 'Google ile devam et')}${oauthBtn(appleLogo('#0a0b0d'), 'Apple ile devam et')}</div>
    ${authDivider}
    ${field('E-posta', inputBox('', 'ornek@eposta.com'))}
    ${pwField}
    <button class="btn-dark" style="width:100%;height:52px;margin-top:4px">Giriş yap</button>
  </div>
  <div style="position:absolute;left:0;right:0;bottom:30px;text-align:center;font-size:14px;color:var(--sub)">Hesabın yok mu? <b style="color:var(--ink)">Kayıt ol</b></div>
</div>`;

const girisWeb = `
<div style="display:grid;grid-template-columns:1fr 1fr;height:720px">
  <div style="display:flex;align-items:center;justify-content:center;padding:40px">
    <div style="width:100%;max-width:380px">
      <div class="h" style="font-size:20px;font-weight:700;color:var(--ink)">Pusula</div>
      <h1 class="h" style="font-size:28px;font-weight:700;color:var(--ink);margin-top:40px">Tekrar hoş geldin</h1>
      <div style="font-size:15px;color:var(--sub);margin-top:6px">Hesabına giriş yap.</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:26px">${oauthBtn(googleG, 'Google ile devam et')}${oauthBtn(appleLogo('#0a0b0d'), 'Apple ile devam et')}</div>
      ${authDivider}
      ${field('E-posta', inputBox('', 'ornek@eposta.com'))}
      ${pwField}
      <button class="btn-dark" style="width:100%;height:52px;margin-top:4px">Giriş yap</button>
      <div style="text-align:center;font-size:14px;color:var(--sub);margin-top:26px">Hesabın yok mu? <b style="color:var(--ink)">Kayıt ol</b></div>
    </div>
  </div>
  <div style="position:relative;background:#0a0b0d url('${PH.p1}') center/cover">
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,11,13,.2),rgba(10,11,13,.78))"></div>
    <div style="position:absolute;left:48px;right:48px;bottom:52px;color:#fff">
      <span style="display:inline-flex;align-items:center;gap:6px;background:rgba(21,128,61,.92);color:#fff;font-size:12px;font-weight:700;border-radius:999px;padding:5px 11px">${icon.spark(13, '#fff')} Kelepir 78</span>
      <div class="h" style="font-size:32px;font-weight:600;margin-top:20px;line-height:1.2">Karar verirken<br>kaybolma.</div>
      <div style="font-size:15px;color:rgba(255,255,255,.82);margin-top:14px;line-height:1.5;max-width:380px">Pusula fiyatı, mahalleyi ve riski verilerle ölçer; kelepir olanı objektif bir skorla gösterir.</div>
    </div>
  </div>
</div>`;

// ============================== İLANLARIM (satıcı paneli) ==============================
const statusBadge = (s) => {
  const m = { Yayında: ['#15803d', '#e7f3ec', '#cfe6d8'], Beklemede: ['#b45309', '#fdf3e7', '#f3e1c6'], Satıldı: ['#5b6470', '#f0f1f3', '#e4e6ea'] };
  const [c, bg, ln] = m[s];
  return `<span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:700;color:${c};background:${bg};border:1px solid ${ln};border-radius:999px;padding:3px 9px"><span style="width:6px;height:6px;border-radius:50%;background:${c}"></span>${s}</span>`;
};
const SELLER = [
  { ...LISTINGS[0], status: 'Yayında', views: '842', favs: '37' },
  { ...LISTINGS[3], status: 'Yayında', views: '311', favs: '19' },
  { ...LISTINGS[1], status: 'Beklemede', views: '58', favs: '4' },
  { ...LISTINGS[2], status: 'Satıldı', views: '1.204', favs: '72' },
];
const miniMetric = (l, v, d) => `<div style="border:1px solid var(--line);border-radius:14px;padding:12px 13px"><div class="tnum h" style="font-size:18px;font-weight:700;color:var(--ink)">${v}</div><div style="font-size:11px;color:var(--faint);margin-top:3px">${l}</div>${d ? `<div style="font-size:10px;color:var(--green);font-weight:700;margin-top:2px">${d}</div>` : ''}</div>`;
const metric = (l, v, d) => `<div style="border:1px solid var(--line);border-radius:16px;padding:16px 18px"><div style="font-size:13px;color:var(--sub)">${l}</div><div class="tnum h" style="font-size:25px;font-weight:700;color:var(--ink);margin-top:8px">${v}</div>${d ? `<div style="font-size:12px;color:var(--green);font-weight:600;margin-top:3px">${d}</div>` : ''}</div>`;

const sellerRow = (o) => `
<div style="display:flex;gap:12px;padding:14px 0;border-bottom:1px solid var(--line)">
  <div style="width:74px;height:74px;border-radius:12px;background:#e9eaee url('${o.photo}') center/cover;flex-shrink:0"></div>
  <div style="flex:1;min-width:0">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
      <div class="h" style="font-size:14px;font-weight:600;color:var(--ink);line-height:1.25">${o.title}</div>${statusBadge(o.status)}
    </div>
    <div class="tnum" style="font-size:15px;font-weight:700;color:var(--ink);margin-top:5px">${o.price}</div>
    <div style="display:flex;align-items:center;gap:14px;margin-top:7px;font-size:12px;color:var(--faint);font-weight:500">
      <span style="display:flex;align-items:center;gap:5px">${eye('#9aa1ab')}${o.views}</span>
      <span style="display:flex;align-items:center;gap:5px">${icon.heart(14, '#9aa1ab')}${o.favs}</span>
      ${o.score ? `<span style="display:flex;align-items:center;gap:4px;color:var(--green);font-weight:700">${icon.spark(12, '#15803d')}${o.score}</span>` : ''}
    </div>
  </div>
</div>`;

const ilanlarimMobil = `
<div style="width:390px;height:844px;background:#fff;position:relative;overflow:hidden">
  <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--line)">
    <div style="width:32px;color:#0a0b0d;cursor:pointer">${icon.back(22)}</div>
    <div class="h" style="font-size:16px;font-weight:600;color:var(--ink)">İlanlarım</div>
    <div style="width:32px;display:flex;justify-content:flex-end;color:#0a0b0d;cursor:pointer">${icon.filter(20)}</div>
  </div>
  <div style="position:absolute;top:57px;bottom:0;left:0;right:0;overflow:hidden;padding:16px 18px">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
      ${miniMetric('Görüntülenme', '1.2B', '↑ %18')}${miniMetric('Favori', '132')}${miniMetric('Mesaj', '12')}
    </div>
    <div style="display:flex;gap:8px;margin:16px 0 4px;overflow:hidden">
      <span class="chip on">Tümü</span><span class="chip">Yayında</span><span class="chip">Beklemede</span><span class="chip">Satıldı</span>
    </div>
    ${SELLER.map(sellerRow).join('')}
  </div>
</div>`;

const tableHead = `<div style="display:grid;grid-template-columns:2.4fr 1fr .8fr 1fr .9fr 44px;gap:16px;align-items:center;padding:13px 20px;background:var(--soft);border-bottom:1px solid var(--line);font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--faint)"><div>İlan</div><div>Fiyat</div><div>Kelepir</div><div>Durum</div><div>Görüntülenme</div><div></div></div>`;
const tableRow = (o, last) => `<div style="display:grid;grid-template-columns:2.4fr 1fr .8fr 1fr .9fr 44px;gap:16px;align-items:center;padding:14px 20px;${last ? '' : 'border-bottom:1px solid var(--line)'}">
  <div style="display:flex;align-items:center;gap:12px;min-width:0"><div style="width:46px;height:46px;border-radius:10px;background:#e9eaee url('${o.photo}') center/cover;flex-shrink:0"></div><div class="h" style="font-size:14px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${o.title}</div></div>
  <div class="tnum" style="font-size:14px;font-weight:700;color:var(--ink)">${o.price}</div>
  <div>${o.score ? `<span style="display:inline-flex;align-items:center;gap:4px;color:var(--green);font-weight:700;font-size:13px">${icon.spark(13, '#15803d')}${o.score}</span>` : '<span style="color:var(--faint);font-size:13px">—</span>'}</div>
  <div>${statusBadge(o.status)}</div>
  <div style="display:flex;align-items:center;gap:6px;font-size:13px;color:var(--sub);font-weight:500">${eye('#9aa1ab')}<span class="tnum">${o.views}</span></div>
  <div style="cursor:pointer">${kebab}</div>
</div>`;

const ilanlarimWeb = `
${topNav('')}
<div style="max-width:1120px;margin:0 auto;padding:34px 40px 60px">
  <div style="display:flex;align-items:flex-end;justify-content:space-between">
    <div>${eyebrow('Satıcı paneli')}<h1 class="h" style="font-size:28px;font-weight:600;color:var(--ink);margin-top:10px">İlanlarım</h1></div>
    <button class="btn-dark" style="height:44px;padding:0 20px">${icon.plus(17, '#fff')} İlan ver</button>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:24px">
    ${metric('Aktif ilan', '4')}${metric('Görüntülenme', '12.480', '↑ %18 bu hafta')}${metric('Favori', '132')}${metric('Mesaj', '12', '3 yeni')}
  </div>
  <div style="margin-top:28px;border:1px solid var(--line);border-radius:18px;overflow:hidden">
    ${tableHead}${SELLER.map((o, i) => tableRow(o, i === SELLER.length - 1)).join('')}
  </div>
</div>`;

// ============================== TANITIM / LANDING ==============================
const heroCard = `
<div style="position:relative;width:420px;margin-left:auto">
  <div style="width:420px">${listingCard(LISTINGS[0])}</div>
  <div style="position:absolute;top:-20px;right:-16px;background:#fff;border:1px solid var(--line);border-radius:16px;padding:13px 16px;box-shadow:0 16px 36px -14px rgba(16,24,40,.32)">
    <div class="eyebrow" style="font-size:9px">Kelepir skoru</div>
    <div style="display:flex;align-items:baseline;gap:9px;margin-top:5px"><span class="score tnum" style="font-size:34px">78</span><span style="font-size:12px;color:var(--green);font-weight:700">%15 altında</span></div>
  </div>
  <div style="position:absolute;bottom:-18px;left:-22px;background:var(--ink);color:#fff;font-size:13px;font-weight:500;padding:11px 15px;border-radius:16px;border-bottom-left-radius:5px;box-shadow:0 16px 36px -14px rgba(16,24,40,.45);display:flex;align-items:center;gap:8px">${icon.spark(15, '#fff')} Sana 3 kelepir buldum</div>
</div>`;
const feat = (ico, t, d) => `<div><div style="width:44px;height:44px;border-radius:12px;background:#fff;border:1px solid var(--line);display:grid;place-items:center">${ico}</div><div class="h" style="font-size:17px;font-weight:600;color:var(--ink);margin-top:14px">${t}</div><div style="font-size:14px;color:var(--sub);line-height:1.55;margin-top:6px">${d}</div></div>`;
const featRow = (ico, t, d) => `<div style="display:flex;gap:14px;align-items:flex-start"><div style="width:44px;height:44px;border-radius:12px;background:var(--soft);border:1px solid var(--line);display:grid;place-items:center;flex-shrink:0">${ico}</div><div><div class="h" style="font-size:16px;font-weight:600;color:var(--ink)">${t}</div><div style="font-size:14px;color:var(--sub);line-height:1.5;margin-top:4px">${d}</div></div></div>`;
const statStrip = (big) => `<div style="display:flex;align-items:center;gap:${big ? 28 : 18}px">${[['4', 'boyut'], ['12+', 'parametre'], ['0–100', 'skor']].map(([v, l], i) => `${i ? '<span style="width:1px;height:28px;background:var(--line)"></span>' : ''}<div><div class="tnum h" style="font-size:${big ? 22 : 19}px;font-weight:700;color:var(--ink)">${v}</div><div style="font-size:12px;color:var(--faint);margin-top:1px">${l}</div></div>`).join('')}</div>`;

const landingNav = `<div style="height:68px;display:flex;align-items:center;justify-content:space-between;padding:0 40px;border-bottom:1px solid var(--line);background:#fff">
  <div class="h" style="font-size:20px;font-weight:700;color:var(--ink)">Pusula</div>
  <div style="display:flex;gap:30px"><span class="navlink">Nasıl çalışır</span><span class="navlink">Özellikler</span><span class="navlink">Fiyatlar</span></div>
  <div style="display:flex;align-items:center;gap:18px"><span class="navlink on">Giriş</span><button class="btn-dark" style="height:40px;padding:0 18px;font-size:14px">Ücretsiz başla</button></div>
</div>`;

const landingWeb = `
${landingNav}
<div style="max-width:1120px;margin:0 auto;padding:72px 40px 64px;display:grid;grid-template-columns:1.05fr 1fr;gap:56px;align-items:center">
  <div>
    ${eyebrow('Türkiye’nin AI pusulası')}
    <h1 class="h" style="font-size:54px;font-weight:700;color:var(--ink);line-height:1.04;margin-top:18px;letter-spacing:-.03em">Karar verirken<br>kaybolma.</h1>
    <p style="font-size:18px;color:var(--sub);line-height:1.55;margin-top:20px;max-width:450px">Pusula; ilan fiyatını mahalle, kalite ve risk verisiyle ölçer. Kelepir olanı objektif bir skorla gösterir, neyi neden gördüğünü sana anlatır.</p>
    <div style="display:flex;gap:12px;margin-top:28px"><button class="btn-dark" style="height:52px;padding:0 26px;font-size:15px">Ücretsiz başla</button><button class="btn-ghost" style="height:52px;padding:0 24px;font-size:15px">Nasıl çalışır?</button></div>
    <div style="margin-top:36px">${statStrip(true)}</div>
  </div>
  <div style="padding:24px 24px 24px 0">${heroCard}</div>
</div>
<div style="border-top:1px solid var(--line);background:#fcfcfd">
  <div style="max-width:1120px;margin:0 auto;padding:52px 40px;display:grid;grid-template-columns:repeat(3,1fr);gap:44px">
    ${feat(icon.spark(22, '#0a0b0d'), 'Açıklanabilir skor', 'Her ilan benzerleriyle kıyaslanır, 0–100 arası bir skor alır. Hangi parametre neden etkiledi görürsün.')}
    ${feat(chatIco('#0a0b0d'), 'AI asistan', 'Skoru insan diliyle açıklar; neyi neden gördüğünü ve pazarlık marjını anlatır.')}
    ${feat(icon.mic(22, '#0a0b0d'), 'Sesli arama', 'Konuşarak ara; Pusula senin için tarar, skoru anlatır.')}
  </div>
</div>`;

const landingMobil = `
<div style="width:390px;background:#fff">
  <div style="display:flex;align-items:center;justify-content:space-between;padding:18px 22px"><div class="h" style="font-size:20px;font-weight:700;color:var(--ink)">Pusula</div><button class="btn-ghost" style="height:38px;padding:0 16px;font-size:14px">Giriş</button></div>
  <div style="padding:22px 22px 0">
    ${eyebrow('Türkiye’nin AI pusulası')}
    <h1 class="h" style="font-size:38px;font-weight:700;color:var(--ink);line-height:1.05;margin-top:14px;letter-spacing:-.03em">Karar verirken kaybolma.</h1>
    <p style="font-size:16px;color:var(--sub);line-height:1.5;margin-top:14px">İlan fiyatını mahalle, kalite ve risk verisiyle ölçer; kelepir olanı objektif bir skorla gösterir.</p>
    <div style="display:flex;flex-direction:column;gap:10px;margin-top:22px"><button class="btn-dark" style="height:52px">Ücretsiz başla</button><button class="btn-ghost" style="height:52px">Nasıl çalışır?</button></div>
  </div>
  <div style="position:relative;padding:40px 22px 12px">
    ${listingCard(LISTINGS[0])}
    <div style="position:absolute;top:22px;right:38px;background:#fff;border:1px solid var(--line);border-radius:14px;padding:11px 14px;box-shadow:0 14px 30px -12px rgba(16,24,40,.3)"><div class="eyebrow" style="font-size:9px">Kelepir</div><div style="display:flex;align-items:baseline;gap:7px;margin-top:3px"><span class="score tnum" style="font-size:28px">78</span><span style="font-size:11px;color:var(--green);font-weight:700">%15↓</span></div></div>
  </div>
  <div style="padding:18px 22px;display:flex;justify-content:center">${statStrip(false)}</div>
  <div style="background:#fcfcfd;border-top:1px solid var(--line);padding:28px 22px 40px;display:flex;flex-direction:column;gap:22px">
    ${featRow(icon.spark(22, '#0a0b0d'), 'Açıklanabilir skor', 'Her ilan benzerleriyle kıyaslanır, açıklanabilir bir skor alır.')}
    ${featRow(chatIco('#0a0b0d'), 'AI asistan', 'Skoru insan diliyle açıklar, neyi neden gördüğünü anlatır.')}
    ${featRow(icon.mic(22, '#0a0b0d'), 'Sesli arama', 'Konuşarak ara; Pusula senin için tarar.')}
  </div>
</div>`;

// ============================== KAYIT / RENDER ==============================
const ALL = [
  { name: 'akis-mobil', html: akisMobil, width: 390, height: 844 },
  { name: 'akis-web', html: akisWeb, width: 1200, height: 980 },
  { name: 'kesfet-mobil', html: kesfetMobil, width: 390, height: 844 },
  { name: 'kesfet-web', html: kesfetWeb, width: 1200, height: 960 },
  { name: 'asistan-mobil', html: asistanMobil, width: 390, height: 844 },
  { name: 'asistan-web', html: asistanWeb, width: 1200, height: 860 },
  { name: 'sesli-mobil', html: sesliMobil, width: 390, height: 844 },
  { name: 'sesli-web', html: sesliWeb, width: 1200, height: 920 },
  { name: 'ilanver-mobil', html: ilanVerMobil, width: 390, height: 844 },
  { name: 'ilanver-web', html: ilanVerWeb, width: 1200, height: 940 },
  { name: 'listeler-mobil', html: listelerMobil, width: 390, height: 844 },
  { name: 'listeler-web', html: listelerWeb, width: 1200, height: 600 },
  { name: 'profil-mobil', html: profilMobil, width: 390, height: 844 },
  { name: 'profil-web', html: profilWeb, width: 1200, height: 760 },
  { name: 'giris-mobil', html: girisMobil, width: 390, height: 844 },
  { name: 'giris-web', html: girisWeb, width: 1200, height: 720 },
  { name: 'ilanlarim-mobil', html: ilanlarimMobil, width: 390, height: 844 },
  { name: 'ilanlarim-web', html: ilanlarimWeb, width: 1200, height: 800 },
  { name: 'landing-mobil', html: landingMobil, width: 390, height: 844 },
  { name: 'landing-web', html: landingWeb, width: 1200, height: 980 },
];

const args = process.argv.slice(2);
const screens = args.length ? ALL.filter((s) => args.some((a) => s.name.startsWith(a))) : ALL;
await render(screens);
