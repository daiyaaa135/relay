/** Result from location search (Nominatim). */
export type LocationSuggestion = {
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  displayName: string;
};

/** Optional user location to limit and prioritize pickup suggestions (same state, nearest first). */
export type SearchLocationsOptions = {
  latitude: number;
  longitude: number;
  state?: string;
};

/**
 * Search for locations using Mapbox Geocoding API with proximity bias (requires NEXT_PUBLIC_MAPBOX_TOKEN).
 * When userLocation is provided, results are biased toward that point (nearest first).
 * Returns up to 5 suggestions.
 */
export async function searchLocationsMapbox(
  query: string,
  userLocation?: SearchLocationsOptions
): Promise<LocationSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const token =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_MAPBOX_TOKEN : undefined;
  if (!token) return [];
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/1b68bc98-dfbf-4969-9794-62dc8b7c5307',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/geo.ts:searchLocationsMapbox:entry',message:'Mapbox searchLocationsMapbox',data:{query:q,hasUserLocation:!!userLocation},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  try {
    const params = new URLSearchParams({
      access_token: token,
      limit: '5',
      types: 'poi,place,address',
    });
    if (userLocation?.latitude != null && userLocation?.longitude != null) {
      params.set('proximity', `${userLocation.longitude},${userLocation.latitude}`);
    }
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      features?: Array<{
        center: [number, number];
        place_name?: string;
        context?: Array<{ id: string; text: string }>;
      }>;
    };
    const features = data?.features ?? [];
    let list = features.map((f) => {
      const [lng, lat] = f.center;
      const placeName = f.place_name ?? '';
      const ctx = f.context ?? [];
      const region = ctx.find((c) => c.id.startsWith('region.'))?.text ?? '';
      const place = ctx.find((c) => c.id.startsWith('place.'))?.text ?? '';
      const city = place || region;
      const state = ctx.find((c) => c.id.startsWith('region.'))?.text ?? region;
      return {
        latitude: lat,
        longitude: lng,
        city,
        state,
        displayName: placeName || [city, state].filter(Boolean).join(', ') || 'Unknown',
      };
    });
    if (userLocation?.latitude != null && userLocation?.longitude != null) {
      // Sort by distance and strongly prefer nearby results (e.g. Starbucks near the user)
      const withDistances = list.map((s) => ({
        ...s,
        _d: distanceMiles(userLocation.latitude, userLocation.longitude, s.latitude, s.longitude),
      }));
      withDistances.sort((a, b) => a._d - b._d);
      // Keep only locations within ~100 miles; if none, fall back to top 5 globally
      const nearby = withDistances.filter((s) => s._d <= 100);
      const trimmed = (nearby.length > 0 ? nearby : withDistances).slice(0, 5);
      return trimmed.map(({ _d, ...rest }) => rest);
    }
    return list.slice(0, 5);
  } catch {
    return [];
  }
}

/** Preferred OSM classes/types for POI (place name over street). */
const NOMINATIM_PREFERRED_CLASS = new Set(['amenity', 'shop']);
const NOMINATIM_PREFERRED_TYPE = new Set(['cafe', 'restaurant', 'fast_food', 'pharmacy', 'bank', 'place']);
const NOMINATIM_DEPRIORITIZED_CLASS = new Set(['highway']);
const NOMINATIM_DEPRIORITIZED_TYPE = new Set(['road', 'residential', 'street', 'primary', 'secondary', 'tertiary']);

/**
 * Search for locations by query string (OpenStreetMap Nominatim, no API key).
 * Uses free-form ?q= only (no street= structured query). Requests namedetails=1 so the
 * actual place name (e.g. Starbucks) is returned. Results are prioritized: amenity/shop/cafe
 * over highway/road. If userLocation is provided, results are limited to the user's state
 * and sorted by distance (nearest first). Returns up to 5 suggestions.
 */
export async function searchLocations(
  query: string,
  userLocation?: SearchLocationsOptions
): Promise<LocationSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/1b68bc98-dfbf-4969-9794-62dc8b7c5307',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/geo.ts:searchLocations:entry',message:'Nominatim searchLocations',data:{query:q,hasUserLocation:!!userLocation,userState:userLocation?.state ?? null},timestamp:Date.now(),hypothesisId:'H2-H3-H5'})}).catch(()=>{});
  // #endregion
  try {
    const limit = userLocation?.state ? 20 : 5;
    const searchQuery = userLocation?.state?.trim() ? `${q}, ${userLocation.state.trim()}` : q;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&namedetails=1&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'RellaeyApp/1.0' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name?: string;
      class?: string;
      type?: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        state?: string;
        region?: string;
        county?: string;
        country?: string;
        road?: string;
      };
      namedetails?: { name?: string };
    }>;
    let list = (data || []).map((item) => {
      const addr = item.address ?? {};
      const city = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.county ?? '';
      const state = addr.state ?? addr.region ?? addr.country ?? '';
      const placeName = item.namedetails?.name ?? item.display_name ?? [city, state].filter(Boolean).join(', ') ?? '';
      const displayName = placeName || [city, state].filter(Boolean).join(', ') || 'Unknown';
      const cls = (item.class ?? '').toLowerCase();
      const typ = (item.type ?? '').toLowerCase();
      const preferred = NOMINATIM_PREFERRED_CLASS.has(cls) || NOMINATIM_PREFERRED_TYPE.has(typ);
      const deprioritized = NOMINATIM_DEPRIORITIZED_CLASS.has(cls) || NOMINATIM_DEPRIORITIZED_TYPE.has(typ);
      const priority = preferred ? 1 : deprioritized ? -1 : 0;
      return {
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        city,
        state,
        displayName,
        _priority: priority,
      };
    });
    // #region agent log
    const rawSample = (data || []).slice(0, 3).map((r: { address?: { state?: string; country?: string } }) => ({ state: r.address?.state ?? null, country: r.address?.country ?? null }));
    fetch('http://127.0.0.1:7242/ingest/1b68bc98-dfbf-4969-9794-62dc8b7c5307',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/geo.ts:searchLocations:afterParse',message:'Nominatim raw results',data:{rawCount:(data||[]).length,userState:userLocation?.state ?? null,rawSample},timestamp:Date.now(),hypothesisId:'H3-H4'})}).catch(()=>{});
    // #endregion
    if (userLocation?.state?.trim()) {
      const userState = userLocation.state.trim().toLowerCase();
      list = list.filter((s) => (s.state || '').trim().toLowerCase() === userState);
    }
    if (userLocation?.latitude != null && userLocation?.longitude != null) {
      const withDist = list.map((s) => ({
        ...s,
        _d: distanceMiles(userLocation.latitude, userLocation.longitude, s.latitude, s.longitude),
      }));
      withDist.sort((a, b) => {
        if (b._priority !== a._priority) return b._priority - a._priority;
        return a._d - b._d;
      });
      list = withDist.map(({ _d, _priority, ...rest }) => rest);
    } else {
      list = [...list].sort((a, b) => b._priority - a._priority).map(({ _priority, ...rest }) => rest);
    }
    const final = list.slice(0, 5);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1b68bc98-dfbf-4969-9794-62dc8b7c5307',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/geo.ts:searchLocations:exit',message:'Nominatim final',data:{finalCount:final.length,firstDisplayName:final[0]?.displayName ?? null,firstState:final[0]?.state ?? null},timestamp:Date.now(),hypothesisId:'H3-H4'})}).catch(()=>{});
    // #endregion
    return final;
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
