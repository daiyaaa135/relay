import { NextRequest } from 'next/server';

/** Base condition multipliers: average price × multiplier = condition-adjusted value. */
const CONDITION_MULTIPLIER: Record<string, number> = {
  Poor: 0.5,
  Fair: 0.57,
  Good: 0.64,
  Mint: 0.72,
  New: 0.8,
};

/** Convert USD price to credits (1 credit = $1). */
function priceToCredits(price: number): number {
  return Math.round(price);
}

const MIN_PRICE_USD = 5;
const MAX_PRICE_USD = 10_000;

/** Extract prices from HiFi Shark HTML: supports €, $, GBP, CHF, SEK, NOK, etc. */
function extractPricesFromHtml(html: string): number[] {
  const usdPrices: number[] = [];
  // Match common patterns: €150, $189, EUR 120, GBP 80, CHF 180, SEK 2,000, NOK 350
  const patterns: Array<{ re: RegExp; rate: number }> = [
    { re: /\$[\s]*([\d,]+\.?\d*)/g, rate: 1 },
    { re: /USD[\s]*([\d,]+\.?\d*)/gi, rate: 1 },
    { re: /€[\s]*([\d,]+\.?\d*)/g, rate: 1.08 },
    { re: /EUR[\s]*([\d,]+\.?\d*)/gi, rate: 1.08 },
    { re: /£[\s]*([\d,]+\.?\d*)/g, rate: 1.27 },
    { re: /GBP[\s]*([\d,]+\.?\d*)/gi, rate: 1.27 },
    { re: /CHF[\s]*([\d,]+\.?\d*)/gi, rate: 1.12 },
    { re: /SEK[\s]*([\d,]+\.?\d*)/gi, rate: 0.09 },
    { re: /NOK[\s]*([\d,]+\.?\d*)/gi, rate: 0.09 },
    { re: /ISK[\s]*([\d,]+\.?\d*)/gi, rate: 0.007 },
    { re: /DKK[\s]*([\d,]+\.?\d*)/gi, rate: 0.14 },
  ];
  for (const { re, rate } of patterns) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(html)) !== null) {
      const n = parseFloat(m[1]!.replace(/,/g, ''));
      if (Number.isFinite(n)) {
        const usd = n * rate;
        if (usd >= MIN_PRICE_USD && usd <= MAX_PRICE_USD) usdPrices.push(usd);
      }
    }
  }
  return usdPrices;
}

/** Calculate average price (median/mean blend) from listing prices. */
function calculateBasePrice(prices: number[]): { avgPrice: number; count: number } | null {
  if (prices.length === 0) return null;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
  const mean = sorted.reduce((s, p) => s + p, 0) / sorted.length;
  const avgPrice = (median + mean) / 2;
  return { avgPrice, count: prices.length };
}

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

/**
 * POST /api/credits/hifishark-lookup
 * Body: { brand, model, condition } (condition: New | Mint | Good | Fair | Poor).
 * Fetches HiFi Shark search, parses prices (multi-currency → USD), averages, applies condition multiplier, returns credits/price.
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
  const searchUrl = `https://www.hifishark.com/search?q=${encodeURIComponent(query)}`;

  try {
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': ua,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return Response.json(
        { error: `HiFi Shark returned ${res.status}` },
        { status: res.status >= 500 ? 502 : 502 }
      );
    }
    const html = await res.text();
    const prices = extractPricesFromHtml(html);
    if (prices.length === 0) {
      return Response.json(
        { error: 'No listing prices found on HiFi Shark for this search.' },
        { status: 404 }
      );
    }

    const result = calculateBasePrice(prices);
    if (!result) {
      return Response.json(
        { error: 'Could not calculate base price from HiFi Shark listings.' },
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
      source: 'HiFi Shark',
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : 'HiFi Shark lookup failed.' },
      { status: 502 }
    );
  }
}
