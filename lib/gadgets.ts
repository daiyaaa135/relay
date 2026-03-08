import { createClient } from './supabase';
import type { Gadget } from './types';

/** Map DB condition values to display. Only these five: new, mint, good, fair, poor. */
const CONDITION_DISPLAY: Record<string, string> = {
  'New': 'New',
  'Mint': 'Mint',
  'Good': 'Good',
  'Fair': 'Fair',
  'Poor': 'Poor',
  new: 'New',
  mint: 'Mint',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
};

/** Map UI condition to DB value. DB allows only: new, mint, good, fair, poor (lowercase). */
export const CONDITION_TO_DB: Record<string, string> = {
  'New': 'new',
  'Mint': 'mint',
  'Good': 'good',
  'Fair': 'fair',
  'Poor': 'poor',
};

/** Default listing image (same style as sample WH-1000XM5) for consistency */
const DEFAULT_LISTING_IMAGE = 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=600';

type GadgetRow = {
  id: string;
  profile_id?: string;
  name: string;
  brand: string;
  category: string;
  credits: number;
  status: string;
  condition: string;
  specs: string | null;
  description: string | null;
  color: string | null;
  carrier: string | null;
  verification_code: string | null;
  image_urls: string[] | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at?: string | null;
  pickup_locations?: { city: string; state: string; latitude: number; longitude: number; displayName?: string }[] | null;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    rating: number;
    membership_tier: string;
    created_at?: string | null;
  } | null;
};

function mapDbGadgetToGadget(row: GadgetRow): Gadget {
  const images = row.image_urls ?? [];
  const primaryImage = images[0] ?? 'https://placehold.co/600x800?text=No+Image';
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    category: row.category,
    credits: row.credits,
    status: row.status,
    condition: CONDITION_DISPLAY[row.condition] ?? row.condition,
    specs: row.specs ?? '',
    description: row.description ?? undefined,
    color: row.color ?? undefined,
    carrier: row.carrier ?? undefined,
    verification_code: row.verification_code ?? undefined,
    image: primaryImage,
    images: images.length > 0 ? images : undefined,
    seller: row.profiles?.display_name ?? 'Unknown',
    sellerAvatarUrl: row.profiles?.avatar_url ?? undefined,
    sellerId: row.profile_id ?? undefined,
    sellerRating: Number(row.profiles?.rating ?? 0),
    sellerJoinedAt: row.profiles?.created_at ?? undefined,
    location: row.city && row.state
      ? { city: row.city, state: row.state, distance: 0 }
      : undefined,
    latitude: row.latitude ?? undefined,
    longitude: row.longitude ?? undefined,
    pickupLocations: Array.isArray(row.pickup_locations) && row.pickup_locations.length >= 2
      ? row.pickup_locations.map((loc: { city?: string; state?: string; latitude?: number; longitude?: number; displayName?: string }) => ({
          city: loc.city ?? '',
          state: loc.state ?? '',
          latitude: Number(loc.latitude ?? 0),
          longitude: Number(loc.longitude ?? 0),
          displayName: typeof loc.displayName === 'string' ? loc.displayName : undefined,
        }))
      : undefined,
    isMemberListing: row.profiles?.membership_tier === 'relay_plus',
    created_at: row.created_at ?? undefined,
  };
}

function safeMapRow(row: Record<string, unknown>): GadgetRow {
  const p = row.profiles;
  const profile = Array.isArray(p) ? p[0] : p;
  return {
    id: row.id as string,
    profile_id: row.profile_id as string | undefined,
    name: row.name as string,
    brand: row.brand as string,
    category: row.category as string,
    credits: row.credits as number,
    status: row.status as string,
    condition: row.condition as string,
    specs: row.specs as string | null,
    description: row.description as string | null,
    color: row.color as string | null,
    carrier: row.carrier as string | null,
    verification_code: row.verification_code as string | null,
    image_urls: row.image_urls as string[] | null,
    city: row.city as string | null,
    state: row.state as string | null,
    latitude: row.latitude as number | null,
    longitude: row.longitude as number | null,
    created_at: row.created_at as string | null | undefined,
    pickup_locations: row.pickup_locations as { city: string; state: string; latitude: number; longitude: number; displayName?: string }[] | null | undefined,
    profiles: profile
      ? {
          display_name: (profile as Record<string, unknown>).display_name as string,
          avatar_url: (profile as Record<string, unknown>).avatar_url as string | null,
          rating: (profile as Record<string, unknown>).rating as number,
          membership_tier: (profile as Record<string, unknown>).membership_tier as string,
          created_at: (profile as Record<string, unknown>).created_at as string | null | undefined,
        }
      : null,
  };
}

export async function fetchGadgetById(id: string): Promise<Gadget | null> {
  if (!id) return null;
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('gadgets')
      .select(`
        id,
        profile_id,
        name,
        brand,
        category,
        credits,
        status,
        condition,
        specs,
        description,
        color,
        carrier,
        verification_code,
        image_urls,
        city,
        state,
        latitude,
        longitude,
        pickup_locations,
        profiles (
          display_name,
          avatar_url,
          rating,
          membership_tier,
          created_at
        )
      `)
      .eq('id', id)
      .in('status', ['available', 'pending_swap', 'swapped'])
      .single();

    if (error || !data) return null;
    return mapDbGadgetToGadget(safeMapRow(data as Record<string, unknown>));
  } catch {
    return null;
  }
}

export async function fetchGadgets(): Promise<Gadget[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('gadgets')
      .select(`
        id,
        status,
        name,
        brand,
        category,
        credits,
        condition,
        specs,
        color,
        carrier,
        verification_code,
        image_urls,
        city,
        state,
        latitude,
        longitude,
        profiles (
          display_name,
          avatar_url,
          rating,
          membership_tier
        )
      `)
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (error) {
      const fallback = await fetchGadgetsWithoutJoin(supabase);
      if (fallback.length > 0) return fallback;
      throw error;
    }
    if (!data || data.length === 0) return [];

    return (data as Record<string, unknown>[]).map((row) => mapDbGadgetToGadget(safeMapRow(row)));
  } catch {
    return [];
  }
}

/** Fetch gadgets listed by a profile.
 * - active: available or pending_swap
 * - swapped: successfully swapped listings
 * - deleted: listings the seller has explicitly removed
 */
export async function fetchGadgetsByProfileId(
  profileId: string,
  tab: 'active' | 'swapped' | 'deleted'
): Promise<Gadget[]> {
  if (!profileId) return [];
  try {
    const supabase = createClient();
    const statusFilter =
      tab === 'active'
        ? ['available', 'pending_swap']
        : tab === 'swapped'
          ? ['swapped']
          : ['removed'];
    const { data, error } = await supabase
      .from('gadgets')
      .select(`
        id,
        profile_id,
        status,
        name,
        brand,
        category,
        credits,
        condition,
        specs,
        color,
        carrier,
        verification_code,
        image_urls,
        city,
        state,
        latitude,
        longitude,
        created_at,
        profiles (
          display_name,
          avatar_url,
          rating,
          membership_tier
        )
      `)
      .eq('profile_id', profileId)
      .in('status', statusFilter)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map((row) => mapDbGadgetToGadget(safeMapRow(row)));
  } catch {
    return [];
  }
}

async function fetchGadgetsWithoutJoin(supabase: ReturnType<typeof createClient>): Promise<Gadget[]> {
  const { data, error } = await supabase
    .from('gadgets')
    .select('id, status, name, brand, category, credits, condition, specs, color, carrier, image_urls, city, state, latitude, longitude')
    .eq('status', 'available')
    .order('created_at', { ascending: false });

  if (error || !data || data.length === 0) return [];
  return (data as Record<string, unknown>[]).map((row) =>
    mapDbGadgetToGadget(safeMapRow(row))
  );
}

export type CreateGadgetInput = {
  name: string;
  brand: string;
  category: string;
  condition: string; // display: 'New' | 'Mint' | 'Good' | 'Fair' | 'Poor'
  specs?: string;
  description?: string;
  color?: string;
  carrier?: string;
  verification_code?: string;
  image_urls?: string[];
  credits: number; // required; get from Swappa/laptop valuation
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
};

export async function createGadget(profileId: string, input: CreateGadgetInput): Promise<{ id: string } | { error: string }> {
  try {
    if (input.credits == null || input.credits <= 0) {
      return { error: 'Credits required. Get valuation on the Photos step before listing.' };
    }
    const supabase = createClient();
    const conditionDb = CONDITION_TO_DB[input.condition] ?? 'good';
    const credits = input.credits;
    const imageUrls = input.image_urls?.length
      ? input.image_urls
      : [DEFAULT_LISTING_IMAGE];

    const baseRow = {
      profile_id: profileId,
      name: input.name.trim() || `${input.brand} ${input.category}`,
      brand: input.brand,
      category: input.category,
      credits,
      condition: conditionDb,
      specs: input.specs ?? null,
      description: input.description ?? null,
      color: input.color ?? null,
      carrier: input.carrier ?? null,
      image_urls: imageUrls,
      status: 'available',
      city: input.city ?? null,
      state: input.state ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    };

    // Try with verification_code; fall back without it if the column doesn't exist yet.
    let { data, error } = await supabase
      .from('gadgets')
      .insert({ ...baseRow, verification_code: input.verification_code ?? null })
      .select('id')
      .single();

    if (error?.message?.includes('verification_code')) {
      console.warn('[createGadget] verification_code column not found, retrying without it');
      ({ data, error } = await supabase
        .from('gadgets')
        .insert(baseRow)
        .select('id')
        .single());
    }

    if (error) return { error: error.message };
    if (!data) return { error: 'Failed to create listing' };

    return { id: data.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to create listing' };
  }
}

/** Pickup slot shape (buyer proposes times after swap). */
export type PickupSlotRow = { date: string; start: string; end: string };

/** One pickup location (seller offers 2; buyer picks one). */
export type PickupLocationRow = { latitude: number; longitude: number; city: string; state: string; displayName?: string };

/**
 * Update pickup locations for a listing. Only the owner can set. Seller must choose 2 locations so buyer can pick one.
 */
export async function updateGadgetPickupLocations(
  profileId: string,
  gadgetId: string,
  locations: PickupLocationRow[]
): Promise<{ ok: true } | { error: string }> {
  if (!profileId || !gadgetId) return { error: 'Missing profile or gadget' };
  if (!Array.isArray(locations) || locations.length < 2) return { error: 'At least 2 pickup locations are required' };
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('gadgets')
      .update({ pickup_locations: locations })
      .eq('id', gadgetId)
      .eq('profile_id', profileId);

    if (error) return { error: error.message };
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to save pickup locations' };
  }
}

/**
 * Cancel (remove) a listing. Only allowed when:
 *   1. The listing belongs to the profile.
 *   2. The gadget is still 'available' — i.e. no buyer has initiated a swap yet.
 * Callers must also enforce: seller's credits_balance >= gadget credits.
 */
export async function cancelListing(profileId: string, gadgetId: string): Promise<{ ok: true } | { error: string }> {
  if (!profileId || !gadgetId) return { error: 'Missing profile or gadget' };
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('gadgets')
      .update({ status: 'removed' })
      .eq('id', gadgetId)
      .eq('profile_id', profileId)
      .eq('status', 'available');

    if (error) return { error: error.message };
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to cancel listing' };
  }
}
