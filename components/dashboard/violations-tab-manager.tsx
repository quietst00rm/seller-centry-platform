'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ViolationsMain } from './violations-main';
import { ResolvedViolationsMain } from './resolved-violations-main';
import { DocumentsNeededTab, countDocsNeededViolations } from './documents-needed-tab';
import type { Issue } from './issue-table';
import type { Violation } from '@/types';

interface ViolationsTabManagerProps {
  subdomain: string;
  onViewCase?: (issue: Issue) => void;
  documentFolderUrl?: string;
}

export function ViolationsTabManager({ subdomain, onViewCase, documentFolderUrl }: ViolationsTabManagerProps) {
  const [activeViolations, setActiveViolations] = useState<Violation[]>([]);
  const [activeTab, setActiveTab] = useState<string>('active');
  const docsTabRef = useRef<HTMLDivElement>(null);

  // Fetch active violations for docs count and Documents Needed tab
  useEffect(() => {
    async function fetchViolations() {
      try {
        const params = new URLSearchParams({ subdomain, tab: 'active' });
        const response = await fetch(`/api/violations?${params.toString()}`);
        if (response.ok) {
          const data = await response.json();
          setActiveViolations(data.data?.violations || []);
        }
      } catch (error) {
        console.error('Error fetching violations for docs count:', error);
      }
    }
    fetchViolations();
  }, [subdomain]);

  // Count violations needing documents
  const docsNeededCount = useMemo(() => {
    return countDocsNeededViolations(activeViolations);
  }, [activeViolations]);

  // Handle clicking on the alert banner
  const handleAlertClick = () => {
    setActiveTab('docs');
    // Scroll to the documents section after tab change
    setTimeout(() => {
      docsTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner for Documents Needed */}
      {docsNeededCount > 0 && activeTab !== 'docs' && (
        <button
          onClick={handleAlertClick}
          className="w-full bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-center justify-between hover:bg-yellow-500/20 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-full">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {docsNeededCount} document{docsNeededCount !== 1 ? 's' : ''} need{docsNeededCount === 1 ? 's' : ''} your attention
              </p>
              <p className="text-sm text-muted-foreground">
                Click to view required documents
              </p>
            </div>
          </div>
          <span className="text-sm text-yellow-500 font-medium">View &rarr;</span>
        </button>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold font-headline text-foreground">
            Violations Dashboard
          </h1>
          <TabsList className="grid w-full sm:w-auto grid-cols-3 bg-muted/50 border border-border/50">
            <TabsTrigger
              value="active"
              className="text-xs sm:text-sm px-3 sm:px-6 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
            >
              Active
            </TabsTrigger>
            <TabsTrigger
              value="resolved"
              className="text-xs sm:text-sm px-3 sm:px-6 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
            >
              Resolved
            </TabsTrigger>
            <TabsTrigger
              value="docs"
              className="text-xs sm:text-sm px-3 sm:px-6 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200 relative"
            >
              Docs
              {docsNeededCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-yellow-500 text-black">
                  {docsNeededCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="active" className="space-y-6">
          <ViolationsMain subdomain={subdomain} onViewCase={onViewCase} />
        </TabsContent>

        <TabsContent value="resolved" className="space-y-6">
          <ResolvedViolationsMain subdomain={subdomain} onViewCase={onViewCase} />
        </TabsContent>

        <TabsContent value="docs" className="space-y-6" ref={docsTabRef}>
          <DocumentsNeededTab
            violations={activeViolations}
            documentFolderUrl={documentFolderUrl}
            subdomain={subdomain}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
