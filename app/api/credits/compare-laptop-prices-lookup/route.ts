import { NextRequest } from 'next/server';

/** Base condition multipliers: average price × multiplier = condition-adjusted value (used). */
const CONDITION_MULTIPLIER: Record<string, number> = {
  Poor: 0.5,
  Fair: 0.57,
  Good: 0.64,
  Mint: 0.72,
  New: 0.8,
};

function priceToCredits(price: number): number {
  return Math.round(price);
}

const MIN_PRICE_USD = 50;
const MAX_PRICE_USD = 15_000;

/** Extract USD prices from Compare Laptop Prices HTML (table column "Price"). */
function extractPricesFromHtml(html: string): number[] {
  const prices: number[] = [];
  const re = /\$[\s]*([\d,]+\.?\d*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const n = parseFloat(m[1]!.replace(/,/g, ''));
    if (Number.isFinite(n) && n >= MIN_PRICE_USD && n <= MAX_PRICE_USD) prices.push(n);
  }
  return prices;
}

function calculateBasePrice(prices: number[]): { avgPrice: number; count: number } | null {
  if (prices.length === 0) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
  const mean = sorted.reduce((s, p) => s + p, 0) / sorted.length;
  return { avgPrice: (median + mean) / 2, count: prices.length };
}

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

/**
 * POST /api/credits/compare-laptop-prices-lookup
 * Fallback for laptops when Swappa returns no price.
 * Body: { brand, model, condition }. Fetches comparelaptopprices.com, parses USD prices, applies condition multiplier.
 */
export async function POST(request: NextRequest) {
  let body: { brand?: string; model?: string; condition?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const { brand = '', model = '', condition = '' } = body;
  if (!brand.trim() || !model.trim()) {
    return Response.json({ error: 'brand and model are required.' }, { status: 400 });
  }

  const query = `${brand.trim()} ${model.trim()}`.trim();
  const url = `https://comparelaptopprices.com/?q=${encodeURIComponent(query)}`;

  try {
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
    const res = await fetch(url, {
      headers: {
        'User-Agent': ua,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return Response.json(
        { error: `Compare Laptop Prices returned ${res.status}` },
        { status: res.status >= 500 ? 502 : 502 }
      );
    }
    const html = await res.text();
    const prices = extractPricesFromHtml(html);
    if (prices.length === 0) {
      return Response.json(
        { error: 'No listing prices found on Compare Laptop Prices for this search.' },
        { status: 404 }
      );
    }

    const result = calculateBasePrice(prices);
    if (!result) {
      return Response.json(
        { error: 'Could not calculate base price from Compare Laptop Prices.' },
        { status: 502 }
      );
    }

    const multiplier = condition && CONDITION_MULTIPLIER[condition] != null
      ? CONDITION_MULTIPLIER[condition]!
      : CONDITION_MULTIPLIER.Good;
    const price = Math.round(result.avgPrice * multiplier);
    const credits = priceToCredits(price);

    return Response.json({
      credits,
      price,
      count: result.count,
      source: 'Compare Laptop Prices',
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'Compare Laptop Prices lookup failed.' },
      { status: 502 }
    );
  }
}
