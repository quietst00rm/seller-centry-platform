import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTenantBySubdomain } from '@/lib/google/sheets';
import type { TenantResponse } from '@/types';

export async function GET(request: NextRequest) {
  try {
    // Get subdomain from query params or header
    const searchParams = request.nextUrl.searchParams;
    const subdomain = searchParams.get('subdomain') || request.headers.get('x-subdomain');

    if (!subdomain) {
      return NextResponse.json<TenantResponse>(
        { success: false, error: 'Subdomain is required' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<TenantResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch tenant data from Google Sheets
    const tenant = await getTenantBySubdomain(subdomain);

    if (!tenant) {
      return NextResponse.json<TenantResponse>(
        { success: false, error: 'Tenant not found' },
        { status: 404 }
      );
    }

    return NextResponse.json<TenantResponse>({
      success: true,
      data: tenant,
    });
  } catch (error) {
    console.error('Error in tenant API:', error);
    return NextResponse.json<TenantResponse>(
      { success: false, error: 'Failed to fetch tenant data' },
      { status: 500 }
    );
  }
}
