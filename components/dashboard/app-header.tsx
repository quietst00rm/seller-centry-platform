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

  return (
    <>
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border" style={{ minHeight: '72px' }}>
        <div className="flex items-center justify-between px-4 md:px-6" style={{ minHeight: '72px' }}>
          {/* Left: Logo */}
          <div className="flex items-center">
            <Image
              src="/logos/Logo transparent.png"
              alt="Seller Centry"
              width={160}
              height={40}
              className="h-8 sm:h-10 w-auto object-contain shrink-0"
              priority
            />
          </div>

          {/* Center: Sync Status (desktop) */}
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Synced {formattedSync}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="h-8 w-8 ml-1"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>
          </div>

          {/* Right: Actions (desktop) */}
          <div className="hidden md:flex items-center gap-2">
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

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background p-4 space-y-3">
            {/* Sync Status */}
            <div className="flex items-center justify-between text-sm text-muted-foreground pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Synced {formattedSync}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-8 w-8"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              </Button>
            </div>

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
