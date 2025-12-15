import { createClient } from '@/lib/supabase/server';
import { getSubdomainsByEmail } from '@/lib/google/sheets';
import { NextResponse } from 'next/server';

// Domains that indicate we're on the generic/preview URL (no subdomain)
const GENERIC_DOMAINS = [
  'seller-centry-platform.vercel.app',
  'localhost:3000',
  '127.0.0.1:3000',
];

// Check if current host is a generic domain (no subdomain)
function isGenericDomain(host: string): boolean {
  const hostname = host.toLowerCase();
  return GENERIC_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const host = request.headers.get('host') || '';
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Handle password recovery
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`);
      }

      // Handle invite - redirect to password setup
      if (type === 'invite') {
        return NextResponse.redirect(`${origin}/auth/setup-password`);
      }

      // Check if we're on a generic domain (no subdomain)
      // If so, redirect user to their subdomain
      if (isGenericDomain(host) && data.user?.email) {
        try {
          const subdomains = await getSubdomainsByEmail(data.user.email);

          if (subdomains.length > 0) {
            // Redirect to the user's primary subdomain
            const primarySubdomain = subdomains[0];
            const targetUrl = `https://${primarySubdomain}.sellercentry.com${next}`;
            return NextResponse.redirect(targetUrl);
          }
        } catch (err) {
          console.error('Error looking up user subdomain:', err);
          // Continue to default redirect if lookup fails
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
