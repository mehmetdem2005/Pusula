'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'pusula-theme';

/**
 * FOUC önleyici init script — body parse edilir edilmez (React'tan önce) çalışır.
 * localStorage tercihi yoksa prefers-color-scheme'e düşer. layout.tsx <body> içine konur.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.body.classList.add('theme-dark');}catch(e){}})();`;

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggle: () => undefined,
  setTheme: () => undefined,
});

export const useTheme = (): ThemeContextValue => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: ReactNode }): ReactElement {
  const [theme, setThemeState] = useState<Theme>('light');

  // İlk render'da inline script body sınıfını çoktan ayarladı; state'i ona göre eşitle.
  useEffect(() => {
    setThemeState(document.body.classList.contains('theme-dark') ? 'dark' : 'light');
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    document.body.classList.toggle('theme-dark', t === 'dark');
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      /* localStorage yoksa yok say */
    }
  }, []);

  const toggle = useCallback(
    () => setTheme(document.body.classList.contains('theme-dark') ? 'light' : 'dark'),
    [setTheme],
  );

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>{children}</ThemeContext.Provider>
  );
}
