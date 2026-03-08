import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export interface ProfileReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  rater_display_name: string;
  rater_avatar_url: string | null;
  gadget_name: string;
  gadget_image: string | null;
}

/**
 * GET /api/profiles/[profileId]/reviews
 * Returns swap ratings where the profile was the rated party (reviews they received).
 * Uses service role so anyone can load a profile's public reviews.
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

    type RatingRow = { id: string; swap_id: string; rating: number; comment: string | null; created_at: string; rater_profile_id: string };

    let ratings: RatingRow[] = [];
    {
      const { data, error } = await server
        .from('swap_ratings')
        .select('id, swap_id, rating, comment, created_at, rater_profile_id')
        .eq('rated_profile_id', profileId)
        .order('created_at', { ascending: false });

      if (error && /comment|schema cache|column/i.test(error.message)) {
        // comment column not yet added to the table — retry without it
        const fallback = await server
          .from('swap_ratings')
          .select('id, swap_id, rating, created_at, rater_profile_id')
          .eq('rated_profile_id', profileId)
          .order('created_at', { ascending: false });
        if (fallback.error) {
          return Response.json({ error: fallback.error.message }, { status: 500 });
        }
        ratings = (fallback.data ?? []).map((r) => ({ ...(r as Omit<RatingRow, 'comment'>), comment: null }));
      } else if (error) {
        return Response.json({ error: error.message }, { status: 500 });
      } else {
        ratings = data ?? [];
      }
    }

    if (!ratings.length) {
      return Response.json([]);
    }

    const raterIds = [...new Set(ratings.map((r) => r.rater_profile_id))];
    const swapIds = [...new Set(ratings.map((r) => r.swap_id))];

    const [ratersRes, swapsRes] = await Promise.all([
      server.from('profiles').select('id, display_name, avatar_url').in('id', raterIds),
      server.from('swaps').select('id, gadget_id').in('id', swapIds),
    ]);

    const raters = new Map(
      (ratersRes.data ?? []).map((p) => [p.id, { display_name: p.display_name, avatar_url: p.avatar_url }])
    );
    const swapToGadget = new Map((swapsRes.data ?? []).map((s) => [s.id, s.gadget_id]));

    const gadgetIds = [...new Set(swapToGadget.values())];
    const { data: gadgets } = await server
      .from('gadgets')
      .select('id, name, image_urls')
      .in('id', gadgetIds);
    const gadgetMap = new Map(
      (gadgets ?? []).map((g) => [
        g.id,
        {
          name: g.name,
          image: Array.isArray(g.image_urls) && g.image_urls[0] ? g.image_urls[0] : null,
        },
      ])
    );

    const list: ProfileReviewRow[] = ratings.map((r) => {
      const rater = raters.get(r.rater_profile_id);
      const gadgetId = swapToGadget.get(r.swap_id);
      const gadget = gadgetId ? gadgetMap.get(gadgetId) : null;
      return {
        id: r.id,
        rating: Number(r.rating),
        comment: r.comment ?? null,
        created_at: r.created_at,
        rater_display_name: rater?.display_name ?? 'Unknown',
        rater_avatar_url: rater?.avatar_url ?? null,
        gadget_name: gadget?.name ?? 'Item',
        gadget_image: gadget?.image ?? null,
      };
    });

    return Response.json(list);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
