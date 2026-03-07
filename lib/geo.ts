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
 * Search for locations by query string (OpenStreetMap Nominatim, no API key).
 * If userLocation is provided, results are limited to the user's state and sorted by distance (nearest first).
 * Returns up to 5 suggestions. Use a debounced input (e.g. 300ms) to avoid rate limits.
 */
export async function searchLocations(
  query: string,
  userLocation?: SearchLocationsOptions
): Promise<LocationSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const limit = userLocation?.state ? 20 : 5;
    const searchQuery = userLocation?.state?.trim() ? `${q}, ${userLocation.state.trim()}` : q;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'RellaeyApp/1.0' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{
      lat: string;
      lon: string;
      display_name?: string;
      address?: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        state?: string;
        region?: string;
        county?: string;
        country?: string;
      };
    }>;
    let list = (data || []).map((item) => {
      const addr = item.address ?? {};
      const city = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.county ?? '';
      const state = addr.state ?? addr.region ?? addr.country ?? '';
      return {
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        city,
        state,
        displayName: (item.display_name ?? [city, state].filter(Boolean).join(', ')) || 'Unknown',
      };
    });
    if (userLocation?.state?.trim()) {
      const userState = userLocation.state.trim().toLowerCase();
      const inState = list.filter((s) => (s.state || '').trim().toLowerCase() === userState);
      list = inState;
      if (userLocation.latitude != null && userLocation.longitude != null) {
        list = [...list].sort(
          (a, b) =>
            distanceMiles(userLocation!.latitude, userLocation!.longitude, a.latitude, a.longitude) -
            distanceMiles(userLocation!.latitude, userLocation!.longitude, b.latitude, b.longitude)
        );
      }
    } else if (userLocation?.latitude != null && userLocation?.longitude != null) {
      list = [...list].sort(
        (a, b) =>
          distanceMiles(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude) -
          distanceMiles(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude)
      );
    }
    return list.slice(0, 5);
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
