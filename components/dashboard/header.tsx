'use client';

import { User } from '@supabase/supabase-js';
import { RefreshCw, Send, Download, Shield, FolderUp } from 'lucide-react';
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
  documentFolderUrl?: string;
}

// Validate Google Drive folder URL format
function isValidDriveFolderUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.startsWith('https://drive.google.com/drive/folders/') &&
         url.length > 'https://drive.google.com/drive/folders/'.length;
}

export function DashboardHeader({
  storeName,
  user,
  lastSynced,
  isRefreshing,
  onRefresh,
  onSubmitTicket,
  onExport,
  documentFolderUrl,
}: DashboardHeaderProps) {
  const hasValidDocumentFolder = isValidDriveFolderUrl(documentFolderUrl);

  const handleUploadDocuments = () => {
    if (hasValidDocumentFolder && documentFolderUrl) {
      window.open(documentFolderUrl, '_blank', 'noopener,noreferrer');
    }
  };
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
    <header className="sticky top-0 z-50 bg-[#111111] border-b border-gray-800">
      <div className="px-4 h-16 flex items-center justify-between">
        {/* Left side - Logo */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-orange-500" />
            <span className="text-lg font-bold text-orange-500">Seller Centry</span>
          </div>

          {/* Store name and sync status - hidden on very small screens */}
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-white">{storeName}</p>
            <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                Synced {formatSyncTime(lastSynced)}
              </span>
              <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-1 hover:text-white transition-colors disabled:opacity-50 rounded"
                aria-label="Refresh data"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Export button - ghost style */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onExport}
            className="h-9 px-3 text-[#9ca3af] hover:text-white hover:bg-white/10"
          >
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          {/* Upload Documents button - ghost style, only shown if valid URL */}
          {hasValidDocumentFolder && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUploadDocuments}
              className="h-9 px-3 text-[#9ca3af] hover:text-white hover:bg-white/10"
            >
              <FolderUp className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Upload Documents</span>
            </Button>
          )}

          {/* Submit Ticket button - orange filled */}
          <Button
            size="sm"
            onClick={onSubmitTicket}
            className="h-9 px-4 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Send className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Submit Ticket</span>
          </Button>

          {/* User dropdown */}
          <UserDropdown user={user} />
        </div>
      </div>

      {/* Mobile: Store name and sync - only visible on small screens */}
      <div className="sm:hidden px-4 pb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">{storeName}</p>
          <div className="flex items-center gap-2 text-xs text-[#9ca3af]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
              Synced {formatSyncTime(lastSynced)}
            </span>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1 hover:text-white transition-colors disabled:opacity-50 rounded"
              aria-label="Refresh data"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
