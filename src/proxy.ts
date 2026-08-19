import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isOrganiser = path.startsWith('/organiser');
  const isLogin = path.startsWith('/organiser/login');

  if (isOrganiser && !isLogin && !user) {
    return NextResponse.redirect(new URL('/organiser/login', request.url));
  }

  if (isLogin && user) {
    return NextResponse.redirect(new URL('/organiser', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/organiser/:path*', '/organiser'],
};
