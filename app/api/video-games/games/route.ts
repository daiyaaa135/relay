import { NextRequest } from 'next/server';
import { parse, type HTMLElement } from 'node-html-parser';
import { getPcSlugForConsole } from '@/lib/videoGamesPcSlug';

/** Substrings/patterns that indicate hardware (exclude from game list). */
const HARDWARE_PATTERNS = [
  'system',
  'console',
  'controller',
  'expansion pak',
  'expansion pack',
  'cable',
  'organizer',
  'adaptor',
  'adapter',
  'cleaner',
  '8bitdo',
  'analogue 3d',
  'analogue3d',
  'memory card',
  'ac adapter',
  'av cable',
  'power supply',
  'dock',
  'charger',
  'grip',
  'control pad',
  'bluetooth',
  'funtastic',
  'pikachu',
  'nintendo 64 system',
  'nintendo 64 -',
  ' - black]',
  ' - white]',
  ' - extreme green]',
  ' - funtastic [',
  ' - prototype',
  ' - limited edition]',
];

function isHardware(title: string): boolean {
  const t = title.toLowerCase();
  return HARDWARE_PATTERNS.some((p) => t.includes(p));
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`PriceCharting returned ${res.status}`);
  return res.text();
}

const PRICE_REGEX = /\$([\d,]+\.?\d*)/;

/**
 * Detect title column (cell with game link) and loose price column (first cell with $ price).
 * PriceCharting layout varies: some pages have [Title, Loose, CIB, New], others have an extra
 * leading column (e.g. image) so indices shift. We detect from the first valid data row.
 */
function detectTitleAndLooseColumns(rows: HTMLElement[]): { titleIdx: number; looseIdx: number } | null {
  for (const tr of rows) {
    const tds = tr.querySelectorAll('td');
    let titleIdx = -1;
    let looseIdx = -1;
    for (let i = 0; i < tds.length; i++) {
      const td = tds[i];
      const link = td?.querySelector?.('a[href*="/game/"]');
      if (link && (link.textContent?.trim() ?? '').length > 0) titleIdx = i;
      const text = (td?.textContent ?? '').trim();
      if (PRICE_REGEX.test(text) && looseIdx === -1) looseIdx = i;
    }
    if (titleIdx >= 0 && looseIdx >= 0) return { titleIdx, looseIdx };
  }
  return null;
}

/** Parse console index page: return games with title and Loose price. Exclude hardware; caller filters by price. */
function parseConsolePageGames(html: string): { name: string; loosePrice: number }[] {
  const root = parse(html);
  const rows = root.querySelectorAll('tr');
  const detected = detectTitleAndLooseColumns(rows);
  const titleIdx = detected?.titleIdx ?? 0;
  const looseIdx = detected?.looseIdx ?? 1;
  const out: { name: string; loosePrice: number }[] = [];

  for (const tr of rows) {
    const tds = tr.querySelectorAll('td');
    if (tds.length <= Math.max(titleIdx, looseIdx)) continue;
    const titleEl = tds[titleIdx]?.querySelector('a');
    const title = (titleEl?.text ?? tds[titleIdx]?.text ?? '').trim();
    if (!title) continue;
    if (isHardware(title)) continue;
    const looseText = (tds[looseIdx]?.text ?? '').trim();
    const m = looseText.match(PRICE_REGEX);
    if (!m) continue;
    const n = parseFloat(m[1]!.replace(/,/g, ''));
    if (!Number.isFinite(n) || n <= 0) continue;
    out.push({ name: title, loosePrice: n });
  }
  return out;
}

/**
 * GET /api/video-games/games?console=Nintendo%2064
 * Returns games for that console from PriceCharting (NTSC USA), excluding hardware,
 * with average loose price > 0 and < 500.
 */
export async function GET(request: NextRequest) {
  const consoleName = (request.nextUrl.searchParams.get('console') ?? '').trim();
  if (!consoleName) {
    return Response.json({ games: [] });
  }

  const slug = getPcSlugForConsole(consoleName);
  if (!slug) {
    return Response.json({ games: [] });
  }

  try {
    const url = `https://www.pricecharting.com/console/${slug}?sort=name`;
    const html = await fetchHtml(url);
    const all = parseConsolePageGames(html);
    const games = all
      .filter((g) => g.loosePrice > 0 && g.loosePrice < 500)
      .sort((a, b) => a.name.localeCompare(b.name));

    return Response.json({ games });
  } catch {
    return Response.json({ games: [] });
  }
}
