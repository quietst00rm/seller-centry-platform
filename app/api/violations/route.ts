import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenantBySubdomain, getViolations, filterViolations } from '@/lib/google/sheets';
import type { ViolationsResponse, ViolationStatus } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const subdomain = searchParams.get('subdomain') || request.headers.get('x-subdomain');
    const tab = (searchParams.get('tab') || 'active') as 'active' | 'resolved';
    const timeFilter = (searchParams.get('time') || 'all') as 'all' | '7days' | '30days';
    const status = (searchParams.get('status') || 'all') as ViolationStatus | 'all';
    const search = searchParams.get('search') || '';

    // Debug: log full URL and tab param to diagnose query string issue
    console.log(`[violations API] URL: ${request.nextUrl.toString()}, tab param: ${searchParams.get('tab')}`);

    if (!subdomain) {
      return NextResponse.json<ViolationsResponse>(
        { success: false, error: 'Subdomain is required' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<ViolationsResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch tenant data to get their sheet URL
    const tenant = await getTenantBySubdomain(subdomain);

    if (!tenant) {
      return NextResponse.json<ViolationsResponse>(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Fetch violations from the tenant's sheet
    const violations = await getViolations(tenant, tab);

    // Log raw data for debugging
    console.log(`[violations API] Fetched ${violations.length} ${tab} violations for subdomain: ${subdomain}`);
    if (violations.length > 0) {
      // Log unique statuses found
      const statuses = [...new Set(violations.map(v => v.status))];
      console.log(`[violations API] Statuses found: ${statuses.join(', ')}`);
    }

    // Apply filters
    const filteredViolations = filterViolations(violations, {
      timeFilter,
      status,
      search,
    });

    return NextResponse.json<ViolationsResponse>({
      success: true,
      data: {
        violations: filteredViolations,
        total: filteredViolations.length,
      },
    });
  } catch (error) {
    console.error('Error in violations API:', error);
    return NextResponse.json<ViolationsResponse>(
      { success: false, error: 'Failed to fetch violations' },
      { status: 500 }
    );
  }
}
