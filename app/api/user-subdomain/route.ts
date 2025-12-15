import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSubdomainsByEmail } from '@/lib/google/sheets';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const emailParam = searchParams.get('email');

    // If email is provided directly as query param, allow unauthenticated access
    // Subdomain info is not sensitive - it's just which subdomain a user belongs to
    // This is needed for the setup-password flow where session cookies may not be synced
    if (emailParam) {
      const subdomains = await getSubdomainsByEmail(emailParam);

      return NextResponse.json({
        success: true,
        data: {
          email: emailParam,
          subdomains,
          primarySubdomain: subdomains.length > 0 ? subdomains[0] : null,
        },
      });
    }

    // If no email provided, require authentication and use user's email
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - provide email param or authenticate' },
        { status: 401 }
      );
    }

    const userEmail = user.email;
    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Look up subdomains for this email
    const subdomains = await getSubdomainsByEmail(userEmail);

    return NextResponse.json({
      success: true,
      data: {
        email: userEmail,
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
