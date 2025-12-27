import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isTeamMember } from '@/lib/auth/team';
import { getTenantBySubdomain, getViolationsForTeam } from '@/lib/google/sheets';
import type { ViolationsResponse } from '@/types';

export async function GET(request: Request) {
  try {
    // Verify user is authenticated and is a team member
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<ViolationsResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!isTeamMember(user.email)) {
      return NextResponse.json<ViolationsResponse>(
        { success: false, error: 'Access denied - not a team member' },
        { status: 403 }
      );
    }

    // Get query params
    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('subdomain');
    const tab = searchParams.get('tab') as 'active' | 'resolved' | null;

    if (!subdomain) {
      return NextResponse.json<ViolationsResponse>(
        { success: false, error: 'Missing subdomain parameter' },
        { status: 400 }
      );
    }

    // Get tenant info
    const tenant = await getTenantBySubdomain(subdomain);
    if (!tenant) {
      return NextResponse.json<ViolationsResponse>(
        { success: false, error: `Client not found: ${subdomain}` },
        { status: 404 }
      );
    }

    // Fetch violations with team-specific data (includes Column O for active)
    const violations = await getViolationsForTeam(tenant, tab || 'active');

    return NextResponse.json<ViolationsResponse>({
      success: true,
      data: {
        violations,
        total: violations.length,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/team/violations:', error);
    return NextResponse.json<ViolationsResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch violations',
      },
      { status: 500 }
    );
  }
}
