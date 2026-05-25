'use client';

import { useEffect, useRef, useState, type ReactElement } from 'react';

interface Props {
  count: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

/** Görünüme girince 0'dan hedefe tek seferlik sayan rakam (tasarımdaki data-count davranışı). */
export function StatCounter({
  count,
  prefix = '',
  suffix = '',
  decimals = 0,
}: Props): ReactElement {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) {
      setValue(count);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e?.isIntersecting) return;
        io.unobserve(el);
        const dur = 1200;
        const start = performance.now();
        const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
        const step = (now: number) => {
          const t = Math.min(1, (now - start) / dur);
          setValue(count * easeOut(t));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [count]);

  const text =
    decimals === 0
      ? Math.round(value).toLocaleString('tr-TR')
      : value.toFixed(decimals).replace('.', ',');

  return (
    <span ref={ref} className="n">
      {prefix}
      {text}
      {suffix}
    </span>
  );
}
