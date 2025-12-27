'use client';

import { useState } from 'react';
import { ExternalLink, FileText, ChevronDown, ChevronUp, Upload, Mail, Info, Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import type { Violation } from '@/types';

interface DocumentsNeededTabProps {
  violations: Violation[];
  documentFolderUrl?: string;
  subdomain?: string;
}

// Document type definitions with requirements
const DOCUMENT_REQUIREMENTS: Record<string, { title: string; requirements: string[] }> = {
  Invoice: {
    title: 'Invoice',
    requirements: [
      'Must cover the last 365 days of sales',
      'Must be dated before the violation date',
      'Must be authentic and unaltered',
      'Must clearly show supplier name, address, and contact information',
      'Must list the ASIN/product and quantities purchased',
    ],
  },
  LOA: {
    title: 'Letter of Authorization (LOA)',
    requirements: [
      'Must be on official company letterhead from the brand owner',
      'Must explicitly authorize you to sell the product on Amazon',
      'Must include the brand owner\'s contact information',
      'Must be signed and dated',
      'Must reference the specific products or ASIN(s)',
    ],
  },
  'Safety Cert': {
    title: 'Safety Certification',
    requirements: [
      'Must be from an accredited testing laboratory',
      'Must be valid and not expired',
      'Must reference the specific product or ASIN',
      'Must show compliance with applicable safety standards (e.g., CPSC, CPSIA)',
      'Must include the testing lab\'s accreditation information',
    ],
  },
  'Lab Report': {
    title: 'Laboratory Test Report',
    requirements: [
      'Must be from an ISO 17025 accredited laboratory',
      'Must verify product compliance with applicable safety standards',
      'Must reference the specific product or ASIN tested',
      'Must include test date and report number',
      'Must show passing results for all required tests',
    ],
  },
};

// Parse comma-separated docs string into array
function parseDocsNeeded(docsNeeded: string | undefined): string[] {
  if (!docsNeeded) return [];
  return docsNeeded
    .split(',')
    .map((doc) => doc.trim())
    .filter((doc) => doc.length > 0);
}

// Format date for display
function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Truncate text for display
function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

interface DocumentCardProps {
  violation: Violation;
  docsNeeded: string[];
}

function DocumentCard({ violation, docsNeeded }: DocumentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card className="bg-card border-border/50 hover:border-orange-500/30 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <a
                href={`https://www.amazon.com/dp/${violation.asin}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm text-orange-500 hover:text-orange-400 flex items-center gap-1"
              >
                {violation.asin}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              {truncateText(violation.productTitle, 60)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Violation Date: {formatDate(violation.date)}
            </p>
          </div>
          <Badge variant="outline" className="border-yellow-500/50 text-yellow-500 shrink-0">
            {docsNeeded.length} doc{docsNeeded.length !== 1 ? 's' : ''} needed
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Documents list */}
        <div className="space-y-2 mb-3">
          <p className="text-sm font-medium text-foreground">Documents Needed:</p>
          <div className="flex flex-wrap gap-2">
            {docsNeeded.map((doc) => (
              <Badge key={doc} variant="secondary" className="bg-orange-500/10 text-orange-400 border-orange-500/20">
                <FileText className="h-3 w-3 mr-1" />
                {doc}
              </Badge>
            ))}
          </div>
        </div>

        {/* Expandable requirements section */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full justify-between text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-1">
            <Info className="h-4 w-4" />
            View Requirements
          </span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {isExpanded && (
          <div className="mt-3 space-y-4 pt-3 border-t border-border/50">
            {docsNeeded.map((doc) => {
              const docInfo = DOCUMENT_REQUIREMENTS[doc];
              if (!docInfo) return null;

              return (
                <div key={doc} className="space-y-2">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-orange-500" />
                    {docInfo.title}
                  </h4>
                  <ul className="space-y-1 text-xs text-muted-foreground ml-6">
                    {docInfo.requirements.map((req, index) => (
                      <li key={index} className="list-disc">
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DocumentsNeededTab({ violations, documentFolderUrl, subdomain }: DocumentsNeededTabProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  // Filter violations to only those with docsNeeded populated
  const violationsWithDocs = violations.filter((v) => {
    const docs = parseDocsNeeded(v.docsNeeded);
    return docs.length > 0;
  });

  // Handle PDF download
  const handleDownloadPDF = async () => {
    if (!subdomain) {
      toast({
        title: 'Error',
        description: 'Unable to generate PDF - subdomain not available',
        variant: 'destructive',
      });
      return;
    }

    setIsDownloading(true);
    try {
      const response = await fetch(`/api/export/documents-pdf?subdomain=${encodeURIComponent(subdomain)}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate PDF');
      }

      // Get the blob and create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'DocumentsNeeded.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) {
          filename = match[1];
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'PDF Downloaded',
        description: 'Your document requirements PDF has been downloaded.',
      });
    } catch (error) {
      toast({
        title: 'Download Failed',
        description: error instanceof Error ? error.message : 'Failed to download PDF',
        variant: 'destructive',
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle email button click
  const handleEmailClick = () => {
    window.location.href = 'mailto:info@sellercentry.com?subject=Document%20Submission';
  };

  // Empty state
  if (violationsWithDocs.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Documents Requested</h3>
        <p className="text-muted-foreground text-sm">
          There are no documents currently requested for your active violations.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Instructions Card */}
      <Card className="bg-card/50 border-orange-500/30">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Upload className="h-5 w-5 text-orange-500" />
                Upload Your Documents
              </h3>
              <p className="text-sm text-muted-foreground">
                Please label files clearly with the ASIN (e.g., B08XXXXXX_Invoice.pdf)
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {documentFolderUrl ? (
                <Button
                  asChild
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                >
                  <a href={documentFolderUrl} target="_blank" rel="noopener noreferrer">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload to Google Drive
                  </a>
                </Button>
              ) : null}
              <Button
                variant="outline"
                onClick={handleEmailClick}
                className="border-border hover:border-orange-500/50"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email Documents
              </Button>
            </div>
          </div>
          {/* Download PDF and info row */}
          <div className="mt-4 pt-4 border-t border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              {documentFolderUrl
                ? 'Download the PDF to see all document requirements in detail.'
                : 'No Google Drive folder configured. Please email documents to info@sellercentry.com'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Count summary */}
      <div className="text-sm text-muted-foreground">
        {violationsWithDocs.length} violation{violationsWithDocs.length !== 1 ? 's' : ''} requiring documents
      </div>

      {/* Document cards */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {violationsWithDocs.map((violation) => (
          <DocumentCard
            key={violation.id}
            violation={violation}
            docsNeeded={parseDocsNeeded(violation.docsNeeded)}
          />
        ))}
      </div>
    </div>
  );
}

// Export utility function for counting docs needed violations
export function countDocsNeededViolations(violations: Violation[]): number {
  return violations.filter((v) => {
    const docs = parseDocsNeeded(v.docsNeeded);
    return docs.length > 0;
  }).length;
}
