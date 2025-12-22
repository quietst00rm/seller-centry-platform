'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ViolationsMain } from './violations-main';
import { ResolvedViolationsMain } from './resolved-violations-main';
import type { Issue } from './issue-table';

interface ViolationsTabManagerProps {
  subdomain: string;
  onViewCase?: (issue: Issue) => void;
}

export function ViolationsTabManager({ subdomain, onViewCase }: ViolationsTabManagerProps) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="active" className="w-full">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold font-headline text-foreground">
            Violations Dashboard
          </h1>
          <TabsList className="grid w-full sm:w-[400px] grid-cols-2 bg-muted/50 border border-border/50">
            <TabsTrigger
              value="active"
              className="text-xs sm:text-sm data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
            >
              Active
            </TabsTrigger>
            <TabsTrigger
              value="resolved"
              className="text-xs sm:text-sm data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md transition-all duration-200"
            >
              Resolved
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="active" className="space-y-6">
          <ViolationsMain subdomain={subdomain} onViewCase={onViewCase} />
        </TabsContent>

        <TabsContent value="resolved" className="space-y-6">
          <ResolvedViolationsMain subdomain={subdomain} onViewCase={onViewCase} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
