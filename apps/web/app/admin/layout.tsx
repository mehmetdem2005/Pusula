'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactElement, type ReactNode } from 'react';
import './admin.css';
import { adminApi } from '../../lib/admin';
import { Spinner } from './ui';

const NAV: { href: string; label: string; icon: ReactNode }[] = [
  { href: '/admin', label: 'Genel Bakış', icon: icon('M4 11l8-7 8 7M6 10v9h12v-9') },
  {
    href: '/admin/kullanicilar',
    label: 'Kullanıcılar',
    icon: icon('M16 19c0-2.8-2-4-4-4s-4 1.2-4 4M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'),
  },
  { href: '/admin/ilanlar', label: 'İlanlar', icon: icon('M4 5h16v14H4zM4 9h16M9 9v10') },
  { href: '/admin/raporlar', label: 'Raporlar', icon: icon('M5 3v18M5 4h11l-2 4 2 4H5') },
  {
    href: '/admin/adminler',
    label: 'Adminler',
    icon: icon('M12 3l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V6l7-3ZM9.5 12l1.8 1.8L15 10'),
  },
  { href: '/admin/saglayicilar', label: 'Sağlayıcılar', icon: icon('M4 7h16M4 12h16M4 17h16') },
];

function icon(d: string): ReactNode {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

type Gate = 'loading' | 'ok' | 'denied' | 'error';

export default function AdminLayout({ children }: { children: ReactNode }): ReactElement {
  const pathname = usePathname();
  const [gate, setGate] = useState<Gate>('loading');
  const [superAdmin, setSuperAdmin] = useState(false);

  useEffect(() => {
    let alive = true;
    adminApi
      .me()
      .then((m) => {
        if (!alive) return;
        setSuperAdmin(m.superAdmin);
        setGate(m.admin ? 'ok' : 'denied');
      })
      .catch(() => alive && setGate('error'));
    return () => {
      alive = false;
    };
  }, []);

  if (gate !== 'ok') {
    return (
      <div className="admin-root" style={{ display: 'grid', placeItems: 'center', padding: 24 }}>
        <div className="a-card" style={{ padding: 32, maxWidth: 420, textAlign: 'center' }}>
          {gate === 'loading' && <Spinner label="Yetki kontrol ediliyor…" />}
          {gate === 'denied' && (
            <>
              <h1 style={{ fontSize: 20 }}>Yetkisiz</h1>
              <p style={{ color: 'var(--sub)', fontSize: 14, marginTop: 10 }}>
                Bu alan yalnız yöneticiler içindir.
              </p>
              <Link href="/" className="a-btn" style={{ marginTop: 18, textDecoration: 'none' }}>
                Ana sayfaya dön
              </Link>
            </>
          )}
          {gate === 'error' && (
            <>
              <h1 style={{ fontSize: 20 }}>Giriş gerekli</h1>
              <p style={{ color: 'var(--sub)', fontSize: 14, marginTop: 10 }}>
                Yönetici paneline erişmek için giriş yap.
              </p>
              <Link
                href="/auth/login?next=/admin"
                className="a-btn"
                style={{ marginTop: 18, textDecoration: 'none' }}
              >
                Giriş yap
              </Link>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="admin-root">
      <div className="admin-shell">
        <aside className="admin-side">
          <div className="admin-brand">
            Pusula
            <small>Yönetim</small>
          </div>
          {NAV.map((n) => {
            const active =
              n.href === '/admin' ? pathname === '/admin' : pathname.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={`admin-navlink ${active ? 'on' : ''}`}>
                {n.icon}
                {n.label}
              </Link>
            );
          })}
          {superAdmin && (
            <div style={{ marginTop: 'auto', paddingTop: 16 }}>
              <span className="a-badge" style={{ background: 'var(--ink)', color: '#fff' }}>
                Süper admin
              </span>
            </div>
          )}
        </aside>
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
