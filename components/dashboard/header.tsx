'use client';

import { User } from '@supabase/supabase-js';
import { RefreshCw, Send, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserDropdown } from '@/components/user-dropdown';

interface DashboardHeaderProps {
  storeName: string;
  user: User;
  lastSynced: Date | null;
  isRefreshing: boolean;
  onRefresh: () => void;
  onSubmitTicket: () => void;
  onExport: () => void;
}

export function DashboardHeader({
  storeName,
  user,
  lastSynced,
  isRefreshing,
  onRefresh,
  onSubmitTicket,
  onExport,
}: DashboardHeaderProps) {
  const formatSyncTime = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="px-4 py-3">
        {/* Top row - Logo and user */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-primary">Seller Centry</h1>
          </div>
          <UserDropdown user={user} />
        </div>

        {/* Second row - Store name and sync */}
        <div className="flex items-center justify-between mt-2">
          <div>
            <p className="text-sm font-medium">{storeName}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Synced {formatSyncTime(lastSynced)}</span>
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-1 hover:text-foreground transition-colors disabled:opacity-50"
                aria-label="Refresh data"
              >
                <RefreshCw
                  className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="touch-target"
            >
              <Download className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              size="sm"
              onClick={onSubmitTicket}
              className="touch-target"
            >
              <Send className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Submit Ticket</span>
              <span className="sm:hidden">Ticket</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
