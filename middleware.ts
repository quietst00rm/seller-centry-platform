import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Production domains - hardcoded for reliability
const PRODUCTION_DOMAINS = [
  'sellercentry.com',
  'seller-centry-platform.vercel.app',
];

function extractSubdomain(request: NextRequest): string | null {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0].toLowerCase();

  // Local development: check query param first (localhost:3000?tenant=alwayz-on-sale)
  const searchParams = request.nextUrl.searchParams;
  const tenantParam = searchParams.get('tenant');
  if (tenantParam) {
    return tenantParam;
  }

  // Local development: subdomain style (alwayz-on-sale.localhost:3000)
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    if (hostname.includes('.localhost')) {
      return hostname.split('.')[0];
    }
    return null;
  }

  // Check each production domain
  for (const domain of PRODUCTION_DOMAINS) {
    if (hostname.endsWith(`.${domain}`)) {
      const subdomain = hostname.replace(`.${domain}`, '');
      // Make sure it's not www or empty
      if (subdomain && subdomain !== 'www') {
        return subdomain;
      }
    }
  }

  // Handle preview deployment URLs (tenant---branch-name.vercel.app)
  if (hostname.includes('---') && hostname.endsWith('.vercel.app')) {
    const parts = hostname.split('---');
    return parts.length > 0 ? parts[0] : null;
  }

  // No subdomain detected (root domain or www)
  return null;
}

function isWwwSubdomain(request: NextRequest): boolean {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0].toLowerCase();

  for (const domain of PRODUCTION_DOMAINS) {
    if (hostname === `www.${domain}`) {
      return true;
    }
  }
  return false;
}

function getRootDomain(request: NextRequest): string {
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0].toLowerCase();

  for (const domain of PRODUCTION_DOMAINS) {
    if (hostname.endsWith(domain)) {
      return domain;
    }
  }
  return hostname;
}

// Routes that don't require authentication
const publicRoutes = ['/login', '/auth/callback', '/forgot-password'];

// Routes that are API routes (handled separately)
const isApiRoute = (pathname: string) => pathname.startsWith('/api');

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0].toLowerCase();

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Redirect www to root domain
  if (isWwwSubdomain(request)) {
    const rootDomain = getRootDomain(request);
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const redirectUrl = `${protocol}://${rootDomain}${pathname}`;
    return NextResponse.redirect(redirectUrl, { status: 301 });
  }

  // Extract subdomain
  const subdomain = extractSubdomain(request);

  // Debug logging (will show in Vercel function logs)
  console.log(`[Middleware] Host: ${hostname}, Subdomain: ${subdomain}, Path: ${pathname}`);

  // Update Supabase session
  const { supabaseResponse, user } = await updateSession(request);

  // Store subdomain in headers for use in server components
  if (subdomain) {
    supabaseResponse.headers.set('x-subdomain', subdomain);
  }

  // Handle subdomain routes
  if (subdomain) {
    // Check if it's a public route
    const isPublicRoute = publicRoutes.some((route) =>
      pathname.startsWith(route)
    );

    // Allow API routes to handle their own auth
    if (isApiRoute(pathname)) {
      return supabaseResponse;
    }

    // If not authenticated and not on a public route, redirect to login
    if (!user && !isPublicRoute) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // If authenticated and on login page, redirect to dashboard
    if (user && pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Rewrite ALL subdomain requests to the subdomain route
    // This handles /, /dashboard, /settings, etc.
    if (!pathname.startsWith('/s/')) {
      const rewriteUrl = new URL(`/s/${subdomain}${pathname}`, request.url);
      console.log(`[Middleware] Rewriting to: ${rewriteUrl.pathname}`);
      return NextResponse.rewrite(rewriteUrl, {
        headers: supabaseResponse.headers,
      });
    }
  }

  // On root domain without subdomain (main site - landing page)
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /_next (Next.js internals)
     * 2. Static files (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
