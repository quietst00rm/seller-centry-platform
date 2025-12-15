import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getTenantBySubdomain } from '@/lib/google/sheets';
import { LovableDashboardClient } from '@/components/dashboard/lovable-dashboard-client';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}): Promise<Metadata> {
  const { subdomain } = await params;

  return {
    title: `${subdomain} | Seller Centry Dashboard`,
    description: `Amazon Seller Account Health Dashboard for ${subdomain}`,
  };
}

export default async function SubdomainDashboard({
  params,
}: {
  params: Promise<{ subdomain: string }>;
}) {
  const { subdomain } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Note: Authentication is handled by middleware
  // If user reaches here without auth, middleware already redirected them
  // This is a fallback that shows loading state briefly
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Authorization check: Verify user email matches tenant's authorized email
  const tenant = await getTenantBySubdomain(subdomain);

  if (!tenant) {
    // Tenant not found - redirect to unauthorized
    redirect('/unauthorized?reason=tenant_not_found');
  }

  // Admin bypass - admins can access any subdomain
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);

  const userEmail = user.email?.toLowerCase();
  const tenantEmail = tenant.email?.toLowerCase();
  const isAdmin = adminEmails.includes(userEmail || '');

  // Allow access if admin OR email matches subdomain's authorized email
  if (!isAdmin && (!userEmail || !tenantEmail || userEmail !== tenantEmail)) {
    redirect('/unauthorized?reason=email_mismatch');
  }

  return <LovableDashboardClient subdomain={subdomain} user={user} />;
}
