import { NextRequest } from 'next/server';

/** Map app condition labels to Swappa condition slugs. Swappa has: New, Mint, Good, Fair (no Poor). */
const CONDITION_TO_SWAPPA: Record<string, string> = {
  'New': 'new',
  'Mint': 'mint',
  'Good': 'good',
  'Fair': 'fair',
  // Poor not on Swappa: we lookup fair and show 60% of that value
  'Poor': 'fair',
};

/** Similar color groups — if exact color has no listings, try others in the same group. Includes Google/Motorola/OnePlus/Razer Swappa slugs. */
const COLOR_GROUPS: string[][] = [
  ['navy-blue', 'navy', 'blue', 'icy-blue', 'silverblue', 'sky-blue', 'bay', 'slate-blue'],
  ['black', 'graphite', 'space-black', 'midnight', 'phantom-black', 'obsidian', 'charcoal'],
  ['white', 'whitesilver', 'silver', 'silver-shadow', 'starlight', 'cream', 'porcelain', 'snow', 'cloudy-white'],
  ['green', 'mint', 'jadegreen', 'wintergreen', 'hazel', 'aloe', 'sea', 'sage', 'sage-green'],
  ['purple', 'violet', 'lavender', 'deep-purple', 'peony', 'viva-magenta'],
  ['gold', 'rose-gold', 'yellow', 'orange', 'lemongrass', 'coral'],
  ['pink', 'red', 'burgundy', 'product-red', 'rose'],
  ['gray', 'space-gray', 'iron-gray', 'peacock'],
  ['natural', 'natural-titanium'],
  ['mirror'],
];

/** Convert USD price to credits (1 credit = $1). */
function priceToCredits(price: number): number {
  return Math.round(price);
}

/** Build a Swappa URL from parts. */
function buildSwappaUrl(
  brandSlug: string,
  modelSlug: string,
  opts: { condition?: string; carrier?: string; color?: string; storage?: string }
): string {
  const params = new URLSearchParams();
  if (opts.condition) params.set('condition', opts.condition);
  if (opts.carrier) params.set('carrier', opts.carrier);
  if (opts.color) params.set('color', opts.color);
  if (opts.storage) params.set('storage', opts.storage);
  return `https://swappa.com/listings/${brandSlug}-${modelSlug}${params.toString() ? '?' + params.toString() : ''}`;
}

/** Fetch a Swappa page and extract listing prices. Returns empty array on failure. */
async function fetchSwappaPrices(url: string): Promise<number[]> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const prices: number[] = [];
    for (const match of html.matchAll(/"price":\s*"(\d+(?:\.\d+)?)"/g)) {
      const price = parseFloat(match[1]!);
      if (price >= 50 && price < 10000) prices.push(price);
    }
    return prices;
  } catch {
    return [];
  }
}

/** Calculate a balanced price from an array of listing prices. */
function calculatePrice(allPrices: number[]): { avgPrice: number; median: number; mean: number; count: number } | null {
  if (allPrices.length === 0) return null;
  const sorted = [...allPrices].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)]!;
  const q3 = sorted[Math.floor(sorted.length * 0.75)]!;
  const iqr = q3 - q1;
  const filtered = sorted.filter((p) => p >= q1 - 1.5 * iqr && p <= q3 + 1.5 * iqr);
  const prices = filtered.length > 0 ? filtered : sorted;
  const mid = Math.floor(prices.length / 2);
  const median = prices.length % 2 === 0
    ? Math.round((prices[mid - 1]! + prices[mid]!) / 2)
    : Math.round(prices[mid]!);
  const mean = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);
  const avgPrice = Math.round((median + mean) / 2);
  return { avgPrice, median, mean, count: prices.length };
}

/** Get similar colors for fallback from COLOR_GROUPS. */
function getSimilarColors(colorSlug: string): string[] {
  for (const group of COLOR_GROUPS) {
    if (group.includes(colorSlug)) {
      return group.filter((c) => c !== colorSlug);
    }
  }
  return [];
}

export async function POST(request: NextRequest) {
  let body: { brand?: string; model?: string; storage?: string; condition?: string; carrier?: string; color?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { brand = '', model = '', storage = '', condition = '', carrier = '', color = '' } = body;
  if (!brand || !model) {
    return Response.json({ error: 'brand and model are required.' }, { status: 400 });
  }

  const isPoorCondition = condition === 'Poor';
  const swappaCondition = CONDITION_TO_SWAPPA[condition] ?? condition.toLowerCase();
  const brandSlug = brand.toLowerCase().replace(/\s+/g, '-');
  const modelSlug = model.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const carrierSlug = carrier ? carrier.toLowerCase().replace(/\s+/g, '-') : '';
  const colorSlug = color ? color.toLowerCase().replace(/\s+/g, '-') : '';
  const storageSlug = storage ? storage.toLowerCase().replace(/\s+/g, '-') : '';

  // --- Attempt 1: exact match (carrier + color) ---
  const url1 = buildSwappaUrl(brandSlug, modelSlug, { condition: swappaCondition, carrier: carrierSlug, color: colorSlug, storage: storageSlug });
  console.log('[swappa-lookup] Attempt 1 (exact):', url1);
  let prices = await fetchSwappaPrices(url1);

  // --- Attempt 2: same color, try other carriers (if user specified a carrier) ---
  if (prices.length === 0 && carrierSlug && colorSlug) {
    const otherCarriers = ['at&t', 't-mobile', 'verizon', 'unlocked', 'other'].filter(
      (c) => c.replace(/\s+/g, '-') !== carrierSlug && (carrierSlug === 'unlocked' || c !== 'unlocked')
    );
    for (const alt of otherCarriers) {
      const altUrl = buildSwappaUrl(brandSlug, modelSlug, { condition: swappaCondition, carrier: alt.replace(/\s+/g, '-'), color: colorSlug, storage: storageSlug });
      console.log('[swappa-lookup] Attempt 2 (alt carrier):', altUrl);
      prices = await fetchSwappaPrices(altUrl);
      if (prices.length > 0) break;
    }
  }

  // --- Attempt 3: same carrier, try similar colors ---
  if (prices.length === 0 && colorSlug) {
    const similarColors = getSimilarColors(colorSlug);
    for (const altColor of similarColors) {
      const altUrl = buildSwappaUrl(brandSlug, modelSlug, { condition: swappaCondition, carrier: carrierSlug, color: altColor, storage: storageSlug });
      console.log('[swappa-lookup] Attempt 3 (similar color):', altUrl);
      prices = await fetchSwappaPrices(altUrl);
      if (prices.length > 0) break;
    }
  }

  // --- Attempt 4: drop color entirely (keep carrier) ---
  if (prices.length === 0 && colorSlug) {
    const url4 = buildSwappaUrl(brandSlug, modelSlug, { condition: swappaCondition, carrier: carrierSlug, storage: storageSlug });
    console.log('[swappa-lookup] Attempt 4 (no color):', url4);
    prices = await fetchSwappaPrices(url4);
  }

  // --- Attempt 5: drop both color and carrier ---
  if (prices.length === 0 && (colorSlug || carrierSlug)) {
    const url5 = buildSwappaUrl(brandSlug, modelSlug, { condition: swappaCondition, storage: storageSlug });
    console.log('[swappa-lookup] Attempt 5 (no color, no carrier):', url5);
    prices = await fetchSwappaPrices(url5);
  }

  if (prices.length === 0) {
    return Response.json({ error: 'No listings found on Swappa for this device.' }, { status: 404 });
  }

  const result = calculatePrice(prices);
  if (!result) {
    return Response.json({ error: 'Could not calculate price from Swappa listings.' }, { status: 502 });
  }

  console.log('[swappa-lookup] Prices:', result.count, '| Median:', result.median, '| Mean:', result.mean, '| Avg:', result.avgPrice);

  let price = Math.max(result.median, result.mean, result.avgPrice);
  let credits = priceToCredits(price);
  /** avgPrice (before Poor adjustment) and count for empirical pricing studies */
  let avgPrice = result.avgPrice;
  if (isPoorCondition) {
    credits = Math.round(credits * 0.6);
    price = Math.round(price * 0.6 * 100) / 100;
    avgPrice = Math.round(avgPrice * 0.6 * 100) / 100;
    console.log('[swappa-lookup] Poor condition: showing 60% of Fair value ->', credits, 'credits');
  }
  return Response.json({ credits, price, count: result.count, avgPrice });
}
