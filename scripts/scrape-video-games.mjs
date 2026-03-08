#!/usr/bin/env node
/**
 * Scrape PriceCharting for top-20 most popular games for 6 consoles and write data/video-games.csv.
 * Run: node scripts/scrape-video-games.mjs
 *
 * CSV columns: BRAND,CONSOLE,MODEL,PRICE,IMAGE_URL
 *   BRAND   = console brand (Nintendo / PlayStation / Xbox)
 *   CONSOLE = console label used in the app
 *   MODEL   = game title
 *   PRICE   = Loose price in USD (integer, used as credits 1:1)
 *   IMAGE_URL = box-art image URL from PriceCharting
 */

import { parse } from 'node-html-parser';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'data', 'video-games.csv');

// Consoles to scrape: label, brand, PriceCharting slug(s)
const CONSOLES = [
  { label: 'PlayStation 5',  brand: 'PlayStation', slugs: ['playstation-5'] },
  { label: 'PlayStation 4',  brand: 'PlayStation', slugs: ['playstation-4'] },
  { label: 'Switch 2',       brand: 'Nintendo',    slugs: ['nintendo-switch-2'] },
  { label: 'Switch',         brand: 'Nintendo',    slugs: ['nintendo-switch'] },
  // Xbox Series S shares the same game library as Series X; scrape Series X only
  { label: 'Xbox Series X|S', brand: 'Xbox',       slugs: ['xbox-series-x'] },
  { label: 'Xbox One',       brand: 'Xbox',        slugs: ['xbox-one'] },
];

const TOP_N = 20;
const SLEEP_MS = 1500;

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchHtml(url) {
  console.log(`  GET ${url}`);
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/**
 * Detect column layout from <thead>.
 * Returns { hasImageCol, titleIdx, looseIdx }
 *
 * PriceCharting has two table layouts:
 *   - "New" (PS5, Switch 2, Switch, Xbox Series X): img | title | Loose | CIB | New
 *   - "Classic" (PS4, Xbox One, older):              title | Loose | CIB  | New
 *
 * We detect by checking whether the first <th> in the header is empty/has no text
 * (image placeholder) or contains "Title".
 */
function detectColumns(root) {
  const headerThs = root.querySelectorAll('thead th');
  if (headerThs.length === 0) {
    // Fallback: assume classic layout (PS4-style)
    return { hasImageCol: false, titleIdx: 0, looseIdx: 1 };
  }
  // If first th is empty (or just whitespace / has an img) → image column present
  const firstThText = headerThs[0]?.text?.trim() ?? '';
  const hasImageCol = firstThText === '' || firstThText.toLowerCase() === 'img' || firstThText.toLowerCase() === 'image';
  return {
    hasImageCol,
    titleIdx: hasImageCol ? 1 : 0,
    looseIdx: hasImageCol ? 2 : 1,
  };
}

/**
 * Titles to skip — hardware, peripherals, bundles.
 * Returns true if the title should be excluded.
 */
function isHardware(title) {
  const t = title.toLowerCase();
  return (
    t.includes(' console') ||
    t.includes('controller') ||
    t.includes('headset') ||
    t.includes('charging') ||
    t.includes('dualshock') ||
    t.includes('dualsense') ||
    t.includes('wireless adapter') ||
    t.includes('camera') ||
    t.includes('steering wheel') ||
    t.includes('move motion') ||
    t.includes('playstation move') ||
    t.includes('kinect') ||
    t.includes('memory card') ||
    t.includes('hard drive') ||
    t.includes('joy-con') ||
    t.includes('pro controller') ||
    t.includes(' bundle') ||
    t.includes(' pack') ||
    t.includes('starter kit') ||
    (t.includes(' system') && !t.includes('system shock') && !t.includes('system 3')) ||
    // Switch hardware
    t.includes('nintendo switch with') ||
    t.includes('nintendo switch oled') ||
    t.includes('nintendo switch lite') ||
    t.includes('nintendo switch animal') ||
    // Xbox hardware
    t.includes('xbox series x halo') ||
    t.includes('xbox series x') && t.endsWith('edition') ||
    // PlayStation hardware
    t.includes('playstation 5 slim') ||
    t.includes('playstation portal') ||
    t.includes('ps5 slim') ||
    // Anything ending in "Edition" that looks like a console SKU
    (t.endsWith('limited edition') && !t.includes('zelda')) ||
    (t.endsWith('special edition') && !t.includes('zelda'))
  );
}

/**
 * Parse a PriceCharting console page sorted by popularity.
 * Returns up to `limit` game entries: { title, loosePrice, imageUrl }.
 */
function parsePopularGames(html, limit) {
  const root = parse(html);
  const { hasImageCol, titleIdx, looseIdx } = detectColumns(root);

  const rows = root.querySelectorAll('tr');
  const results = [];

  for (const tr of rows) {
    if (results.length >= limit) break;
    const tds = tr.querySelectorAll('td');
    if (tds.length <= looseIdx) continue;

    // Title
    const titleTd = tds[titleIdx];
    const titleEl = titleTd?.querySelector('a');
    const title = (titleEl?.text ?? titleTd?.text ?? '').trim();
    if (!title) continue;

    // Skip hardware/accessories
    if (isHardware(title)) continue;

    // Loose price
    const looseText = (tds[looseIdx]?.text ?? '').trim();
    const looseMatch = looseText.match(/\$([\d,]+\.?\d*)/);
    if (!looseMatch) continue;
    const loose = parseFloat(looseMatch[1].replace(/,/g, ''));
    if (!Number.isFinite(loose) || loose <= 0) continue;

    // Image (only present if hasImageCol)
    let imageUrl = '';
    if (hasImageCol) {
      const imgTd = tds[0];
      const img = imgTd?.querySelector('img');
      const src = img?.getAttribute('data-src') || img?.getAttribute('src') || '';
      imageUrl = src.startsWith('/') ? `https://www.pricecharting.com${src}` : src;
    }

    // For classic layout (no image col), derive image URL from the title's href slug
    // PriceCharting box art pattern: https://www.pricecharting.com/game/[slug]/[title-slug]
    if (!imageUrl && titleEl) {
      const href = titleEl.getAttribute('href') ?? '';
      if (href) {
        // Image CDN: https://static.pricecharting.com/assets/media/games/[id].jpg
        // We can't resolve without the product ID, so leave blank for classic layout
        imageUrl = '';
      }
    }

    results.push({ title, loosePrice: Math.round(loose), imageUrl });
  }

  return results;
}

/** Escape a CSV cell (quote if it contains comma, quote, or newline). */
function csvCell(v) {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main() {
  console.log('Scraping PriceCharting for top-20 popular games per console...\n');
  mkdirSync(join(__dirname, '..', 'data'), { recursive: true });

  const lines = ['BRAND,CONSOLE,MODEL,PRICE,IMAGE_URL'];

  for (const { label, brand, slugs } of CONSOLES) {
    console.log(`\n=== ${label} ===`);

    const seen = new Set();
    const games = [];

    for (const slug of slugs) {
      const url = `https://www.pricecharting.com/console/${slug}?sort=popular`;
      try {
        const html = await fetchHtml(url);
        const rows = parsePopularGames(html, TOP_N * 3);
        for (const g of rows) {
          const key = g.title.toLowerCase().trim();
          if (seen.has(key)) continue;
          seen.add(key);
          games.push(g);
        }
      } catch (e) {
        console.error(`  ERROR: ${e.message}`);
      }
      if (slugs.indexOf(slug) < slugs.length - 1) await sleep(SLEEP_MS);
    }

    const topGames = games.slice(0, TOP_N);
    console.log(`  → ${topGames.length} games`);

    for (const g of topGames) {
      lines.push([brand, label, g.title, g.loosePrice, g.imageUrl].map(csvCell).join(','));
      console.log(`    ${g.title} — $${g.loosePrice}`);
    }

    await sleep(SLEEP_MS);
  }

  writeFileSync(OUT_PATH, lines.join('\n') + '\n', 'utf8');
  console.log(`\nWrote ${lines.length - 1} rows to ${OUT_PATH}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
