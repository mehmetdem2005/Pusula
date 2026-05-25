import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Edge middleware — Next.js 15 + @supabase/ssr.
 *
 * Sorumluluk:
 *  - Oturumu @supabase/ssr cookie'lerinden okur/yeniler (getUser).
 *  - /dashboard, /settings için auth redirect (oturum yoksa login).
 *  - Request-ID header'ı (downstream log korelasyonu).
 *
 * NOT: Asıl JWT doğrulama backend'de (apps/api/src/auth/jwt.guard.ts). Burada UX redirect.
 */
const PROTECTED_PATHS = ['/dashboard', '/settings', '/admin'];

export async function middleware(req: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          for (const { name, value } of cookiesToSet) {
            req.cookies.set(name, value);
          }
          response = NextResponse.next({ request: req });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set({ name, value, ...options });
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = req.nextUrl;
  if (!user && PROTECTED_PATHS.some((p) => url.pathname.startsWith(p))) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('next', url.pathname);
    return NextResponse.redirect(loginUrl);
  }

  response.headers.set('x-request-id', req.headers.get('x-request-id') ?? crypto.randomUUID());
  return response;
}

export const config = {
  matcher: ['/((?!_next/|favicon.ico|robots.txt|sitemap.xml).*)'],
};
