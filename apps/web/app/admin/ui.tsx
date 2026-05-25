'use client';

import type { CSSProperties, ReactNode } from 'react';

export function Spinner({ label }: { label?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        color: 'var(--faint)',
        fontSize: 14,
        padding: '40px 0',
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          border: '2px solid var(--line-2)',
          borderTopColor: 'var(--ink)',
          borderRadius: '50%',
          display: 'inline-block',
          animation: 'aspin 0.7s linear infinite',
        }}
      />
      {label ?? 'Yükleniyor…'}
      <style>{'@keyframes aspin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--red-bg)',
        border: '1px solid #f1c8c8',
        color: 'var(--red)',
        borderRadius: 12,
        padding: '12px 14px',
        fontSize: 14,
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        marginBottom: 24,
      }}
    >
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 style={{ fontSize: 28, marginTop: 8 }}>{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}) {
  return (
    <div className="a-card" style={{ padding: '18px 20px' }}>
      <div style={{ fontSize: 13, color: 'var(--sub)' }}>{label}</div>
      <div className="tnum" style={{ fontSize: 30, fontWeight: 700, marginTop: 8 }}>
        {value}
      </div>
      {sub != null && (
        <div style={{ fontSize: 12, color: 'var(--faint)', marginTop: 4 }}>{sub}</div>
      )}
    </div>
  );
}

type Tone = 'green' | 'amber' | 'red' | 'gray' | 'ink';
const TONE: Record<Tone, CSSProperties> = {
  green: { background: 'var(--green-bg)', borderColor: 'var(--green-line)', color: 'var(--green)' },
  amber: { background: 'var(--amber-bg)', borderColor: '#f3e1c6', color: 'var(--amber)' },
  red: { background: 'var(--red-bg)', borderColor: '#f1c8c8', color: 'var(--red)' },
  gray: { background: 'var(--soft)', borderColor: 'var(--line)', color: 'var(--sub)' },
  ink: { background: 'var(--ink)', borderColor: 'var(--ink)', color: '#fff' },
};

export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className="a-badge" style={TONE[tone]}>
      {children}
    </span>
  );
}

const LISTING: Record<string, [Tone, string]> = {
  published: ['green', 'Yayında'],
  removed: ['red', 'Kaldırıldı'],
  paused: ['amber', 'Durduruldu'],
  draft: ['gray', 'Taslak'],
  processing: ['gray', 'İşleniyor'],
  rejected: ['red', 'Reddedildi'],
};
export function ListingStatus({ status }: { status: string }) {
  const [tone, label] = LISTING[status] ?? (['gray', status] as [Tone, string]);
  return <Badge tone={tone}>{label}</Badge>;
}

const ROLE: Record<string, [Tone, string]> = {
  admin: ['ink', 'Admin'],
  agent: ['gray', 'Emlakçı'],
  dealer: ['gray', 'Galerici'],
  individual: ['gray', 'Bireysel'],
};
export function RoleBadge({ role }: { role: string }) {
  const [tone, label] = ROLE[role] ?? (['gray', role] as [Tone, string]);
  return <Badge tone={tone}>{label}</Badge>;
}

export const REASON_TR: Record<string, string> = {
  spam: 'Spam',
  fraud: 'Dolandırıcılık',
  copyright: 'Telif',
  illegal: 'Yasa dışı',
  personal_data: 'Kişisel veri',
  other: 'Diğer',
};

export function fmtPrice(n: number): string {
  return `${Number(n || 0).toLocaleString('tr-TR')} ₺`;
}
export function fmtDate(s: string | null): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}
