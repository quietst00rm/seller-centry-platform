'use client';

import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { AppHeader } from './app-header';
import { ViolationsTabManager } from './violations-tab-manager';
import { CaseDetailModal } from './case-detail-modal';
import { useViolationsData } from '@/hooks/use-violations-data';
import { useToast } from '@/hooks/use-toast';
import type { Issue } from './issue-table';

interface LovableDashboardClientProps {
  subdomain: string;
  user: User;
  storeName: string;
  merchantId: string;
  documentFolderUrl?: string;
}

export function LovableDashboardClient({ subdomain, user, storeName, merchantId, documentFolderUrl }: LovableDashboardClientProps) {
  const { toast } = useToast();
  const { violations, lastSync, refetch } = useViolationsData({ subdomain });
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketAsin, setTicketAsin] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleViewCase = (issue: Issue) => {
    setSelectedIssue(issue);
    setModalOpen(true);
  };

  const handleSubmitTicketFromModal = () => {
    if (selectedIssue) {
      setTicketAsin(selectedIssue.asin);
      setModalOpen(false);
      setTicketModalOpen(true);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleExport = async (type: 'active' | 'resolved' | 'weekly' | 'pdf-active' | 'pdf-resolved') => {
    // Handle PDF exports
    if (type === 'pdf-active' || type === 'pdf-resolved') {
      try {
        const tab = type === 'pdf-active' ? 'active' : 'resolved';
        const params = new URLSearchParams({
          subdomain,
          tab,
          dateRange: 'all',
        });

        const response = await fetch(`/api/export/violations-pdf?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to generate PDF');
        }

        // Get filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = `${subdomain}-violations-report-${new Date().toISOString().split('T')[0]}.pdf`;
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
          title: 'PDF Generated',
          description: `${tab.charAt(0).toUpperCase() + tab.slice(1)} violations report downloaded.`,
        });
      } catch (error) {
        console.error('PDF export error:', error);
        toast({
          title: 'Export Failed',
          description: error instanceof Error ? error.message : 'There was an error generating the PDF.',
          variant: 'destructive',
        });
      }
      return;
    }

    // Handle CSV exports
    if (violations.length === 0) {
      toast({
        title: 'No Data',
        description: 'No violations available to export.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Filter violations based on type
      let exportViolations = violations;
      if (type === 'active') {
        exportViolations = violations.filter((v) => v.status.toLowerCase() !== 'resolved');
      } else if (type === 'resolved') {
        exportViolations = violations.filter((v) => v.status.toLowerCase() === 'resolved');
      }

      // Create CSV content
      const headers = [
        'ASIN',
        'Product Title',
        'Issue Type',
        'At Risk Sales',
        'Impact',
        'Status',
        'Date Opened',
        'Date Resolved',
        'Action Taken',
        'Next Steps',
        'Notes',
      ];

      const rows = exportViolations.map((v) => [
        v.asin,
        `"${(v.productTitle || '').replace(/"/g, '""')}"`,
        `"${(v.reason || '').replace(/"/g, '""')}"`,
        v.atRiskSales,
        v.ahrImpact,
        v.status,
        v.date,
        v.dateResolved || '',
        `"${(v.actionTaken || '').replace(/"/g, '""')}"`,
        `"${(v.nextSteps || '').replace(/"/g, '""')}"`,
        `"${(v.notes || '').replace(/"/g, '""')}"`,
      ]);

      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${subdomain}-${type}-violations-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} violations CSV downloaded.`,
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'There was an error generating the CSV.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        storeName={storeName || subdomain}
        subdomain={subdomain}
        merchantId={merchantId}
        lastSync={lastSync}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        violations={violations}
        ticketModalOpen={ticketModalOpen}
        onTicketModalChange={setTicketModalOpen}
        defaultTicketAsin={ticketAsin}
        onExport={handleExport}
        documentFolderUrl={documentFolderUrl}
      />

      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <ViolationsTabManager
          subdomain={subdomain}
          onViewCase={handleViewCase}
          documentFolderUrl={documentFolderUrl}
        />
      </main>

      {/* Case Detail Modal */}
      <CaseDetailModal
        issue={selectedIssue}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmitTicket={handleSubmitTicketFromModal}
      />
    </div>
  );
}
