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
  seller_joined_at: string | null;
};

export type DeviceListingsResponse = {
  listings: DeviceListing[];
  total: number;
};

/** Core data-fetching logic for device listing pages — usable from both API routes and Server Components. */
export async function fetchDeviceListings({
  brand,
  model,
  category,
  offset = 0,
  limit = 20,
}: {
  brand: string;
  model: string;
  category: string;
  offset?: number;
  limit?: number;
}): Promise<DeviceListingsResponse> {
  if (!brand || !model) return { listings: [], total: 0 };

  const supabase = createServerClient();
  if (!supabase) return { listings: [], total: 0 };

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

  if (error || !data) return { listings: [], total: 0 };

  const listings: DeviceListing[] = (data as Record<string, unknown>[]).map((row) => {
    const p = Array.isArray(row.profiles)
      ? (row.profiles as Record<string, unknown>[])[0]
      : (row.profiles as Record<string, unknown> | null);
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

  return { listings, total: count ?? 0 };
}
