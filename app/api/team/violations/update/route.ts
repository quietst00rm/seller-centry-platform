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

interface UpdateRequest {
  subdomain: string;
  violationId: string;
  updates: ViolationUpdate;
}

interface UpdateResponse {
  success: boolean;
  data?: {
    violationId: string;
    updatedAt: string;
    fieldsUpdated: string[];
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

export async function PATCH(request: Request) {
  try {
    // Verify user is authenticated and is a team member
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<UpdateResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!isTeamMember(user.email)) {
      return NextResponse.json<UpdateResponse>(
        { success: false, error: 'Access denied - not a team member' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: UpdateRequest = await request.json();
    const { subdomain, violationId, updates } = body;

    if (!subdomain || !violationId) {
      return NextResponse.json<UpdateResponse>(
        { success: false, error: 'Missing required fields: subdomain, violationId' },
        { status: 400 }
      );
    }

    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json<UpdateResponse>(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      );
    }

    // Get the client's sheet ID
    const sheetId = await getClientSheetId(subdomain);
    if (!sheetId) {
      return NextResponse.json<UpdateResponse>(
        { success: false, error: `Client not found: ${subdomain}` },
        { status: 404 }
      );
    }

    // Try to find the violation in active tabs
    let rowNumber: number | null = null;
    let usedTabName: string | null = null;

    for (const tabName of ACTIVE_TAB_NAMES) {
      try {
        rowNumber = await findRowByViolationId(sheetId, tabName, violationId);
        if (rowNumber) {
          usedTabName = tabName;
          break;
        }
      } catch {
        // Tab might not exist, try next
        continue;
      }
    }

    if (!rowNumber || !usedTabName) {
      return NextResponse.json<UpdateResponse>(
        { success: false, error: `Violation not found: ${violationId}` },
        { status: 404 }
      );
    }

    // Apply updates
    await updateViolation(sheetId, usedTabName, rowNumber, updates);

    const updatedAt = new Date().toISOString();
    const fieldsUpdated = Object.keys(updates).filter(
      (key) => updates[key as keyof ViolationUpdate] !== undefined
    );

    console.log(
      `[PATCH /api/team/violations/update] User ${user.email} updated violation ${violationId} - fields: ${fieldsUpdated.join(', ')}`
    );

    return NextResponse.json<UpdateResponse>({
      success: true,
      data: {
        violationId,
        updatedAt,
        fieldsUpdated,
      },
    });
  } catch (error) {
    console.error('Error in PATCH /api/team/violations/update:', error);

    if (error instanceof SheetsError) {
      const statusCode =
        error.code === 'PERMISSION_DENIED'
          ? 403
          : error.code === 'NOT_FOUND'
          ? 404
          : error.code === 'RATE_LIMITED'
          ? 429
          : 500;

      return NextResponse.json<UpdateResponse>(
        { success: false, error: error.message },
        { status: statusCode }
      );
    }

    return NextResponse.json<UpdateResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update violation',
      },
      { status: 500 }
    );
  }
}
