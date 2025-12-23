import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenantBySubdomain, getViolations } from '@/lib/google/sheets';

interface DebugResponse {
  subdomain: string;
  timestamp: string;
  steps: {
    step: string;
    success: boolean;
    details: string | object;
  }[];
  summary: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const subdomain = searchParams.get('subdomain');

  if (!subdomain) {
    return NextResponse.json({ error: 'Subdomain query param required' }, { status: 400 });
  }

  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const steps: DebugResponse['steps'] = [];
  let summary = '';

  // Step 1: Tenant lookup
  let tenant = null;
  try {
    tenant = await getTenantBySubdomain(subdomain);
    if (tenant) {
      steps.push({
        step: 'Tenant Lookup',
        success: true,
        details: {
          storeName: tenant.storeName,
          merchantId: tenant.merchantId,
          sheetUrl: tenant.sheetUrl ? `${tenant.sheetUrl.substring(0, 80)}...` : 'MISSING',
          totalViolations: tenant.totalViolations,
        },
      });
    } else {
      steps.push({
        step: 'Tenant Lookup',
        success: false,
        details: `No tenant found for subdomain "${subdomain}". Check Column L or Column A in the Client Mapping Sheet.`,
      });
      summary = `ISSUE: Tenant "${subdomain}" not found in mapping sheet.`;
    }
  } catch (error) {
    steps.push({
      step: 'Tenant Lookup',
      success: false,
      details: `Error: ${error instanceof Error ? error.message : String(error)}`,
    });
    summary = 'ISSUE: Error during tenant lookup.';
  }

  // Step 2: Violations fetch (if tenant found)
  if (tenant) {
    try {
      const activeViolations = await getViolations(tenant, 'active');
      const resolvedViolations = await getViolations(tenant, 'resolved');

      steps.push({
        step: 'Active Violations Fetch',
        success: activeViolations.length > 0,
        details: {
          count: activeViolations.length,
          sampleStatuses: activeViolations.slice(0, 5).map(v => v.status),
          sampleASINs: activeViolations.slice(0, 3).map(v => v.asin),
        },
      });

      steps.push({
        step: 'Resolved Violations Fetch',
        success: resolvedViolations.length >= 0, // Could legitimately be 0
        details: {
          count: resolvedViolations.length,
        },
      });

      if (activeViolations.length === 0 && tenant.totalViolations > 0) {
        summary = `ISSUE: Tenant has ${tenant.totalViolations} total violations in mapping sheet but fetch returned 0. Likely tab name mismatch or sheet access issue.`;
      } else if (activeViolations.length === 0) {
        summary = `INFO: No active violations found. This may be correct if the client has no violations, or there may be a tab name mismatch.`;
      } else {
        summary = `SUCCESS: Found ${activeViolations.length} active and ${resolvedViolations.length} resolved violations.`;
      }
    } catch (error) {
      steps.push({
        step: 'Violations Fetch',
        success: false,
        details: `Error: ${error instanceof Error ? error.message : String(error)}`,
      });
      summary = 'ISSUE: Error fetching violations from client sheet.';
    }
  }

  const response: DebugResponse = {
    subdomain,
    timestamp: new Date().toISOString(),
    steps,
    summary,
  };

  return NextResponse.json(response);
}
