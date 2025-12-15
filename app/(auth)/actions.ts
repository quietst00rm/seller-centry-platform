'use server';

import { createClient } from '@/lib/supabase/server';
import { getSubdomainsByEmail } from '@/lib/google/sheets';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

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

  if (isGenericDomain(host)) {
    try {
      const subdomains = await getSubdomainsByEmail(email);

      if (subdomains.length > 0) {
        // Redirect to the user's primary subdomain
        const primarySubdomain = subdomains[0];
        const targetUrl = `https://${primarySubdomain}.sellercentry.com${redirectTo || '/'}`;
        redirect(targetUrl);
      }
    } catch (err) {
      console.error('Error looking up user subdomain:', err);
      // Continue to default redirect if lookup fails
    }
  }

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
