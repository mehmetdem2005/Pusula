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
        className="rounded-card border-hairline-strong bg-surface text-navy hover:bg-paper-2 w-full border border-dashed p-4 text-sm font-semibold transition-colors"
      >
        + İlan Yapıştır & Analiz Et
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-card-lg border-hairline bg-surface border p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-ink text-sm font-semibold">İlan Yapıştır</h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-muted hover:text-ink-2 text-xs"
        >
          Kapat
        </button>
      </div>
      <p className="text-ink-3 mb-2 text-xs">
        İlan <strong>metnini</strong> yapıştır (başlık, fiyat, m², konum, oda sayısı...). Herhangi
        bir siteden veya Facebook&apos;tan kopyalayabilirsin — AI alanları çıkarıp skorlar.{' '}
        <span className="text-muted">
          Not: Sadece link yetmez; sahibinden gibi siteler bot koruması nedeniyle sunucudan açılamaz
          — metni kopyala ya da eklentiyi kullan.
        </span>
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="Örn: Kadıköy Caferağa'da 3+1, 110 m², 8 yaşında, doğalgaz kombi, 4.250.000 TL ..."
        className="rounded-card-sm border-hairline-strong bg-paper text-ink focus:border-navy focus:ring-navy w-full border p-3 text-sm focus:outline-none focus:ring-1"
      />
      {error && <p className="text-band-asiri mt-2 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading || !text.trim()}
        className="btn btn-primary mt-3 disabled:opacity-60"
      >
        {loading ? 'Analiz ediliyor…' : 'Analiz Et'}
      </button>
    </form>
  );
}
