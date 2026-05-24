'use client';

import { useState, type ReactElement } from 'react';
import { authedFetch } from '../lib/api';

/**
 * "İlan Yapıştır" — ilan metnini (veya metin+URL) yapıştır → /v1/ilanlar/extract (LLM çıkarımı)
 * → skorlanmış ilana git. Sunucu siteye istek atmaz; metin kullanıcıdan gelir (ban-free).
 */
export function PasteIngest(): ReactElement {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const trimmed = text.trim();
      // Sadece link yetmez: sahibinden gibi siteler bot koruması nedeniyle sunucudan açılamaz.
      const sansUrl = trimmed.replace(/https?:\/\/\S+/g, '').trim();
      if (sansUrl.length < 15) {
        setError(
          'Sadece link yapıştırdın. Bot koruması nedeniyle site sunucudan açılamaz — ilan ' +
            'sayfasındaki metni (başlık, fiyat, m², konum) kopyalayıp yapıştır ya da eklentiyi kullan.',
        );
        setLoading(false);
        return;
      }
      const urlMatch = trimmed.match(/https?:\/\/\S+/);
      const body: { raw_text: string; url?: string } = { raw_text: trimmed };
      if (urlMatch) body.url = urlMatch[0];
      const resp = await authedFetch<{ id: string; score_id: string }>('/v1/ilanlar/extract', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      window.location.href = `/ilan/${resp.id}`;
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-6 w-full rounded-lg border border-dashed border-[#0F1F4B]/30 bg-white p-4 text-sm font-semibold text-[#0F1F4B] hover:bg-slate-50"
      >
        + İlan Yapıştır & Analiz Et
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="mb-6 rounded-lg bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold">İlan Yapıştır</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Kapat
        </button>
      </div>
      <p className="mb-2 text-xs text-slate-500">
        İlan <strong>metnini</strong> yapıştır (başlık, fiyat, m², konum, oda sayısı...). Herhangi
        bir siteden veya Facebook&apos;tan kopyalayabilirsin — AI alanları çıkarıp skorlar.{' '}
        <span className="text-slate-400">
          Not: Sadece link yetmez; sahibinden gibi siteler bot koruması nedeniyle sunucudan açılamaz
          — metni kopyala ya da eklentiyi kullan.
        </span>
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="Örn: Kadıköy Caferağa'da 3+1, 110 m², 8 yaşında, doğalgaz kombi, 4.250.000 TL ..."
        className="w-full rounded-md border border-slate-300 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F1F4B]"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !text.trim()}
        className="mt-3 rounded-md bg-[#0F1F4B] px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {loading ? 'Analiz ediliyor…' : 'Analiz Et'}
      </button>
    </form>
  );
}
