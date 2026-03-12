import { NextRequest } from 'next/server';
import { parse } from 'node-html-parser';

/** Condition multiplier: Loose (used) price × multiplier = condition-adjusted value. */
const CONDITION_MULTIPLIER: Record<string, number> = {
  New: 0.85,
  Mint: 0.72,
  Good: 0.64,
  Fair: 0.57,
  Poor: 0.5,
};

/** Convert USD price to credits (1 credit = $1). */
function priceToCredits(price: number): number {
  return Math.round(price);
}

/**
 * PriceCharting has two patterns:
 * 1. Single product page (e.g. Switch 2) – different platform, one URL, one Loose price.
 * 2. Console index page (e.g. nintendo-3ds, nintendo-switch, wii) – table of many items; we match rows by title and average Loose prices.
 */
type PriceChartingSource =
  | { type: 'product'; url: string }
  | { type: 'console'; url: string; matchTitle: (title: string) => boolean };

const PC_GAMES_BASE = 'https://www.pricecharting.com/game/pc-games';
const N64_BASE = 'https://www.pricecharting.com/game/nintendo-64';
const MINI_ARCADE_BASE = 'https://www.pricecharting.com/game/mini-arcade';

/** Map (brand, model) to PriceCharting source. Switch 2 is on its own platform (single product); others use console index or single product page. */
function getPriceChartingSource(brand: string, model: string): PriceChartingSource | null {
  const b = brand.trim().toLowerCase();
  const m = model.trim();

  // Steam Deck (PC Games – single product pages)
  if (b === 'steam') {
    switch (m) {
      case 'Deck':
        return { type: 'product', url: `${PC_GAMES_BASE}/steam-deck-512-gb` };
      case 'Deck OLED Edition':
        return { type: 'product', url: `${PC_GAMES_BASE}/steam-deck-512gb-oled-edition` };
      case 'Deck OLED Limited Edition':
        return { type: 'product', url: `${PC_GAMES_BASE}/steam-deck-1tb-oled-limited-edition` };
      case 'Deck OLED Limited Edition White':
        return { type: 'product', url: `${PC_GAMES_BASE}/steam-deck-oled-limited-edition-white` };
      default:
        return null;
    }
  }

  // Analogue 3D (under Nintendo 64 on PriceCharting) — all variants (3D, 3D Black, 3D White, etc.) use same page
  if (b === 'analogue' && (m === '3D' || m.startsWith('3D '))) {
    return { type: 'product', url: `${N64_BASE}/analogue-3d-black` };
  }

  // Asus ROG Ally (PC Games)
  if (b === 'asus rog') {
    switch (m) {
      case 'Ally Ally X':
        return { type: 'product', url: `${PC_GAMES_BASE}/asus-rog-ally-x` };
      case 'Ally Handheld Console (original)':
        return { type: 'product', url: `${PC_GAMES_BASE}/asus-rog-ally-handheld-console` };
      default:
        return null;
    }
  }

  // Lenovo Legion Go (PC Games)
  if (b === 'lenovo legion') {
    switch (m) {
      case 'Go 512GB':
        return { type: 'product', url: `${PC_GAMES_BASE}/lenovo-legion-go-512gb` };
      case 'Go 1TB':
        return { type: 'product', url: `${PC_GAMES_BASE}/lenovo-legion-go-1tb` };
      case 'Go S 16GB':
        return { type: 'product', url: `${PC_GAMES_BASE}/lenovo-legion-go-s-16gb` };
      case 'Go S 1TB Glacier White':
        return { type: 'product', url: `${PC_GAMES_BASE}/lenovo-legion-go-s-1tb-glacier-white` };
      case 'Go S Z1 Extreme':
        return { type: 'product', url: `${PC_GAMES_BASE}/lenovo-legion-go-s-z1-extreme` };
      case 'Go 2 Z2 Extreme':
        return { type: 'product', url: `${PC_GAMES_BASE}/lenovo-legion-go-2-z2-extreme` };
      default:
        return null;
    }
  }

  // Arcade1Up (Mini Arcade)
  if (b === 'arcade1up') {
    switch (m) {
      case 'Counter-Cade':
        return { type: 'product', url: `${MINI_ARCADE_BASE}/arcade1up-counter-cade` };
      case 'Deluxe Street Fighter 2 Champion Edition':
        return { type: 'product', url: `${MINI_ARCADE_BASE}/arcade1up-deluxe-street-fighter-2-champion-edition` };
      default:
        return null;
    }
  }

  // Xbox
  if (b === 'xbox') {
    switch (m) {
      case 'Series X (2020)':
        return { type: 'product', url: 'https://www.pricecharting.com/game/xbox-series-x/xbox-series-x-1tb-console' };
      case 'Series S (2020)':
        return { type: 'product', url: 'https://www.pricecharting.com/game/xbox-series-x/xbox-series-s-console' };
      case 'One S (2016)':
        return {
          type: 'console',
          url: 'https://www.pricecharting.com/console/xbox-one',
          matchTitle: (t) => t.includes('Xbox One S'),
        };
      case 'One X (2017)':
        return {
          type: 'console',
          url: 'https://www.pricecharting.com/console/xbox-one',
          matchTitle: (t) => t.includes('Xbox One X'),
        };
      case 'One (2013)':
        return {
          type: 'console',
          url: 'https://www.pricecharting.com/console/xbox-one',
          matchTitle: (t) =>
            t.includes('Xbox One') &&
            !t.includes('Xbox One S') &&
            !t.includes('Xbox One X'),
        };
      default:
        return null;
    }
  }

  // PlayStation
  if (b === 'playstation') {
    switch (m) {
      case '5 Standard Edition (2020)':
        return { type: 'product', url: 'https://www.pricecharting.com/game/playstation-5/playstation-5-console-disc-version' };
      case '5 Digital Edition (2020)':
        return { type: 'product', url: 'https://www.pricecharting.com/game/playstation-5/playstation-5-console-digital-version' };
      case '5 Slim Standard Edition (2023)':
        return { type: 'product', url: 'https://www.pricecharting.com/game/playstation-5/playstation-5-slim-disc-edition' };
      case '5 Slim Digital Edition (2023)':
        return { type: 'product', url: 'https://www.pricecharting.com/game/playstation-5/playstation-5-slim-digital-edition' };
      case '4 Pro':
        return { type: 'product', url: 'https://www.pricecharting.com/game/playstation-4/playstation-4-pro-1tb-console' };
      case '4 Slim':
        return { type: 'product', url: 'https://www.pricecharting.com/game/playstation-4/playstation-4-1tb-slim-console' };
      case '4':
        return { type: 'product', url: 'https://www.pricecharting.com/game/playstation-4/playstation-4-500gb-black-console' };
      default:
        return null;
    }
  }

  // Sony handhelds
  if (b === 'sony') {
    switch (m) {
      case 'PSP-1000': return { type: 'product', url: 'https://www.pricecharting.com/game/psp/sony-psp-1000-console' };
      case 'PSP-2000': return { type: 'product', url: 'https://www.pricecharting.com/game/psp/sony-psp-2000-console' };
      case 'PSP-3000': return { type: 'product', url: 'https://www.pricecharting.com/game/psp/sony-psp-3000-console' };
      case 'PS Vita 1000': return { type: 'product', url: 'https://www.pricecharting.com/game/ps-vita/ps-vita-console-wifi' };
      case 'PS Vita 2000': return { type: 'product', url: 'https://www.pricecharting.com/game/ps-vita/ps-vita-2000-console' };
      default: return null;
    }
  }

  // Sega handhelds
  if (b === 'sega') {
    switch (m) {
      case 'Game Gear': return { type: 'product', url: 'https://www.pricecharting.com/game/game-gear/sega-game-gear-console' };
      default: return null;
    }
  }

  if (b !== 'nintendo') return null;

  switch (m) {
    // Retro Nintendo handhelds
    case 'Game Boy (Original DMG-01)': return { type: 'product', url: 'https://www.pricecharting.com/game/game-boy/game-boy-dmg-01-console' };
    case 'Game Boy Color': return { type: 'product', url: 'https://www.pricecharting.com/game/game-boy-color/game-boy-color-console' };
    case 'Game Boy Advance': return { type: 'product', url: 'https://www.pricecharting.com/game/game-boy-advance/game-boy-advance-console' };
    case 'Game Boy Advance SP': return { type: 'product', url: 'https://www.pricecharting.com/game/game-boy-advance/game-boy-advance-sp-console' };
    case 'DS Original': return { type: 'product', url: 'https://www.pricecharting.com/game/nintendo-ds/nintendo-ds-console' };
    case 'DS Lite': return { type: 'product', url: 'https://www.pricecharting.com/game/nintendo-ds/nintendo-ds-lite-console' };
    case 'DSi': return { type: 'product', url: 'https://www.pricecharting.com/game/nintendo-dsi/nintendo-dsi-console' };
    case 'Switch 2':
      return {
        type: 'product',
        url: 'https://www.pricecharting.com/game/nintendo-switch-2/nintendo-switch-2-console',
      };
    case 'Original 3DS XL':
      // PriceCharting: "Original Nintendo 3DS XL" or "Nintendo 3DS XL" (exclude "New Nintendo 3DS XL")
      return {
        type: 'console',
        url: 'https://www.pricecharting.com/console/nintendo-3ds',
        matchTitle: (t) =>
          t.includes('Original Nintendo 3DS XL') ||
          (t.includes('Nintendo 3DS XL') && !t.includes('New Nintendo 3DS XL')),
      };
    case 'New 3DS XL':
      // PriceCharting: "New Nintendo 3DS XL"
      return {
        type: 'console',
        url: 'https://www.pricecharting.com/console/nintendo-3ds',
        matchTitle: (t) => t.includes('New Nintendo 3DS XL'),
      };
    case 'Switch':
      return {
        type: 'console',
        url: 'https://www.pricecharting.com/console/nintendo-switch',
        matchTitle: (t) =>
          t.includes('Nintendo Switch') &&
          !t.includes('Nintendo Switch 2') &&
          !t.includes('OLED') &&
          !t.includes('Lite'),
      };
    case 'Switch - OLED':
      return {
        type: 'console',
        url: 'https://www.pricecharting.com/console/nintendo-switch',
        matchTitle: (t) => t.includes('Nintendo Switch OLED'),
      };
    case 'Switch Lite':
      return {
        type: 'console',
        url: 'https://www.pricecharting.com/console/nintendo-switch',
        matchTitle: (t) => t.includes('Nintendo Switch Lite'),
      };
    case 'Wii':
      return {
        type: 'console',
        url: 'https://www.pricecharting.com/console/wii',
        matchTitle: (t) =>
          t.includes('Wii System') || t.includes('Wii Console'),
      };
    default:
      return null;
  }
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`PriceCharting returned ${res.status}`);
  return res.text();
}

/** Parse single product page: extract Loose price from Full Price Guide table. */
function parseProductPageLoose(html: string): number | null {
  // Format 1: "Loose | $397.00" (some product pages)
  const looseMatch = html.match(/Loose\s*\|[^$]*\$([\d,]+\.?\d*)/i);
  if (looseMatch) {
    const n = parseFloat(looseMatch[1]!.replace(/,/g, ''));
    if (Number.isFinite(n) && n >= 20 && n < 10000) return n;
  }
  // Format 2: "| Loose         | $397.00 |"
  const alt = html.match(/\|\s*Loose\s*\|[^$]*\$([\d,]+\.?\d*)/i);
  if (alt) {
    const n = parseFloat(alt[1]!.replace(/,/g, ''));
    if (Number.isFinite(n) && n >= 20 && n < 10000) return n;
  }
  // Format 3: "Loose Price | ... |" then next row "| $421.44 -$15.97 |" (PC Games / Steam Deck style)
  const loosePriceMatch = html.match(/Loose Price[\s\S]*?\|\s*\$([\d,]+\.?\d*)/i);
  if (loosePriceMatch) {
    const n = parseFloat(loosePriceMatch[1]!.replace(/,/g, ''));
    if (Number.isFinite(n) && n >= 20 && n < 10000) return n;
  }
  // Format 4: PC Games page — "Loose" column then <span class="price js-price"> $421.44 </span>
  const spanPriceMatch = html.match(/Loose[\s\S]*?class="price js-price"[^>]*>\s*\$([\d,]+\.?\d*)/i);
  if (spanPriceMatch) {
    const n = parseFloat(spanPriceMatch[1]!.replace(/,/g, ''));
    if (Number.isFinite(n) && n >= 20 && n < 10000) return n;
  }
  // Format 5: Hardware product pages — td.used_price > span.js-price (e.g. PSP, Game Boy)
  const usedPriceMatch = html.match(/class="price numeric used_price">\s*<span class="js-price">\$([\d,]+\.?\d*)/i);
  if (usedPriceMatch) {
    const n = parseFloat(usedPriceMatch[1]!.replace(/,/g, ''));
    if (Number.isFinite(n) && n >= 5 && n < 10000) return n;
  }
  return null;
}

/** Parse console index page: table rows with title and Loose price; return array of Loose prices for matching rows. */
function parseConsolePageLoose(
  html: string,
  matchTitle: (title: string) => boolean
): number[] {
  const root = parse(html);
  const prices: number[] = [];
  const rows = root.querySelectorAll('tr');
  // PriceCharting table: col0 = empty/icon, col1 = title, col2 = Loose, col3 = CIB, col4 = New
  const titleIdx = 1;
  const looseIdx = 2;
  for (const tr of rows) {
    const tds = tr.querySelectorAll('td');
    if (tds.length <= looseIdx) continue;
    const titleEl = tds[titleIdx]?.querySelector('a');
    const title = (titleEl?.text ?? tds[titleIdx]?.text ?? '').trim();
    if (!matchTitle(title)) continue;
    const looseText = (tds[looseIdx]?.text ?? '').trim();
    const m = looseText.match(/\$([\d,]+\.?\d*)/);
    if (m) {
      const n = parseFloat(m[1]!.replace(/,/g, ''));
      if (Number.isFinite(n) && n >= 20 && n < 10000) prices.push(n);
    }
  }
  return prices;
}

/**
 * POST /api/credits/pricecharting-lookup
 * Body: { brand, model, condition } (condition: New | Mint | Good | Fair | Poor).
 * Returns { credits, price } using PriceCharting Loose (used) prices and condition multiplier.
 * Supports both single-product pages (e.g. Switch 2) and console index pages (3DS XL, Switch, Wii).
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
    return Response.json(
      { error: 'brand and model are required.' },
      { status: 400 }
    );
  }

  const source = getPriceChartingSource(brand.trim(), model.trim());
  if (!source) {
    return Response.json(
      { error: 'PriceCharting does not have data for this console model.' },
      { status: 404 }
    );
  }

  try {
    const html = await fetchHtml(source.url);

    if (source.type === 'product') {
      const loose = parseProductPageLoose(html);
      if (loose == null) {
        return Response.json(
          { error: 'Could not parse Loose price from PriceCharting.' },
          { status: 502 }
        );
      }
      const mult =
        condition && CONDITION_MULTIPLIER[condition] != null
          ? CONDITION_MULTIPLIER[condition]!
          : 1;
      const price = Math.round(loose * mult);
      const credits = priceToCredits(price);
      return Response.json({ credits, price });
    }

    const loosePrices = parseConsolePageLoose(html, source.matchTitle);
    if (loosePrices.length === 0) {
      return Response.json(
        { error: 'No matching Loose prices found on PriceCharting for this model.' },
        { status: 404 }
      );
    }
    const avgLoose =
      loosePrices.reduce((a, b) => a + b, 0) / loosePrices.length;
    const mult =
      condition && CONDITION_MULTIPLIER[condition] != null
        ? CONDITION_MULTIPLIER[condition]!
        : 1;
    const price = Math.round(avgLoose * mult);
    const credits = priceToCredits(price);
    return Response.json({ credits, price });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json(
      { error: `PriceCharting lookup failed: ${msg}` },
      { status: 502 }
    );
  }
}
