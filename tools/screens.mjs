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
    <div style="font-size:13px;color:#3f7a55;padding-bottom:4px;line-height:1.4">Mahalle medyanının <b>%12 altında</b> —<br>bu fiyatla daha hızlı satılır.</div>
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
];

const args = process.argv.slice(2);
const screens = args.length ? ALL.filter((s) => args.some((a) => s.name.startsWith(a))) : ALL;
await render(screens);
