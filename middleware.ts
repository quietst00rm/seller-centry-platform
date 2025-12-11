import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { rootDomain } from '@/lib/utils';

function extractSubdomain(request: NextRequest): string | null {
  const url = request.url;
  const host = request.headers.get('host') || '';
  const hostname = host.split(':')[0];

  // Local development: check query param first (localhost:3000?tenant=alwayz-on-sale)
  const searchParams = request.nextUrl.searchParams;
  const tenantParam = searchParams.get('tenant');
  if (tenantParam) {
    return tenantParam;
  }

  // Local development: subdomain style (alwayz-on-sale.localhost:3000)
  if (url.includes('localhost') || url.includes('127.0.0.1')) {
    const fullUrlMatch = url.match(/http:\/\/([^.]+)\.localhost/);
    if (fullUrlMatch && fullUrlMatch[1]) {
      return fullUrlMatch[1];
    }

    if (hostname.includes('.localhost')) {
      return hostname.split('.')[0];
    }

    return null;
  }

  // Production environment
  const rootDomainFormatted = rootDomain.split(':')[0];

  // Handle preview deployment URLs (tenant---branch-name.vercel.app)
  if (hostname.includes('---') && hostname.endsWith('.vercel.app')) {
    const parts = hostname.split('---');
    return parts.length > 0 ? parts[0] : null;
  }

  // Regular subdomain detection
  const isSubdomain =
    hostname !== rootDomainFormatted &&
    hostname !== `www.${rootDomainFormatted}` &&
    hostname.endsWith(`.${rootDomainFormatted}`);

  return isSubdomain ? hostname.replace(`.${rootDomainFormatted}`, '') : null;
}

// Routes that don't require authentication
const publicRoutes = ['/login', '/auth/callback', '/forgot-password'];

// Routes that are API routes (handled separately)
const isApiRoute = (pathname: string) => pathname.startsWith('/api');

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const subdomain = extractSubdomain(request);

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

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

    // Rewrite subdomain requests to the subdomain route
    if (pathname === '/' || pathname === '') {
      return NextResponse.rewrite(
        new URL(`/s/${subdomain}`, request.url),
        { headers: supabaseResponse.headers }
      );
    }
  }

  // On root domain without subdomain (main site)
  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths except for:
     * 1. /api routes (handled separately)
     * 2. /_next (Next.js internals)
     * 3. all root files inside /public (e.g. /favicon.ico)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
