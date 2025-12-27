import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isTeamMember } from '@/lib/auth/team';
import {
  getClientSheetId,
  findRowByViolationId,
  resolveViolation,
  SheetsError,
} from '@/lib/google/sheets';

interface ResolveRequest {
  subdomain: string;
  violationId: string;
}

interface ResolveResponse {
  success: boolean;
  data?: {
    violationId: string;
    resolvedAt: string;
  };
  error?: string;
}

// Tab name variations
const ACTIVE_TAB_NAMES = [
  'All Current Violations',
  'Current Violations',
  'Active Violations',
  'All Active Violations',
  'Open Violations',
];

const RESOLVED_TAB_NAMES = [
  'All Resolved Violations',
  'Resolved Violations',
  'Closed Violations',
  'All Closed Violations',
];

export async function POST(request: Request) {
  try {
    // Verify user is authenticated and is a team member
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<ResolveResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!isTeamMember(user.email)) {
      return NextResponse.json<ResolveResponse>(
        { success: false, error: 'Access denied - not a team member' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: ResolveRequest = await request.json();
    const { subdomain, violationId } = body;

    if (!subdomain || !violationId) {
      return NextResponse.json<ResolveResponse>(
        { success: false, error: 'Missing required fields: subdomain, violationId' },
        { status: 400 }
      );
    }

    // Get the client's sheet ID
    const sheetId = await getClientSheetId(subdomain);
    if (!sheetId) {
      return NextResponse.json<ResolveResponse>(
        { success: false, error: `Client not found: ${subdomain}` },
        { status: 404 }
      );
    }

    // Find the violation in active tabs
    let rowNumber: number | null = null;
    let activeTabName: string | null = null;

    for (const tabName of ACTIVE_TAB_NAMES) {
      try {
        rowNumber = await findRowByViolationId(sheetId, tabName, violationId);
        if (rowNumber) {
          activeTabName = tabName;
          break;
        }
      } catch {
        // Tab might not exist, try next
        continue;
      }
    }

    if (!rowNumber || !activeTabName) {
      return NextResponse.json<ResolveResponse>(
        { success: false, error: `Violation not found in active violations: ${violationId}` },
        { status: 404 }
      );
    }

    // Find the resolved tab
    let resolvedTabName: string | null = null;

    for (const tabName of RESOLVED_TAB_NAMES) {
      try {
        // Try to access the tab - if it exists, use it
        // We'll attempt a minimal read to check existence
        const testResult = await findRowByViolationId(sheetId, tabName, 'test-nonexistent');
        // If no error, tab exists (even if result is null)
        resolvedTabName = tabName;
        break;
      } catch (error) {
        // Check if error is "not found" (tab doesn't exist) vs other errors
        if (error instanceof SheetsError && error.code === 'NOT_FOUND') {
          continue;
        }
        // For other errors, assume tab exists but had a different issue
        resolvedTabName = tabName;
        break;
      }
    }

    if (!resolvedTabName) {
      // Default to first resolved tab name if none found
      resolvedTabName = RESOLVED_TAB_NAMES[0];
      console.log(`[POST /api/team/violations/resolve] Using default resolved tab: ${resolvedTabName}`);
    }

    // Move the violation from active to resolved
    await resolveViolation(sheetId, activeTabName, resolvedTabName, rowNumber);

    const resolvedAt = new Date().toISOString();

    console.log(
      `[POST /api/team/violations/resolve] User ${user.email} resolved violation ${violationId} for ${subdomain}`
    );

    return NextResponse.json<ResolveResponse>({
      success: true,
      data: {
        violationId,
        resolvedAt,
      },
    });
  } catch (error) {
    console.error('Error in POST /api/team/violations/resolve:', error);

    if (error instanceof SheetsError) {
      const statusCode =
        error.code === 'PERMISSION_DENIED'
          ? 403
          : error.code === 'NOT_FOUND'
          ? 404
          : error.code === 'RATE_LIMITED'
          ? 429
          : 500;

      return NextResponse.json<ResolveResponse>(
        { success: false, error: error.message },
        { status: statusCode }
      );
    }

    return NextResponse.json<ResolveResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resolve violation',
      },
      { status: 500 }
    );
  }
}
