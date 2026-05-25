'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import {
  analyzeList,
  getListDetail,
  removeItem,
  type ListDetail,
  type ListItem,
} from '../../../lib/lists';
import { scoreBand, TRY } from '../../../lib/score-ui';
import { BottomNav } from '../../../components/shell/BottomNav';

const ETIKET_COLOR: Record<string, string> = {
  kacirilmaz: 'var(--kacirilmaz)',
  kelepir: 'var(--kelepir)',
  iyi_fiyat: 'var(--iyi-fiyat)',
  piyasa: 'var(--piyasa)',
  pahali: 'var(--pahali)',
  asiri_pahali: 'var(--asiri)',
};
const ODA_OPTS = ['1+0', '1+1', '2+1', '3+1', '4+1', '5+1'];
const BAND_OPTS: { key: string; label: string }[] = [
  { key: 'kacirilmaz', label: 'Kaçırılmaz' },
  { key: 'kelepir', label: 'Kelepir' },
  { key: 'iyi_fiyat', label: 'İyi Fiyat' },
  { key: 'piyasa', label: 'Piyasa' },
];
const SORT_OPTS: { key: string; label: string }[] = [
  { key: 'skor_desc', label: 'Kelepir → az' },
  { key: 'skor_asc', label: 'Az → kelepir' },
  { key: 'fiyat_asc', label: 'Fiyat ↑' },
  { key: 'fiyat_desc', label: 'Fiyat ↓' },
  { key: 'm2_desc', label: 'm² ↓' },
  { key: 'yeni', label: 'Yeni eklenen' },
];

interface Filters {
  ilce: string;
  fiyatMin: string;
  fiyatMax: string;
  m2Min: string;
  m2Max: string;
  oda: string[];
  band: string[];
  sort: string;
}
const EMPTY: Filters = {
  ilce: '',
  fiyatMin: '',
  fiyatMax: '',
  m2Min: '',
  m2Max: '',
  oda: [],
  band: [],
  sort: 'skor_desc',
};

function buildQs(f: Filters): string {
  const p = new URLSearchParams();
  if (f.ilce.trim()) p.set('ilce', f.ilce.trim());
  if (f.fiyatMin) p.set('fiyatMin', f.fiyatMin);
  if (f.fiyatMax) p.set('fiyatMax', f.fiyatMax);
  if (f.m2Min) p.set('m2Min', f.m2Min);
  if (f.m2Max) p.set('m2Max', f.m2Max);
  if (f.oda.length) p.set('oda', f.oda.join(','));
  if (f.band.length) p.set('band', f.band.join(','));
  if (f.sort && f.sort !== 'skor_desc') p.set('sort', f.sort);
  return p.toString();
}

export default function ListeDetayPage(): ReactElement {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : (params.id?.[0] ?? '');

  const [detail, setDetail] = useState<ListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [showFilters, setShowFilters] = useState(false);
  const [tab, setTab] = useState<'items' | 'ai'>('items');

  const [ranking, setRanking] = useState<ListItem[] | null>(null);
  const [commentary, setCommentary] = useState('');
  const [analyzing, setAnalyzing] = useState(false);

  const qs = useMemo(() => buildQs(filters), [filters]);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    getListDetail(id, qs)
      .then((d) => {
        setDetail(d);
        setError(null);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [id, qs]);

  useEffect(() => load(), [load]);

  async function runAnalyze(): Promise<void> {
    if (analyzing) return;
    setAnalyzing(true);
    setTab('ai');
    try {
      const r = await analyzeList(id, qs);
      setRanking(r.ranking);
      setCommentary(r.commentary);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAnalyzing(false);
    }
  }

  async function drop(ilanId: string): Promise<void> {
    try {
      await removeItem(id, ilanId);
      setDetail((d) => (d ? { ...d, items: d.items.filter((i) => i.id !== ilanId) } : d));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function toggleArr(key: 'oda' | 'band', val: string): void {
    setFilters((f) => {
      const arr = f[key];
      return { ...f, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] };
    });
  }

  const activeCount =
    (filters.ilce ? 1 : 0) +
    (filters.fiyatMin || filters.fiyatMax ? 1 : 0) +
    (filters.m2Min || filters.m2Max ? 1 : 0) +
    filters.oda.length +
    filters.band.length;

  const items = detail?.items ?? [];
  const shown = tab === 'ai' && ranking ? ranking : items;

  return (
    <main className="bg-night font-body text-fg min-h-[100dvh]">
      <header className="glass border-line sticky top-0 z-30 border-b">
        <div className="flex items-center justify-between px-2 py-2.5">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Geri"
            className="press text-fg flex h-9 w-9 items-center justify-center rounded-full"
          >
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
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="text-fg truncate px-2 text-sm font-semibold">
            {detail?.name ?? 'Liste'}
          </span>
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            aria-label="Filtrele"
            className="press text-fg relative flex h-9 w-9 items-center justify-center rounded-full"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 5h18M6 12h12M10 19h4" />
            </svg>
            {activeCount > 0 && (
              <span className="bg-brand absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>
        </div>

        {/* Sekme + AI analiz */}
        <div className="flex items-center gap-2 px-3 pb-2.5">
          <div className="bg-panel flex flex-1 rounded-lg p-1 text-sm">
            <button
              type="button"
              onClick={() => setTab('items')}
              className={`flex-1 rounded-md py-1.5 font-semibold transition-colors ${tab === 'items' ? 'bg-panel-soft text-fg' : 'text-fg-dim'}`}
            >
              İlanlar
            </button>
            <button
              type="button"
              onClick={() => setTab('ai')}
              className={`flex-1 rounded-md py-1.5 font-semibold transition-colors ${tab === 'ai' ? 'bg-panel-soft text-fg' : 'text-fg-dim'}`}
            >
              AI Analiz
            </button>
          </div>
          <button
            type="button"
            onClick={() => void runAnalyze()}
            disabled={analyzing || items.length === 0}
            className="press bg-brand rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {analyzing ? 'Analiz…' : 'AI Analiz'}
          </button>
        </div>
      </header>

      {/* Filtre paneli */}
      {showFilters && (
        <div className="border-line bg-night border-b px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="İlçe">
              <input
                value={filters.ilce}
                onChange={(e) => setFilters((f) => ({ ...f, ilce: e.target.value }))}
                className="filter-input"
                placeholder="Tümü"
              />
            </Field>
            <Field label="Sırala">
              <select
                value={filters.sort}
                onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
                className="filter-input"
              >
                {SORT_OPTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Fiyat (TL)">
              <div className="flex gap-2">
                <input
                  value={filters.fiyatMin}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, fiyatMin: e.target.value.replace(/\D/g, '') }))
                  }
                  className="filter-input"
                  placeholder="min"
                  inputMode="numeric"
                />
                <input
                  value={filters.fiyatMax}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, fiyatMax: e.target.value.replace(/\D/g, '') }))
                  }
                  className="filter-input"
                  placeholder="max"
                  inputMode="numeric"
                />
              </div>
            </Field>
            <Field label="m²">
              <div className="flex gap-2">
                <input
                  value={filters.m2Min}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, m2Min: e.target.value.replace(/\D/g, '') }))
                  }
                  className="filter-input"
                  placeholder="min"
                  inputMode="numeric"
                />
                <input
                  value={filters.m2Max}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, m2Max: e.target.value.replace(/\D/g, '') }))
                  }
                  className="filter-input"
                  placeholder="max"
                  inputMode="numeric"
                />
              </div>
            </Field>
          </div>

          <div className="mt-3">
            <span className="text-fg-faint text-xs">Oda</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {ODA_OPTS.map((o) => (
                <Chip key={o} active={filters.oda.includes(o)} onClick={() => toggleArr('oda', o)}>
                  {o}
                </Chip>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <span className="text-fg-faint text-xs">Band</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {BAND_OPTS.map((b) => (
                <Chip
                  key={b.key}
                  active={filters.band.includes(b.key)}
                  onClick={() => toggleArr('band', b.key)}
                >
                  {b.label}
                </Chip>
              ))}
            </div>
          </div>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => setFilters({ ...EMPTY, sort: filters.sort })}
              className="text-fg-dim mt-3 text-xs underline"
            >
              Filtreleri temizle
            </button>
          )}
        </div>
      )}

      <div className="mx-auto w-full max-w-xl px-3 pb-28 pt-3">
        {error && (
          <div className="border-danger text-danger mb-3 rounded-xl border p-3 text-sm">
            {error}
          </div>
        )}

        {tab === 'ai' && commentary && (
          <div className="border-line bg-panel mb-3 rounded-xl border p-4">
            <div className="text-fg-faint mb-1.5 text-xs font-semibold uppercase tracking-wide">
              AI değerlendirmesi
            </div>
            <p className="text-fg-dim whitespace-pre-line text-sm leading-relaxed">{commentary}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-panel h-24 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-display text-fg text-xl font-semibold">
              {activeCount > 0 ? 'Eşleşen ilan yok' : 'Liste boş'}
            </p>
            <p className="text-fg-dim mt-1 text-sm">
              {activeCount > 0 ? 'Filtreleri gevşet.' : 'Akıştan ilan kaydet, burada görünsün.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {shown.map((it, i) => {
              const band = it.skor ? scoreBand(it.skor.etiket) : null;
              const foto = it.foto_urlleri?.[0];
              const loc = [it.ilce, it.mahalle].filter(Boolean).join(' · ');
              return (
                <li key={it.id} className="border-line bg-panel flex gap-3 rounded-xl border p-2.5">
                  <Link href={`/ilan/${it.id}`} className="flex min-w-0 flex-1 gap-3">
                    <span className="from-panel-soft to-night relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br">
                      {foto ? (
                        <img src={foto} alt={it.baslik} className="h-full w-full object-cover" />
                      ) : null}
                      {tab === 'ai' && ranking && (
                        <span className="absolute left-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-[11px] font-bold text-white">
                          {i + 1}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-fg line-clamp-2 text-sm font-medium leading-tight">
                        {it.baslik}
                      </span>
                      {loc && <span className="text-fg-faint mt-0.5 block text-xs">{loc}</span>}
                      <span className="mt-1 flex items-center gap-2">
                        <span className="font-display text-fg text-sm font-bold">
                          {TRY.format(it.fiyat_tl)}
                        </span>
                        {it.net_m2 && <span className="text-fg-faint text-xs">{it.net_m2} m²</span>}
                      </span>
                      <span className="mt-1.5 flex items-center gap-2">
                        {band?.band && (
                          <span
                            className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                            style={{
                              background:
                                ETIKET_COLOR[it.skor?.etiket ?? ''] ?? 'var(--c-panel-soft)',
                            }}
                          >
                            {band.label}
                          </span>
                        )}
                        {it.skor && (
                          <span className="text-fg-dim font-mono text-xs">
                            {Math.round(it.skor.toplam)}
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => void drop(it.id)}
                    aria-label="Listeden çıkar"
                    className="press text-fg-faint hover:text-danger flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-full"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <BottomNav />
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactElement }): ReactElement {
  return (
    <label className="block">
      <span className="text-fg-faint text-xs">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactElement | string;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? 'bg-fg text-night' : 'bg-panel-soft text-fg-dim'
      }`}
    >
      {children}
    </button>
  );
}
