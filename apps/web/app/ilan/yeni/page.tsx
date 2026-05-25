'use client';

import { useState, type ReactElement } from 'react';
import { Navbar } from '../../../components/Navbar';
import { authedFetch } from '../../../lib/api';
import { uploadListingMedia, deleteMedia } from '../../../lib/media';

type Kategori = 'konut' | 'arsa' | 'oto';
interface MediaItem {
  id: string;
  previewUrl: string;
  type: 'photo' | 'video';
}

const inputCls =
  'mt-1 w-full rounded-card-sm border border-hairline-strong bg-paper px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy';
const labelCls = 'block text-sm';
const spanCls = 'font-medium text-ink-2';

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
    <main className="bg-paper text-ink min-h-screen">
      <Navbar />
      <div className="shell max-w-2xl py-8 md:py-10">
        <h1 className="text-navy font-serif text-3xl">İlan ekle</h1>
        <p className="text-muted mt-1 text-sm">
          {step === 'form' ? 'Önce ilan bilgilerini gir.' : 'Fotoğraf/video ekle ve yayınla.'}
        </p>

        {error && (
          <div className="rounded-card border-band-asiri bg-surface text-band-asiri mt-4 border p-3 text-sm">
            {error}
          </div>
        )}

        {step === 'form' ? (
          <div className="rounded-card-lg border-hairline bg-surface mt-6 space-y-5 border p-6">
            <div>
              <span className={spanCls}>Kategori</span>
              <div className="mt-2 flex gap-2">
                {KATEGORILER.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKategori(k.id)}
                    className={`rounded-card-sm border px-4 py-2 text-sm font-medium transition-colors ${
                      kategori === k.id
                        ? 'border-navy bg-navy text-cream'
                        : 'border-hairline-strong text-ink-2 hover:bg-paper-2'
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
              <span className="text-muted mt-1 block text-xs">
                İletişim platform dışıdır; alıcılar seni doğrudan arar.
              </span>
            </label>

            <button
              type="button"
              onClick={() => void proceedToMedia()}
              disabled={loading}
              className="btn btn-gold w-full disabled:opacity-60"
            >
              {loading ? 'Kaydediliyor…' : 'İleri: Fotoğraf & video'}
            </button>
          </div>
        ) : (
          <div className="rounded-card-lg border-hairline bg-surface mt-6 space-y-5 border p-6">
            <div>
              <span className={spanCls}>Fotoğraflar / video</span>
              <p className="text-muted mt-1 text-xs">
                Net, gerçek görseller ekle. Yüzler/plakalar/belgeler görünmesin (KVKK).
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {media.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-card-sm border-hairline bg-paper-2 group relative aspect-square overflow-hidden border"
                  >
                    {m.type === 'video' ? (
                      <video src={m.previewUrl} className="h-full w-full object-cover" muted />
                    ) : (
                      <img src={m.previewUrl} alt="" className="h-full w-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => void removeItem(m.id)}
                      className="bg-navy/80 text-cream absolute right-1 top-1 rounded-full px-2 py-0.5 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      Sil
                    </button>
                  </div>
                ))}
                <label className="rounded-card-sm border-hairline-strong text-muted hover:bg-paper-2 flex aspect-square cursor-pointer items-center justify-center border border-dashed text-3xl">
                  +
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/quicktime"
                    multiple
                    className="hidden"
                    onChange={(e) => void onFiles(e)}
                  />
                </label>
              </div>
              {uploading && <p className="text-muted mt-2 text-xs">Yükleniyor…</p>}
            </div>

            <label className="text-ink-2 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={tos}
                onChange={(e) => setTos(e.target.checked)}
                className="mt-1"
              />
              <span>
                Bu medyanın bana ait olduğunu / yayın hakkım olduğunu ve içeriğin doğru olduğunu
                onaylıyorum.
              </span>
            </label>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="btn btn-ghost"
                disabled={loading}
              >
                ← Geri
              </button>
              <button
                type="button"
                onClick={() => void publish()}
                disabled={loading || uploading}
                className="btn btn-gold flex-1 disabled:opacity-60"
              >
                {loading ? 'Yayınlanıyor…' : 'Yayınla'}
              </button>
            </div>
            <p className="text-muted text-center text-xs">
              Taslağın kaydedildi; istersen sonra panelden devam edebilirsin.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
