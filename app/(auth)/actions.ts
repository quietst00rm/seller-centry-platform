'use server';

import { createClient } from '@/lib/supabase/server';
import { getSubdomainsByEmail } from '@/lib/google/sheets';
import { isTeamMember } from '@/lib/auth/team';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

// Domains that indicate we're on the generic/preview URL (no subdomain)
const GENERIC_DOMAINS = [
  'seller-centry-platform.vercel.app',
  'localhost:3000',
  '127.0.0.1:3000',
];

// Production domains
const PRODUCTION_DOMAINS = [
  'sellercentry.com',
  'seller-centry-platform.vercel.app',
];

// Check if current host is a generic domain (no subdomain)
function isGenericDomain(host: string): boolean {
  const hostname = host.toLowerCase();
  return GENERIC_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
}

// Check if current host is on the team subdomain
function isTeamSubdomain(host: string): boolean {
  const hostname = host.toLowerCase();
  // Check for team subdomain in production domains
  for (const domain of PRODUCTION_DOMAINS) {
    if (hostname === `team.${domain}`) {
      return true;
    }
  }
  // Check for team subdomain in local development
  if (hostname === 'team.localhost' || hostname.startsWith('team.localhost:')) {
    return true;
  }
  return false;
}

export async function signInWithEmail(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const redirectTo = formData.get('redirect') as string | null;

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  // Check if we're on a generic domain and should redirect to user's subdomain
  const headersList = await headers();
  const host = headersList.get('host') || '';

  // Check if user is logging in from the team subdomain
  if (isTeamSubdomain(host)) {
    // User is on team subdomain - middleware will handle rewrite to /team
    // The team layout will check if they're authorized
    redirect(redirectTo || '/');
  }

  // Check if user is a team member and should be redirected to team subdomain
  if (isTeamMember(email)) {
    // Team member on a generic domain - redirect to team subdomain
    if (isGenericDomain(host)) {
      const targetUrl = `https://team.sellercentry.com${redirectTo || '/'}`;
      return { redirectUrl: targetUrl };
    }
  }

  if (isGenericDomain(host)) {
    try {
      const subdomains = await getSubdomainsByEmail(email);

      if (subdomains.length > 0) {
        // Return the subdomain URL for client-side redirect (cross-domain)
        // Next.js redirect() doesn't work for external URLs
        const primarySubdomain = subdomains[0];
        const targetUrl = `https://${primarySubdomain}.sellercentry.com${redirectTo || '/'}`;
        return { redirectUrl: targetUrl };
      }
    } catch (err) {
      console.error('Error looking up user subdomain:', err);
      // Continue to default redirect if lookup fails
    }
  }

  // Same-origin redirect works with Next.js redirect()
  redirect(redirectTo || '/');
}

export async function signUpWithEmail(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get('origin') || '';

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Check your email for the confirmation link.' };
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get('origin') || '';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string;

  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get('origin') || '';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?type=recovery`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Check your email for the password reset link.' };
}
