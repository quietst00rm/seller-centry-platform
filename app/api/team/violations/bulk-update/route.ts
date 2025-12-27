import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isTeamMember } from '@/lib/auth/team';
import {
  getClientSheetId,
  findRowByViolationId,
  updateViolation,
  SheetsError,
  type ViolationUpdate,
} from '@/lib/google/sheets';

interface BulkUpdateItem {
  violationId: string;
  updates: ViolationUpdate;
}

interface BulkUpdateRequest {
  subdomain: string;
  violations: BulkUpdateItem[];
}

interface UpdateResult {
  violationId: string;
  success: boolean;
  error?: string;
}

interface BulkUpdateResponse {
  success: boolean;
  data?: {
    total: number;
    succeeded: number;
    failed: number;
    results: UpdateResult[];
    updatedAt: string;
  };
  error?: string;
}

// Tab name variations for active violations
const ACTIVE_TAB_NAMES = [
  'All Current Violations',
  'Current Violations',
  'Active Violations',
  'All Active Violations',
  'Open Violations',
];

// Process updates in batches to avoid rate limiting
const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 100;

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function PATCH(request: Request) {
  try {
    // Verify user is authenticated and is a team member
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<BulkUpdateResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!isTeamMember(user.email)) {
      return NextResponse.json<BulkUpdateResponse>(
        { success: false, error: 'Access denied - not a team member' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: BulkUpdateRequest = await request.json();
    const { subdomain, violations } = body;

    if (!subdomain) {
      return NextResponse.json<BulkUpdateResponse>(
        { success: false, error: 'Missing required field: subdomain' },
        { status: 400 }
      );
    }

    if (!violations || !Array.isArray(violations) || violations.length === 0) {
      return NextResponse.json<BulkUpdateResponse>(
        { success: false, error: 'No violations provided for update' },
        { status: 400 }
      );
    }

    // Limit bulk updates to prevent abuse
    if (violations.length > 50) {
      return NextResponse.json<BulkUpdateResponse>(
        { success: false, error: 'Maximum 50 violations per bulk update' },
        { status: 400 }
      );
    }

    // Get the client's sheet ID
    const sheetId = await getClientSheetId(subdomain);
    if (!sheetId) {
      return NextResponse.json<BulkUpdateResponse>(
        { success: false, error: `Client not found: ${subdomain}` },
        { status: 404 }
      );
    }

    // Find the active tab name
    let activeTabName: string | null = null;
    for (const tabName of ACTIVE_TAB_NAMES) {
      try {
        // Try to find any violation to confirm the tab exists
        const testRow = await findRowByViolationId(
          sheetId,
          tabName,
          violations[0].violationId
        );
        if (testRow !== null) {
          activeTabName = tabName;
          break;
        }
        // Even if not found, if no error, tab exists
        activeTabName = tabName;
        break;
      } catch {
        // Tab doesn't exist, try next
        continue;
      }
    }

    if (!activeTabName) {
      return NextResponse.json<BulkUpdateResponse>(
        { success: false, error: 'Could not find active violations tab' },
        { status: 404 }
      );
    }

    // Process updates in batches
    const results: UpdateResult[] = [];
    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < violations.length; i += BATCH_SIZE) {
      const batch = violations.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (item) => {
        const { violationId, updates } = item;

        if (!violationId || !updates || Object.keys(updates).length === 0) {
          return {
            violationId: violationId || 'unknown',
            success: false,
            error: 'Invalid update item',
          };
        }

        try {
          // Find the row
          const rowNumber = await findRowByViolationId(
            sheetId,
            activeTabName!,
            violationId
          );

          if (!rowNumber) {
            return {
              violationId,
              success: false,
              error: 'Violation not found',
            };
          }

          // Apply updates
          await updateViolation(sheetId, activeTabName!, rowNumber, updates);

          return {
            violationId,
            success: true,
          };
        } catch (error) {
          const errorMessage =
            error instanceof SheetsError
              ? error.message
              : error instanceof Error
              ? error.message
              : 'Update failed';

          return {
            violationId,
            success: false,
            error: errorMessage,
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Count successes and failures
      for (const result of batchResults) {
        if (result.success) {
          succeeded++;
        } else {
          failed++;
        }
      }

      // Delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < violations.length) {
        await delay(BATCH_DELAY_MS);
      }
    }

    const updatedAt = new Date().toISOString();

    console.log(
      `[PATCH /api/team/violations/bulk-update] User ${user.email} bulk updated ${violations.length} violations - ${succeeded} succeeded, ${failed} failed`
    );

    return NextResponse.json<BulkUpdateResponse>({
      success: failed === 0,
      data: {
        total: violations.length,
        succeeded,
        failed,
        results,
        updatedAt,
      },
    });
  } catch (error) {
    console.error('Error in PATCH /api/team/violations/bulk-update:', error);

    if (error instanceof SheetsError) {
      const statusCode =
        error.code === 'PERMISSION_DENIED'
          ? 403
          : error.code === 'NOT_FOUND'
          ? 404
          : error.code === 'RATE_LIMITED'
          ? 429
          : 500;

      return NextResponse.json<BulkUpdateResponse>(
        { success: false, error: error.message },
        { status: statusCode }
      );
    }

    return NextResponse.json<BulkUpdateResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process bulk update',
      },
      { status: 500 }
    );
  }
}
