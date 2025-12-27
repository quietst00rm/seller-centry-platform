import { notFound } from 'next/navigation';
import { getTenantBySubdomain } from '@/lib/google/sheets';
import { ClientViolationsDashboard } from '@/components/team/client-violations-dashboard';

interface ClientDetailPageProps {
  params: Promise<{
    subdomain: string;
  }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { subdomain } = await params;

  // Fetch tenant info server-side
  const tenant = await getTenantBySubdomain(subdomain);

  if (!tenant) {
    notFound();
  }

  return <ClientViolationsDashboard subdomain={subdomain} tenant={tenant} />;
}
