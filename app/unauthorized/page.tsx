'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { ShieldX, LogOut, Mail } from 'lucide-react';

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const getMessage = () => {
    switch (reason) {
      case 'tenant_not_found':
        return {
          title: 'Account Not Found',
          description: 'This subdomain is not associated with any account in our system.',
        };
      case 'email_mismatch':
        return {
          title: 'Access Denied',
          description: "You don't have permission to access this account. Your email address is not authorized for this subdomain.",
        };
      default:
        return {
          title: 'Unauthorized',
          description: "You don't have access to this resource.",
        };
    }
  };

  const { title, description } = getMessage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>

        <div className="space-y-3 pt-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>

          <a
            href="mailto:support@sellercentry.com"
            className="inline-flex items-center justify-center gap-2 text-sm text-primary hover:underline"
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </a>
        </div>

        <p className="text-xs text-muted-foreground pt-4">
          If you believe this is an error, please contact support with your account details.
        </p>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <UnauthorizedContent />
    </Suspense>
  );
}
