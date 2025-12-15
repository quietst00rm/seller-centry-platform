import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSubdomainsByEmail } from '@/lib/google/sheets';

export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get email from query params or use authenticated user's email
    const searchParams = request.nextUrl.searchParams;
    const email = searchParams.get('email') || user.email;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Look up subdomains for this email
    const subdomains = await getSubdomainsByEmail(email);

    return NextResponse.json({
      success: true,
      data: {
        email,
        subdomains,
        primarySubdomain: subdomains.length > 0 ? subdomains[0] : null,
      },
    });
  } catch (error) {
    console.error('Error in user-subdomain API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user subdomain' },
      { status: 500 }
    );
  }
}
