import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
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

  return <LovableDashboardClient subdomain={subdomain} user={user} />;
}
