/** Result from location search (Nominatim). */
export type LocationSuggestion = {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  displayName: string;
};

/** Optional user location and Search Box API filters (types, poi_category). */
export type SearchLocationsOptions = {
  latitude?: number;
  longitude?: number;
  state?: string;
  /** Comma-separated: address, poi, place, street, city, region, etc. */
  types?: string;
  /** Comma-separated canonical POI category IDs (e.g. coffee, restaurant, gas_station). */
  poi_category?: string;
  /** Comma-separated category IDs to exclude from POI results. */
  poi_category_exclusions?: string;
};

/** Category item from Search Box API list/category. */
export type SearchCategoryItem = {
  canonical_id: string;
  icon: string;
  name: string;
};

/** Search Box API forward response feature (minimal shape we use). */
type SearchBoxFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    full_address?: string;
    address?: string;
    place_formatted?: string;
    context?: {
      place?: { name?: string };
      region?: { name?: string; region_code?: string };
    };
  };
};

/**
 * Search for locations using Mapbox Search Box API /forward (requires NEXT_PUBLIC_MAPBOX_TOKEN).
 * Supports optional types and poi_category for filtering by class/type.
 */
export async function searchLocationsSearchBox(
  query: string,
  options?: SearchLocationsOptions
): Promise<LocationSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const token =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN : undefined;
  if (!token) return [];
  try {
    const params = new URLSearchParams({
      access_token: token,
      limit: '10',
    });
    if (options?.latitude != null && options?.longitude != null) {
      params.set('proximity', `${options.longitude},${options.latitude}`);
    }
    if (options?.types?.trim()) params.set('types', options.types.trim());
    if (options?.poi_category?.trim()) params.set('poi_category', options.poi_category.trim());
    if (options?.poi_category_exclusions?.trim()) {
      params.set('poi_category_exclusions', options.poi_category_exclusions.trim());
    }
    const url = `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(q)}&${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { features?: SearchBoxFeature[] };
    const features = data?.features ?? [];
    let list: LocationSuggestion[] = features.map((f) => {
      const [lng, lat] = f.geometry?.coordinates ?? [0, 0];
      const props = f.properties ?? {};
      const ctx = props.context ?? {};
      const city = ctx.place?.name ?? '';
      const state = ctx.region?.name ?? ctx.region?.region_code ?? '';
      const fullAddress =
        props.full_address ??
        ([props.address, props.place_formatted].filter(Boolean).join(', ') ||
          [city, state].filter(Boolean).join(', '));
      const name = (props.name ?? '').trim();
      // Show "Business/Facility Name — Address, City, State" so UI can display name + address on two lines
      const displayName =
        name && fullAddress
          ? `${name} — ${fullAddress}`
          : name || fullAddress || [city, state].filter(Boolean).join(', ') || 'Unknown';
      return {
        latitude: lat,
        longitude: lng,
        city,
        state,
        displayName,
      };
    });
    if (options?.latitude != null && options?.longitude != null) {
      const withDistances = list.map((s) => ({
        ...s,
        _d: distanceMiles(options.latitude!, options.longitude!, s.latitude, s.longitude),
      }));
      withDistances.sort((a, b) => a._d - b._d);
      const nearby = withDistances.filter((s) => s._d <= 100);
      const trimmed = (nearby.length > 0 ? nearby : withDistances).slice(0, 5);
      return trimmed.map(({ _d, ...rest }) => rest);
    }
    return list.slice(0, 5);
  } catch {
    return [];
  }
}

/**
 * Primary search function used by the app.
 * Uses Mapbox Search Box API with optional types and poi_category.
 */
export async function searchLocations(
  query: string,
  options?: SearchLocationsOptions
): Promise<LocationSuggestion[]> {
  return searchLocationsSearchBox(query, options);
}

/**
 * Fetch available POI categories from Search Box API for category picker UI.
 */
export async function listCategories(language = 'en'): Promise<SearchCategoryItem[]> {
  const token =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN : undefined;
  if (!token) return [];
  try {
    const url = `https://api.mapbox.com/search/searchbox/v1/list/category?access_token=${token}&language=${language}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as { list_items?: SearchCategoryItem[] };
    return data?.list_items ?? [];
  } catch {
    return [];
  }
}

/**
 * Reverse geocode lat/lng to city and state using OpenStreetMap Nominatim (no API key).
 * Returns null on failure or if no result.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<{ city: string; state: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'RellaeyApp/1.0' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        state?: string;
        region?: string;
        county?: string;
        country_code?: string;
      };
    };
    const addr = data?.address;
    if (!addr) return null;
    const city =
      addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.county ?? '';
    const state = addr.state ?? addr.region ?? addr.country_code ?? '';
    return { city, state };
  } catch {
    return null;
  }
}

/**
 * Haversine distance in miles between two lat/lng points.
 */
export function distanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
