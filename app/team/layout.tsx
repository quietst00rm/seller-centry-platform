import { createClient } from '@/lib/supabase/server';
import { isTeamMember } from '@/lib/auth/team';
import { redirect } from 'next/navigation';
import { Shield, LogOut } from 'lucide-react';
import { signOut } from '@/app/(auth)/actions';

export default async function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not authenticated, redirect to login
  // Note: Middleware should handle this, but this is a safety check
  if (!user) {
    redirect('/login');
  }

  // Check if user is an authorized team member
  if (!isTeamMember(user.email)) {
    return (
      <div className="min-h-screen bg-[#111111] flex flex-col">
        <header className="sticky top-0 z-50 bg-[#111111] border-b border-gray-800">
          <div className="px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-orange-500" />
              <span className="text-lg font-bold text-orange-500">Seller Centry</span>
              <span className="text-sm text-gray-400 ml-2">Internal Tool</span>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-gray-400 mb-4">
              You don&apos;t have permission to access the internal tool.
            </p>
            <p className="text-sm text-gray-500">
              Logged in as: <span className="text-gray-400">{user.email}</span>
            </p>
          </div>
        </main>
      </div>
    );
  }

  // User is authorized - render the team layout
  return (
    <div className="min-h-screen bg-[#111111] flex flex-col">
      <header className="sticky top-0 z-50 bg-[#111111] border-b border-gray-800">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-orange-500" />
            <span className="text-lg font-bold text-orange-500">Seller Centry</span>
            <span className="text-sm text-gray-400 ml-2 border-l border-gray-700 pl-2">
              Internal Tool
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
