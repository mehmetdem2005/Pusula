'use client';

import Link from 'next/link';
import { useState, type ReactElement } from 'react';
import { authedFetch } from '../../../lib/api';
import { uploadListingMedia, deleteMedia } from '../../../lib/media';

type Kategori = 'konut' | 'arsa' | 'oto';
interface MediaItem {
  id: string;
  previewUrl: string;
  type: 'photo' | 'video';
}

const inputCls =
  'mt-1.5 w-full rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[15px] text-fg placeholder:text-fg-faint focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand';
const labelCls = 'block';
const spanCls = 'text-sm font-medium text-fg-dim';

const KATEGORILER: { id: Kategori; label: string }[] = [
  { id: 'konut', label: 'Konut' },
  { id: 'arsa', label: 'Arsa' },
  { id: 'oto', label: 'Araç' },
];

export default function YeniIlanPage(): ReactElement {
  const [step, setStep] = useState<'form' | 'media'>('form');
  const [kategori, setKategori] = useState<Kategori>('konut');
  const [baslik, setBaslik] = useState('');
  const [fiyat, setFiyat] = useState('');
  const [il, setIl] = useState('');
  const [ilce, setIlce] = useState('');
  const [mahalle, setMahalle] = useState('');
  const [netM2, setNetM2] = useState('');
  const [oda, setOda] = useState('');
  const [yas, setYas] = useState('');
  const [imar, setImar] = useState('');
  const [marka, setMarka] = useState('');
  const [model, setModel] = useState('');
  const [modelYili, setModelYili] = useState('');
  const [km, setKm] = useState('');
  const [aciklama, setAciklama] = useState('');
  const [iletisim, setIletisim] = useState('');

  const [listingId, setListingId] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [tos, setTos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function buildPayload() {
    const ozellikler: Record<string, unknown> = {};
    if (iletisim.trim()) ozellikler.iletisim = iletisim.trim();
    if (kategori === 'arsa' && imar.trim()) ozellikler.imar = imar.trim();
    if (kategori === 'oto') {
      if (marka.trim()) ozellikler.marka = marka.trim();
      if (model.trim()) ozellikler.model = model.trim();
      if (modelYili.trim()) ozellikler.model_yili = Number(modelYili);
      if (km.trim()) ozellikler.km = Number(km);
    }
    const payload: Record<string, unknown> = {
      kategori,
      baslik: baslik.trim(),
      fiyat_tl: Math.round(Number(fiyat)),
      ozellikler,
    };
    if (aciklama.trim()) payload.aciklama = aciklama.trim();
    if (il.trim()) payload.il = il.trim();
    if (ilce.trim()) payload.ilce = ilce.trim();
    if (mahalle.trim()) payload.mahalle = mahalle.trim();
    if (kategori !== 'oto' && netM2.trim()) payload.net_m2 = Math.round(Number(netM2));
    if (kategori === 'konut' && oda.trim()) payload.oda_sayisi = oda.trim();
    if (kategori === 'konut' && yas.trim()) payload.bina_yasi = Math.round(Number(yas));
    return payload;
  }

  async function proceedToMedia() {
    setError(null);
    if (baslik.trim().length < 5) {
      setError('Başlık en az 5 karakter olmalı.');
      return;
    }
    const f = Math.round(Number(fiyat));
    if (!Number.isFinite(f) || f <= 0) {
      setError('Geçerli bir fiyat girin.');
      return;
    }
    setLoading(true);
    try {
      const payload = buildPayload();
      if (listingId) {
        const { kategori: _k, ...patch } = payload;
        await authedFetch(`/v1/ilanlar/${listingId}`, {
          method: 'PATCH',
          body: JSON.stringify(patch),
        });
      } else {
        const resp = await authedFetch<{ id: string }>('/v1/ilanlar', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setListingId(resp.id);
      }
      setStep('media');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length || !listingId) return;
    setUploading(true);
    setError(null);
    for (const file of files) {
      const type: 'photo' | 'video' = file.type.startsWith('video/') ? 'video' : 'photo';
      try {
        const id = await uploadListingMedia(file, listingId, type);
        setMedia((m) => [...m, { id, previewUrl: URL.createObjectURL(file), type }]);
      } catch (err) {
        setError((err as Error).message);
      }
    }
    setUploading(false);
  }

  async function removeItem(id: string) {
    try {
      await deleteMedia(id);
      setMedia((m) => m.filter((x) => x.id !== id));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function publish() {
    setError(null);
    if (media.length < 1) {
      setError('En az bir fotoğraf veya video ekleyin.');
      return;
    }
    if (!tos) {
      setError('Yayınlamak için telif/kullanım beyanını onaylayın.');
      return;
    }
    setLoading(true);
    try {
      await authedFetch(`/v1/ilanlar/${listingId}/publish`, {
        method: 'POST',
        body: JSON.stringify({ tos_attested: true }),
      });
      window.location.href = `/ilan/${listingId}`;
    } catch (e) {
      setError((e as Error).message);
      setLoading(false);
    }
  }

  return (
    <main className="bg-night font-body text-fg min-h-[100dvh]">
      {/* Üst bar */}
      <header className="glass border-line sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3">
        {step === 'media' ? (
          <button
            type="button"
            onClick={() => setStep('form')}
            className="press text-fg flex h-9 w-9 items-center justify-center rounded-full bg-white/5"
            aria-label="Geri"
          >
            <Arrow dir="left" />
          </button>
        ) : (
          <Link
            href="/kesfet"
            className="press text-fg flex h-9 w-9 items-center justify-center rounded-full bg-white/5"
            aria-label="Kapat"
          >
            <Close />
          </Link>
        )}
        <span className="font-semibold">{step === 'form' ? 'Yeni ilan' : 'Medya & yayınla'}</span>
        <div className="flex gap-1.5" aria-hidden>
          <Dot active={step === 'form'} />
          <Dot active={step === 'media'} />
        </div>
      </header>

      <div className="mx-auto w-full max-w-xl px-4 py-5 pb-28">
        {error && (
          <div className="border-danger bg-panel text-danger mb-4 rounded-xl border p-3 text-sm">
            {error}
          </div>
        )}

        {step === 'form' ? (
          <div className="space-y-5">
            <div>
              <span className={spanCls}>Kategori</span>
              <div className="mt-2 flex gap-2">
                {KATEGORILER.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKategori(k.id)}
                    className={`press rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                      kategori === k.id
                        ? 'bg-fg text-night'
                        : 'border-line bg-panel text-fg-dim hover:text-fg border'
                    }`}
                  >
                    {k.label}
                  </button>
                ))}
              </div>
            </div>

            <label className={labelCls}>
              <span className={spanCls}>Başlık</span>
              <input
                className={inputCls}
                value={baslik}
                onChange={(e) => setBaslik(e.target.value)}
                placeholder="Örn: Deniz manzaralı 3+1, Kadıköy"
              />
            </label>

            <label className={labelCls}>
              <span className={spanCls}>Fiyat (₺)</span>
              <input
                className={inputCls}
                inputMode="numeric"
                value={fiyat}
                onChange={(e) => setFiyat(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="4250000"
              />
            </label>

            <div className="grid grid-cols-3 gap-3">
              <label className={labelCls}>
                <span className={spanCls}>İl</span>
                <input className={inputCls} value={il} onChange={(e) => setIl(e.target.value)} />
              </label>
              <label className={labelCls}>
                <span className={spanCls}>İlçe</span>
                <input
                  className={inputCls}
                  value={ilce}
                  onChange={(e) => setIlce(e.target.value)}
                />
              </label>
              <label className={labelCls}>
                <span className={spanCls}>Mahalle</span>
                <input
                  className={inputCls}
                  value={mahalle}
                  onChange={(e) => setMahalle(e.target.value)}
                />
              </label>
            </div>

            {kategori === 'konut' && (
              <div className="grid grid-cols-3 gap-3">
                <label className={labelCls}>
                  <span className={spanCls}>Net m²</span>
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    value={netM2}
                    onChange={(e) => setNetM2(e.target.value.replace(/[^\d]/g, ''))}
                  />
                </label>
                <label className={labelCls}>
                  <span className={spanCls}>Oda</span>
                  <input
                    className={inputCls}
                    value={oda}
                    onChange={(e) => setOda(e.target.value)}
                    placeholder="3+1"
                  />
                </label>
                <label className={labelCls}>
                  <span className={spanCls}>Bina yaşı</span>
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    value={yas}
                    onChange={(e) => setYas(e.target.value.replace(/[^\d]/g, ''))}
                  />
                </label>
              </div>
            )}

            {kategori === 'arsa' && (
              <div className="grid grid-cols-2 gap-3">
                <label className={labelCls}>
                  <span className={spanCls}>m²</span>
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    value={netM2}
                    onChange={(e) => setNetM2(e.target.value.replace(/[^\d]/g, ''))}
                  />
                </label>
                <label className={labelCls}>
                  <span className={spanCls}>İmar durumu</span>
                  <input
                    className={inputCls}
                    value={imar}
                    onChange={(e) => setImar(e.target.value)}
                    placeholder="konut / ticari …"
                  />
                </label>
              </div>
            )}

            {kategori === 'oto' && (
              <div className="grid grid-cols-2 gap-3">
                <label className={labelCls}>
                  <span className={spanCls}>Marka</span>
                  <input
                    className={inputCls}
                    value={marka}
                    onChange={(e) => setMarka(e.target.value)}
                  />
                </label>
                <label className={labelCls}>
                  <span className={spanCls}>Model</span>
                  <input
                    className={inputCls}
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                </label>
                <label className={labelCls}>
                  <span className={spanCls}>Model yılı</span>
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    value={modelYili}
                    onChange={(e) => setModelYili(e.target.value.replace(/[^\d]/g, ''))}
                  />
                </label>
                <label className={labelCls}>
                  <span className={spanCls}>KM</span>
                  <input
                    className={inputCls}
                    inputMode="numeric"
                    value={km}
                    onChange={(e) => setKm(e.target.value.replace(/[^\d]/g, ''))}
                  />
                </label>
              </div>
            )}

            <label className={labelCls}>
              <span className={spanCls}>Açıklama</span>
              <textarea
                className={inputCls}
                rows={4}
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
              />
            </label>

            <label className={labelCls}>
              <span className={spanCls}>İletişim (telefon / WhatsApp)</span>
              <input
                className={inputCls}
                value={iletisim}
                onChange={(e) => setIletisim(e.target.value)}
                placeholder="+90 5xx …"
              />
              <span className="text-fg-faint mt-1.5 block text-xs">
                İletişim platform dışıdır; alıcılar seni doğrudan arar.
              </span>
            </label>

            <button
              type="button"
              onClick={() => void proceedToMedia()}
              disabled={loading}
              className="press bg-brand w-full rounded-xl py-3 font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Kaydediliyor…' : 'İleri · Fotoğraf & video'}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <span className={spanCls}>Fotoğraflar / video</span>
              <p className="text-fg-faint mt-1 text-xs">
                Net, gerçek görseller ekle. Yüzler/plakalar/belgeler görünmesin (KVKK).
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2.5">
                {media.map((m) => (
                  <div
                    key={m.id}
                    className="border-line bg-panel group relative aspect-square overflow-hidden rounded-xl border"
                  >
                    {m.type === 'video' ? (
                      <video src={m.previewUrl} className="h-full w-full object-cover" muted />
                    ) : (
                      <img src={m.previewUrl} alt="" className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => void removeItem(m.id)}
                      className="press absolute right-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white backdrop-blur-sm"
                    >
                      Sil
                    </button>
                  </div>
                ))}
                <label className="press border-line bg-panel text-fg-faint hover:text-fg flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed">
                  <Plus />
                  <span className="text-[11px]">Ekle</span>
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/quicktime"
                    multiple
                    className="hidden"
                    onChange={(e) => void onFiles(e)}
                  />
                </label>
              </div>
              {uploading && <p className="text-fg-dim mt-2 text-xs">Yükleniyor…</p>}
            </div>

            {/* AI sanal tur — Faz 3 (yakında) */}
            <div className="border-line bg-panel rounded-xl border p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-fg text-sm font-medium">AI sanal tur videosu</span>
                <span className="text-fg-dim rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                  yakında
                </span>
              </div>
              <p className="text-fg-faint mt-1 text-xs">
                Fotoğraflarından otomatik kısa gezinti videosu üret (temsilî). Çok yakında.
              </p>
            </div>

            <label className="text-fg-dim flex items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={tos}
                onChange={(e) => setTos(e.target.checked)}
                className="accent-brand mt-0.5"
              />
              <span>
                Bu medyanın bana ait olduğunu / yayın hakkım olduğunu ve içeriğin doğru olduğunu
                onaylıyorum.
              </span>
            </label>

            <button
              type="button"
              onClick={() => void publish()}
              disabled={loading || uploading}
              className="press bg-brand w-full rounded-xl py-3 font-semibold text-white disabled:opacity-50"
            >
              {loading ? 'Yayınlanıyor…' : 'Yayınla'}
            </button>
            <p className="text-fg-faint text-center text-xs">
              Taslağın kaydedildi; istersen sonra devam edebilirsin.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function Dot({ active }: { active: boolean }): ReactElement {
  return <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-brand' : 'bg-white/20'}`} />;
}
function Arrow({ dir }: { dir: 'left' }): ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {dir === 'left' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
}
function Close(): ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
function Plus(): ReactElement {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
