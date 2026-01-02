'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, FileDown, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ExportReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  subdomain: string;
}

// Format date as YYYY-MM-DD for input
function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Format date as MM/DD/YYYY for display
function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}

// Get first day of current month
function getFirstOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Get first day of previous month
function getFirstOfPrevMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
}

// Get last day of previous month
function getLastOfPrevMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 0);
}

export function ExportReportModal({ isOpen, onClose, subdomain }: ExportReportModalProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'resolved' | 'active' | 'all'>('resolved');

  // Date range state
  const [fromDate, setFromDate] = useState(formatDateForInput(getFirstOfMonth()));
  const [toDate, setToDate] = useState(formatDateForInput(new Date()));

  // Reset to defaults when modal opens
  useEffect(() => {
    if (isOpen) {
      setFromDate(formatDateForInput(getFirstOfMonth()));
      setToDate(formatDateForInput(new Date()));
      setStatusFilter('resolved');
    }
  }, [isOpen]);

  // Quick select handlers
  const handleQuickSelect = (type: 'thisMonth' | 'lastMonth' | 'last7' | 'last30' | 'allTime') => {
    const now = new Date();

    switch (type) {
      case 'thisMonth':
        setFromDate(formatDateForInput(getFirstOfMonth()));
        setToDate(formatDateForInput(now));
        break;
      case 'lastMonth':
        setFromDate(formatDateForInput(getFirstOfPrevMonth()));
        setToDate(formatDateForInput(getLastOfPrevMonth()));
        break;
      case 'last7':
        const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
        setFromDate(formatDateForInput(sevenDaysAgo));
        setToDate(formatDateForInput(now));
        break;
      case 'last30':
        const thirtyDaysAgo = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
        setFromDate(formatDateForInput(thirtyDaysAgo));
        setToDate(formatDateForInput(now));
        break;
      case 'allTime':
        setFromDate('2020-01-01');
        setToDate(formatDateForInput(now));
        break;
    }
  };

  const handleGenerate = async () => {
    // Validate dates
    const from = new Date(fromDate + 'T00:00:00');
    const to = new Date(toDate + 'T23:59:59');

    if (from > to) {
      toast({
        title: 'Invalid Date Range',
        description: 'The "From" date must be before the "To" date.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      const params = new URLSearchParams({
        subdomain,
        tab: statusFilter,
        fromDate,
        toDate,
      });

      const response = await fetch(`/api/export/violations-pdf?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate PDF');
      }

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = `${subdomain}-${statusFilter}-report.pdf`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      // Download the PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Report Generated',
        description: 'Your PDF report has been downloaded.',
      });

      onClose();
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'There was an error generating the PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown className="h-5 w-5 text-primary" />
            Generate Report
          </DialogTitle>
          <DialogDescription>
            Select a date range and status to generate a PDF report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Quick Select Buttons */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Select</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('thisMonth')}
                className="text-xs"
              >
                This Month
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('lastMonth')}
                className="text-xs"
              >
                Last Month
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('last7')}
                className="text-xs"
              >
                Last 7 Days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('last30')}
                className="text-xs"
              >
                Last 30 Days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickSelect('allTime')}
                className="text-xs"
              >
                All Time
              </Button>
            </div>
          </div>

          {/* Date Range Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromDate" className="text-sm font-medium">
                From
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="toDate" className="text-sm font-medium">
                To
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
            </div>
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Status Filter</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'resolved' | 'active' | 'all')}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resolved">Resolved Violations</SelectItem>
                <SelectItem value="active">Active Violations</SelectItem>
                <SelectItem value="all">All Violations</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11"
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleGenerate}
              className="flex-1 h-11 bg-primary hover:bg-primary/90"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 mr-2" />
                  Generate PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
