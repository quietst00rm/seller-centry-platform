import { rootDomain } from '@/lib/utils';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold text-primary">Seller Centry</h1>
        <p className="text-muted-foreground max-w-md">
          Access your dashboard via your subdomain:
        </p>
        <code className="block bg-card border border-border rounded-lg px-4 py-3 text-sm">
          your-store.{rootDomain}
        </code>
        <p className="text-sm text-muted-foreground">
          Contact support if you need access.
        </p>
      </div>
    </div>
  );
}
