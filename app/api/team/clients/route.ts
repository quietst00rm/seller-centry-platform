import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isTeamMember } from '@/lib/auth/team';
import { getAllClientsWithMetrics, getAllClientsBasic } from '@/lib/google/sheets';
import type { ClientsResponse } from '@/types';

export async function GET(request: Request) {
  try {
    // Verify user is authenticated and is a team member
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json<ClientsResponse>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!isTeamMember(user.email)) {
      return NextResponse.json<ClientsResponse>(
        { success: false, error: 'Access denied - not a team member' },
        { status: 403 }
      );
    }

    // Check if detailed metrics are requested
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    // Fetch clients - use basic or detailed based on query param
    const clients = detailed
      ? await getAllClientsWithMetrics()
      : await getAllClientsBasic();

    return NextResponse.json<ClientsResponse>({
      success: true,
      data: {
        clients,
        total: clients.length,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/team/clients:', error);
    return NextResponse.json<ClientsResponse>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch clients',
      },
      { status: 500 }
    );
  }
}
