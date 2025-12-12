'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { StatusChip, getStatusType } from '@/components/ui/status-chip';
import { Copy, Send, ExternalLink, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { Issue } from './issue-table';

interface CaseDetailModalProps {
  issue: Issue | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitTicket?: () => void;
}

export function CaseDetailModal({ issue, isOpen, onClose, onSubmitTicket }: CaseDetailModalProps) {
  const { toast } = useToast();

  if (!issue) return null;

  const copyAsin = (asin: string) => {
    navigator.clipboard.writeText(asin);
    toast({ title: 'ASIN Copied', description: asin });
  };

  return (
    <TooltipProvider>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          className={cn(
            'max-w-[600px] w-full p-0 gap-0 overflow-hidden',
            'max-h-[85vh] flex flex-col',
            'rounded-xl shadow-modal',
            'md:max-h-[85vh]',
            'data-[state=open]:animate-slide-up md:data-[state=open]:animate-scale-in'
          )}
        >
          {/* Modal Header */}
          <DialogHeader className="p-6 pb-4 border-b border-border flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-xl font-headline font-semibold text-foreground mb-2">
                  {issue.type}
                </DialogTitle>
                <StatusChip status={getStatusType(issue.status)} />
              </div>
            </div>
          </DialogHeader>

          {/* Modal Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
            {/* Section 1: ASIN Highlight */}
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">ASIN</p>
                  <div className="flex items-center gap-3">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a
                          href={`https://www.amazon.com/dp/${issue.asin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 font-mono text-lg font-semibold text-foreground hover:text-primary transition-colors"
                        >
                          {issue.asin}
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </TooltipTrigger>
                      <TooltipContent>View on Amazon</TooltipContent>
                    </Tooltip>
                    <button
                      onClick={() => copyAsin(issue.asin)}
                      className="p-1.5 rounded-md hover:bg-muted transition-colors"
                      title="Copy ASIN"
                    >
                      <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">At-Risk Sales</p>
                  <p className="text-lg font-semibold text-foreground font-tabular">
                    ${issue.atRiskSales.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Section 2: Dates */}
            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground font-medium mb-1">Date Opened</p>
                  <p className="text-foreground">{issue.opened}</p>
                </div>
                {issue.dateResolved && (
                  <div>
                    <p className="text-muted-foreground font-medium mb-1">Date Resolved</p>
                    <p className="text-foreground">{issue.dateResolved}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Product */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Product
              </h3>
              <p className="text-foreground">{issue.product}</p>
            </div>

            {/* Section 4: Action Taken */}
            {issue.actionTaken && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Action Taken
                </h3>
                <div className="bg-muted/30 border border-border rounded-lg p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{issue.actionTaken}</p>
                </div>
              </div>
            )}

            {/* Section 5: Next Steps */}
            {issue.nextSteps && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Next Steps
                </h3>
                <div className="bg-muted/30 border border-border rounded-lg p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{issue.nextSteps}</p>
                </div>
              </div>
            )}

            {/* Section 6: Options */}
            {issue.options && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Options
                </h3>
                <div className="bg-muted/30 border border-border rounded-lg p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{issue.options}</p>
                </div>
              </div>
            )}

            {/* Section 7: Notes (prominent amber styling) */}
            {issue.notes && (
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-warning" />
                  Notes for You
                </h3>
                <div className="bg-attention border border-warning/30 rounded-lg p-4">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{issue.notes}</p>
                </div>
              </div>
            )}

            {/* Section 8: Timeline */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Timeline
              </h3>
              <div className="space-y-3 border-l-2 border-border ml-2">
                {issue.log.map((item, index) => (
                  <div key={index} className="relative pl-6">
                    <div className="absolute w-3 h-3 bg-primary/20 rounded-full mt-1 -left-[7px] border-2 border-background"></div>
                    <p className="text-xs text-muted-foreground">{item.ts}</p>
                    <p className="text-sm text-foreground">{item.event}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-border flex-shrink-0 flex gap-3 justify-end bg-card">
            <Button variant="outline" onClick={onClose} className="h-11 px-6">
              Close
            </Button>
            {onSubmitTicket && (
              <Button className="h-11 px-6 bg-primary hover:bg-primary/90" onClick={onSubmitTicket}>
                <Send className="h-4 w-4 mr-2" />
                Submit Ticket About This
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
