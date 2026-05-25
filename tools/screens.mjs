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

// ============================== KAYIT / RENDER ==============================
const ALL = [
  { name: 'akis-mobil', html: akisMobil, width: 390, height: 844 },
  { name: 'akis-web', html: akisWeb, width: 1200, height: 980 },
  { name: 'kesfet-mobil', html: kesfetMobil, width: 390, height: 844 },
  { name: 'kesfet-web', html: kesfetWeb, width: 1200, height: 960 },
  { name: 'asistan-mobil', html: asistanMobil, width: 390, height: 844 },
  { name: 'asistan-web', html: asistanWeb, width: 1200, height: 860 },
];

const args = process.argv.slice(2);
const screens = args.length ? ALL.filter((s) => args.some((a) => s.name.startsWith(a))) : ALL;
await render(screens);
