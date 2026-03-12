import { NextRequest } from 'next/server';
import { parse } from 'node-html-parser';
import { getPcSlugForConsole } from '@/lib/videoGamesPcSlug';

function normalizeTitle(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
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

/** Parse console index: rows with title, Loose (col 2), CIB (col 3). */
function parseConsolePageLooseCib(html: string): { name: string; loosePrice: number; cibPrice: number | null }[] {
  const root = parse(html);
  const rows = root.querySelectorAll('tr');
  const titleIdx = 1;
  const looseIdx = 2;
  const cibIdx = 3;
  const out: { name: string; loosePrice: number; cibPrice: number | null }[] = [];

  for (const tr of rows) {
    const tds = tr.querySelectorAll('td');
    if (tds.length <= looseIdx) continue;
    const titleEl = tds[titleIdx]?.querySelector('a');
    const title = (titleEl?.text ?? tds[titleIdx]?.text ?? '').trim();
    if (!title) continue;
    const looseText = (tds[looseIdx]?.text ?? '').trim();
    const looseM = looseText.match(/\$([\d,]+\.?\d*)/);
    if (!looseM) continue;
    const loose = parseFloat(looseM[1]!.replace(/,/g, ''));
    if (!Number.isFinite(loose) || loose <= 0) continue;
    let cib: number | null = null;
    if (tds.length > cibIdx) {
      const cibText = (tds[cibIdx]?.text ?? '').trim();
      const cibM = cibText.match(/\$([\d,]+\.?\d*)/);
      if (cibM) {
        const n = parseFloat(cibM[1]!.replace(/,/g, ''));
        if (Number.isFinite(n) && n > 0) cib = n;
      }
    }
    out.push({ name: title, loosePrice: loose, cibPrice: cib });
  }
  return out;
}

/** Find best-matching game row by title (exact normalized, then starts-with). */
function findGameRow(
  rows: { name: string; loosePrice: number; cibPrice: number | null }[],
  gameTitle: string
): { name: string; loosePrice: number; cibPrice: number | null } | null {
  const g = normalizeTitle(gameTitle);
  const exact = rows.find((r) => normalizeTitle(r.name) === g);
  if (exact) return exact;
  const startsWith = rows.find((r) => normalizeTitle(r.name).startsWith(g) || g.startsWith(normalizeTitle(r.name)));
  return startsWith ?? null;
}

const CIB_MULTIPLIER = 0.7;

/**
 * POST /api/credits/pricecharting-game-lookup
 * Body: { console: string, game: string, condition: "Loose cartridge" | "CIB (cart + box + manual)" }.
 * Returns { credits, price }: for Loose cartridge uses Loose price; for CIB uses CIB price × 0.7.
 */
export async function POST(request: NextRequest) {
  let body: { console?: string; game?: string; condition?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const consoleName = (body.console ?? '').trim();
  const gameTitle = (body.game ?? '').trim();
  const condition = (body.condition ?? '').trim();

  if (!consoleName || !gameTitle) {
    return Response.json(
      { error: 'console and game are required.' },
      { status: 400 }
    );
  }

  const isLoose = condition === 'Loose cartridge';
  const isCib = condition === 'CIB (cart + box + manual)';
  if (!isLoose && !isCib) {
    return Response.json(
      { error: 'condition must be "Loose cartridge" or "CIB (cart + box + manual)".' },
      { status: 400 }
    );
  }

  const slug = getPcSlugForConsole(consoleName);
  if (!slug) {
    return Response.json(
      { error: 'Unknown console for PriceCharting.' },
      { status: 404 }
    );
  }

  try {
    const url = `https://www.pricecharting.com/console/${slug}?sort=name`;
    const html = await fetchHtml(url);
    const rows = parseConsolePageLooseCib(html);
    const row = findGameRow(rows, gameTitle);
    if (!row) {
      return Response.json(
        { error: 'Game not found on PriceCharting for this console.' },
        { status: 404 }
      );
    }

    let price: number;
    if (isLoose) {
      price = row.loosePrice;
    } else {
      if (row.cibPrice == null) {
        return Response.json(
          { error: 'CIB price not available for this game.' },
          { status: 404 }
        );
      }
      price = row.cibPrice * CIB_MULTIPLIER;
    }

    const credits = Math.round(price);
    return Response.json({ credits, price });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json(
      { error: `PriceCharting lookup failed: ${msg}` },
      { status: 502 }
    );
  }
}
