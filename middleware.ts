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

// Routes that don't require authentication AND should not be rewritten to /s/subdomain
// These routes exist at the app root level, not under /s/[subdomain]
const publicRoutes = ['/login', '/auth/callback', '/forgot-password'];

// Routes that are API routes (handled separately)
const isApiRoute = (pathname: string) => pathname.startsWith('/api');

// Check if a path is a public/shared route that should NOT be rewritten
const isPublicRoute = (pathname: string) =>
  publicRoutes.some((route) => pathname.startsWith(route));

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
    // Allow API routes to handle their own auth
    if (isApiRoute(pathname)) {
      return supabaseResponse;
    }

    // Public routes (login, auth callback, etc.) should NOT be rewritten
    // They exist at the app root level and are shared across all subdomains
    if (isPublicRoute(pathname)) {
      // If authenticated and on login page, redirect to dashboard (root of subdomain)
      if (user && pathname === '/login') {
        return NextResponse.redirect(new URL('/', request.url));
      }
      // Otherwise, let the request through to the actual route (e.g., /login)
      return supabaseResponse;
    }

    // For protected routes: if not authenticated, redirect to login
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      console.log(`[Middleware] Not authenticated, redirecting to: ${loginUrl.pathname}`);
      return NextResponse.redirect(loginUrl);
    }

    // User is authenticated and accessing a protected route
    // Rewrite to the subdomain-specific route (e.g., / -> /s/alwayz-on-sale)
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
