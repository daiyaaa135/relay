import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export type DeviceListing = {
  id: string;
  name: string;
  brand: string;
  category: string;
  credits: number;
  condition: string;
  specs: string | null;
  carrier: string | null;
  image_url: string | null;
  city: string | null;
  state: string | null;
  seller_name: string;
  seller_avatar: string | null;
  seller_rating: number;
  /** Seller profile created_at (ISO) for "Joined Month Year" */
  seller_joined_at: string | null;
};

export type DeviceListingsResponse = {
  listings: DeviceListing[];
  total: number;
};

/** GET /api/device-listings?brand=Apple&model=iPhone+13&category=Phones&offset=0&limit=20 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const brand = (searchParams.get('brand') ?? '').trim();
  const model = (searchParams.get('model') ?? '').trim();
  const category = (searchParams.get('category') ?? '').trim();
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '0', 10) || 0);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10) || 20));

  if (!brand || !model) {
    return Response.json({ listings: [], total: 0 } satisfies DeviceListingsResponse);
  }

  const supabase = createServerClient();
  if (!supabase) {
    return Response.json({ listings: [], total: 0 } satisfies DeviceListingsResponse);
  }

  let query = supabase
    .from('gadgets')
    .select(
      `id, name, brand, category, credits, condition, specs, carrier,
       image_urls, city, state,
       profiles (display_name, avatar_url, rating, created_at)`,
      { count: 'exact' }
    )
    .eq('status', 'available')
    .ilike('brand', brand)
    .ilike('name', `%${model}%`);

  if (category) query = query.eq('category', category);

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) {
    return Response.json({ listings: [], total: 0 } satisfies DeviceListingsResponse);
  }

  const listings: DeviceListing[] = (data as Record<string, unknown>[]).map((row) => {
    const p = Array.isArray(row.profiles) ? (row.profiles as Record<string, unknown>[])[0] : (row.profiles as Record<string, unknown> | null);
    const images = (row.image_urls as string[] | null) ?? [];
    return {
      id: row.id as string,
      name: row.name as string,
      brand: row.brand as string,
      category: row.category as string,
      credits: row.credits as number,
      condition: row.condition as string,
      specs: (row.specs as string | null) ?? null,
      carrier: (row.carrier as string | null) ?? null,
      image_url: images[0] ?? null,
      city: (row.city as string | null) ?? null,
      state: (row.state as string | null) ?? null,
      seller_name: (p?.display_name as string) ?? 'Unknown',
      seller_avatar: (p?.avatar_url as string | null) ?? null,
      seller_rating: Number(p?.rating ?? 0),
      seller_joined_at: typeof p?.created_at === 'string' ? p.created_at : null,
    };
  });

  return Response.json({ listings, total: count ?? 0 } satisfies DeviceListingsResponse);
}
