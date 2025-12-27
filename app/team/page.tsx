import { createClient } from '@/lib/supabase/server';
import { Shield } from 'lucide-react';

export default async function TeamDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-[#1a1a1a] rounded-lg border border-gray-800 p-8">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-orange-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Seller Centry Internal Tool
            </h1>
            <p className="text-gray-400 mb-6">
              Welcome to the internal management dashboard.
            </p>
            <div className="inline-block bg-[#222222] rounded-lg px-4 py-3 text-sm">
              <span className="text-gray-500">Logged in as:</span>{' '}
              <span className="text-white font-medium">{user?.email}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          Phase 2 will add the client management table here.
        </div>
      </div>
    </div>
  );
}
