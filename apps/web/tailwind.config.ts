import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

/**
 * Pusula tasarım sistemi — renkler CSS değişkenlerine bağlıdır (globals.css). Karanlık mod
 * `body.theme-dark` altında aynı değişkenleri ezdiği için renk utility'leri otomatik döner.
 * Renkler `extend` ile eklenir (Tailwind varsayılanları — slate/white/red — korunur).
 */
const config: Config = {
  darkMode: ['selector', 'body.theme-dark'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: 'var(--navy)',
          deep: 'var(--navy-deep)',
          soft: 'var(--navy-soft)',
        },
        gold: {
          DEFAULT: 'var(--gold)',
          hi: 'var(--gold-hi)',
          deep: 'var(--gold-deep)',
        },
        cream: {
          DEFAULT: 'var(--cream)',
          2: 'var(--cream-2)',
        },
        paper: {
          DEFAULT: 'var(--paper)',
          2: 'var(--paper-2)',
        },
        surface: 'var(--surface)',
        ink: {
          DEFAULT: 'var(--ink)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)',
        },
        muted: 'var(--muted)',
        hairline: {
          DEFAULT: 'var(--hairline)',
          strong: 'var(--hairline-strong)',
        },
        // Skor bandları (etiket renkleri)
        band: {
          kacirilmaz: 'var(--kacirilmaz)',
          kelepir: 'var(--kelepir)',
          'iyi-fiyat': 'var(--iyi-fiyat)',
          piyasa: 'var(--piyasa)',
          pahali: 'var(--pahali)',
          asiri: 'var(--asiri)',
        },
        // 8 pilar
        pillar: {
          fiyat: 'var(--p-fiyat)',
          kalite: 'var(--p-kalite)',
          konum: 'var(--p-konum)',
          risk: 'var(--p-risk)',
          vision: 'var(--p-vision)',
          nlp: 'var(--p-nlp)',
          pazar: 'var(--p-pazar)',
          finansal: 'var(--p-finansal)',
        },
        // ── Reels rebuild — nötr/monokrom (Instagram dili) ──
        brand: 'var(--c-brand)', // IG mavisi — yalnız birincil CTA/odak
        like: 'var(--c-like)', // beğeni kırmızısı
        night: { DEFAULT: 'var(--c-bg)', soft: 'var(--c-bg-soft)' },
        panel: { DEFAULT: 'var(--c-panel)', soft: 'var(--c-panel-soft)' },
        line: 'var(--c-line)',
        danger: 'var(--c-danger)',
        fg: { DEFAULT: 'var(--c-fg)', dim: 'var(--c-fg-dim)', faint: 'var(--c-fg-faint)' },
      },
      fontFamily: {
        sans: ['var(--font-manrope)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['var(--font-cormorant)', 'Georgia', 'serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'monospace'],
        display: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Tasarım radius/shadow'ları (varsayılan ölçekle çakışmaması için ayrı adlar).
      borderRadius: {
        'card-sm': 'var(--radius-sm)',
        card: 'var(--radius)',
        'card-lg': 'var(--radius-lg)',
        'card-xl': 'var(--radius-xl)',
      },
      boxShadow: {
        'card-sm': 'var(--shadow-sm)',
        card: 'var(--shadow)',
        'card-lg': 'var(--shadow-lg)',
      },
      maxWidth: {
        shell: 'var(--maxw)',
      },
    },
  },
  plugins: [typography],
};

export default config;
