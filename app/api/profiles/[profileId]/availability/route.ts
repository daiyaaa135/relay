import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

/**
 * GET /api/profiles/[profileId]/availability
 * Returns weekly availability slots for a profile (e.g. seller). Used by buyers on the listing
 * page to show only pickup times that fall within the seller's availability. Uses service role
 * so buyers can load seller availability without RLS allowing client read.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const { profileId } = await params;
    if (!profileId) {
      return Response.json({ error: 'Missing profile ID' }, { status: 400 });
    }

    const server = createServerClient();
    if (!server) {
      return Response.json(
        { error: 'Server configuration error' },
        { status: 503 }
      );
    }

    const { data, error } = await server
      .from('profile_availability')
      .select('day_of_week, start_time, end_time')
      .eq('profile_id', profileId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }

    const slots = (data ?? []).map((row) => {
      const r = row as { day_of_week: number; start_time: string; end_time: string };
      return {
        dayOfWeek: Number(r.day_of_week ?? 0),
        start: String(r.start_time ?? '').slice(0, 5),
        end: String(r.end_time ?? '').slice(0, 5),
      };
    });

    return Response.json({ slots });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
