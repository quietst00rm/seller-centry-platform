'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Menu,
  X,
  Download,
  Send,
  FileText,
  RefreshCw,
  Loader2,
  LogOut,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import type { Violation } from '@/types';

interface AppHeaderProps {
  storeName: string;
  merchantId?: string;
  lastSync?: Date | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  violations?: Violation[];
  ticketModalOpen?: boolean;
  onTicketModalChange?: (open: boolean) => void;
  defaultTicketAsin?: string;
  onExport?: (type: 'active' | 'resolved' | 'weekly') => void;
}

export function AppHeader({
  storeName,
  merchantId,
  lastSync,
  onRefresh,
  isRefreshing,
  violations = [],
  ticketModalOpen: externalTicketModalOpen,
  onTicketModalChange,
  defaultTicketAsin = '',
  onExport,
}: AppHeaderProps) {
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [internalTicketModalOpen, setInternalTicketModalOpen] = useState(false);
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketAsin, setTicketAsin] = useState(defaultTicketAsin);
  const [ticketMessage, setTicketMessage] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Fetch user email on mount
  useEffect(() => {
    const fetchUserEmail = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
      }
    };
    fetchUserEmail();
  }, []);

  // Use external control if provided, otherwise use internal state
  const ticketModalOpen = externalTicketModalOpen !== undefined ? externalTicketModalOpen : internalTicketModalOpen;
  const setTicketModalOpen = onTicketModalChange || setInternalTicketModalOpen;

  // Update ASIN when defaultTicketAsin changes
  useEffect(() => {
    if (defaultTicketAsin) {
      setTicketAsin(defaultTicketAsin);
    }
  }, [defaultTicketAsin]);

  const formattedSync = lastSync
    ? format(lastSync, "MMM d, h:mm a")
    : 'Just now';

  const handleExport = async (type: 'active' | 'resolved' | 'weekly') => {
    if (onExport) {
      setIsExporting(true);
      onExport(type);
      setTimeout(() => setIsExporting(false), 1000);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleSubmitTicket = async () => {
    if (!ticketSubject || !ticketMessage) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    if (!userEmail) {
      toast({
        title: 'Error',
        description: 'Unable to get user email. Please try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmittingTicket(true);

    try {
      const response = await fetch('/api/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeName,
          subject: ticketSubject,
          asin: ticketAsin,
          message: ticketMessage,
          userEmail,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit ticket');

      toast({
        title: 'Ticket Submitted',
        description: "We'll get back to you within 24 hours.",
      });
      setTicketModalOpen(false);
      setTicketSubject('');
      setTicketAsin('');
      setTicketMessage('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit ticket. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  // Build Amazon storefront URL
  const amazonStorefrontUrl = merchantId
    ? `https://www.amazon.com/sp?seller=${merchantId}`
    : null;

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border" style={{ minHeight: '72px' }}>
        <div className="flex items-center justify-between px-4 md:px-6" style={{ minHeight: '72px' }}>
          {/* Left section: Logo + Divider + Store Context + Synced (desktop) */}
          <div className="hidden md:flex items-center gap-0 flex-1">
            {/* Logo */}
            <Image
              src="/logos/seller-centry-logo.png"
              alt="Seller Centry"
              width={160}
              height={40}
              className="h-10 w-auto object-contain shrink-0"
              priority
            />

            {/* Vertical Divider */}
            <div className="h-10 w-px bg-slate-600 mx-5 shrink-0" />

            {/* Store Context: Store Name + Merchant ID stacked */}
            <div className="flex flex-col justify-center py-1">
              <h1 className="text-[15px] font-semibold text-white leading-tight">
                {storeName}
              </h1>
              {merchantId && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 leading-tight mt-0.5">
                  <span>Merchant ID:</span>
                  {amazonStorefrontUrl ? (
                    <a
                      href={amazonStorefrontUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-slate-400 hover:text-slate-200 hover:underline transition-colors"
                    >
                      {merchantId}
                    </a>
                  ) : (
                    <span className="font-mono">{merchantId}</span>
                  )}
                </div>
              )}
            </div>

            {/* Synced Indicator */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 ml-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Synced</span>
            </div>
          </div>

          {/* Left: Logo (mobile only) */}
          <div className="flex md:hidden items-center">
            <Image
              src="/logos/seller-centry-logo.png"
              alt="Seller Centry"
              width={120}
              height={30}
              className="h-7 w-auto object-contain shrink-0"
              priority
            />
          </div>

          {/* Right: Actions (desktop) */}
          <div className="hidden md:flex items-center gap-2 justify-end shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTicketModalOpen(true)}
              className="h-9"
            >
              <Send className="h-4 w-4 mr-2" />
              Submit Ticket
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => handleExport('active')} disabled={isExporting}>
                  {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  Active Violations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('resolved')} disabled={isExporting}>
                  {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  Resolved Violations
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="h-9 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>

          {/* Mobile: Hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-10 w-10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile: Store Name & Merchant ID bar */}
        <div className="md:hidden px-4 pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-base font-semibold text-foreground">
                {storeName}
              </h1>
              {merchantId && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                  <span>Merchant ID:</span>
                  {amazonStorefrontUrl ? (
                    <a
                      href={amazonStorefrontUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-slate-400 hover:text-slate-200 hover:underline transition-colors"
                    >
                      {merchantId}
                    </a>
                  ) : (
                    <span className="font-mono">{merchantId}</span>
                  )}
                </div>
              )}
            </div>
            {/* Sync status on mobile */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="hidden xs:inline">Synced</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-6 w-6 ml-0.5"
              >
                <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background p-4 space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start h-11"
              onClick={() => {
                setTicketModalOpen(true);
                setMobileMenuOpen(false);
              }}
            >
              <Send className="h-4 w-4 mr-3" />
              Submit Ticket
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-start h-11">
                  <Download className="h-4 w-4 mr-3" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => handleExport('active')} disabled={isExporting}>
                  {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  Active Violations
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('resolved')} disabled={isExporting}>
                  {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                  Resolved Violations
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              className="w-full justify-start h-11 text-muted-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-3" />
              Sign Out
            </Button>
          </div>
        )}
      </header>

      {/* Submit Ticket Modal */}
      <Dialog open={ticketModalOpen} onOpenChange={setTicketModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit a Ticket</DialogTitle>
            <DialogDescription>
              Let us know about an issue or request. We&apos;ll respond within 24 hours.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Subject *</label>
              <Select value={ticketSubject} onValueChange={setTicketSubject}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select a subject..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="question">Question</SelectItem>
                  <SelectItem value="document-request">Document Request</SelectItem>
                  <SelectItem value="status-update">Status Update</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Related ASIN (Optional)</label>
              <Input
                placeholder="B08XXXXXXXXX"
                className="h-11 font-mono"
                value={ticketAsin}
                onChange={(e) => setTicketAsin(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Message *</label>
              <Textarea
                placeholder="Describe your issue or request..."
                rows={4}
                className="resize-none"
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
              />
            </div>

            <Button
              className="w-full h-11 bg-primary hover:bg-primary/90"
              onClick={handleSubmitTicket}
              disabled={isSubmittingTicket}
            >
              {isSubmittingTicket ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
