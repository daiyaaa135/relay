import { NextRequest } from 'next/server';

/** Build Swappa listings URL from category, brand, and model. */
function buildSwappaUrl(category: string, brand: string, model: string): string {
  const modelSlug = model.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const cat = (category || '').toLowerCase();
  // Laptops: Swappa uses model-only slugs for Apple (e.g. macbook-air-2020-13)
  if (cat === 'laptops' && brand.toLowerCase() === 'apple') {
    return `https://swappa.com/listings/${modelSlug}`;
  }
  const brandSlug = brand.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  return `https://swappa.com/listings/${brandSlug}-${modelSlug}`;
}

/** Convert color slug to display name (e.g. "navy-blue" → "Navy Blue"). */
function slugToDisplay(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Fetch Swappa listings page and extract available color options. */
async function fetchSwappaColors(category: string, brand: string, model: string): Promise<string[]> {
  const url = buildSwappaUrl(category, brand, model);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const html = await res.text();

    // Extract color slugs from URL params: color=black, color=white, etc.
    const colorSlugs = new Set<string>();
    for (const match of html.matchAll(/[?&]color=([a-z0-9-]+)/gi)) {
      const slug = (match[1] ?? '').toLowerCase().trim();
      if (slug && slug !== 'all') colorSlugs.add(slug);
    }

    // Fallback: parse "All Colors Black White Desert Natural" pattern
    if (colorSlugs.size === 0) {
      const colorsMatch = html.match(/All\s+Colors\s+([A-Za-z\s\/]+?)(?:\s+All\s+Storages|\s+Sort\s+By|$)/);
      if (colorsMatch) {
        const colorText = colorsMatch[1]?.trim() ?? '';
        const names = colorText.split(/\s+/).filter((s) => s.length > 1 && /^[A-Za-z]/.test(s));
        return [...new Set(names)];
      }
    }

    return Array.from(colorSlugs).map(slugToDisplay).sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

/**
 * GET /api/colors?brand=Apple&model=iPhone%2016%20Pro&category=Phones
 * Returns model-specific colors from Swappa (or empty array on failure).
 * category: Phones | Laptops | Tablets | Headphones | Speaker | Console
 */
export async function GET(request: NextRequest) {
  const brand = (request.nextUrl.searchParams.get('brand') ?? '').trim();
  const model = (request.nextUrl.searchParams.get('model') ?? '').trim();
  const category = (request.nextUrl.searchParams.get('category') ?? 'Phones').trim();

  if (!brand || !model) {
    return Response.json({ colors: [] });
  }

  const colors = await fetchSwappaColors(category, brand, model);
  return Response.json({ colors });
}
