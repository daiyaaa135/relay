#!/usr/bin/env node
/**
 * Test alternative laptop price sources (no API, scrape-only) for models that
 * fail Swappa + eBay valuation. Identifies which sites return pricing.
 *
 * Websites tested (no API, scrape-only, like PriceCharting for games):
 * - Back Market: refurbished marketplace, search shows listing prices.
 *   URL: https://www.backmarket.com/en-us/search?q={query}
 * - UsedPrice.com: used electronics directory by brand/model (can be slow).
 *   URL: https://www.usedprice.com/items/computer/{brand-slug}/ (browse)
 * - Cashkr / Electronics Pricer: bulk-upload or form-based; not per-URL scrape.
 *
 * Run: node scripts/test-laptop-alternative-sources.mjs
 * Optional: BASE_URL=http://localhost:3000 (to get failure list from your API); otherwise uses built-in failure list.
 */
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const DATA_DIR = path.join(__dirname, '..', 'data');
const FETCH_TIMEOUT_MS = 18000;
const DELAY_BETWEEN_REQUESTS_MS = 600;

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

function parseCSVLine(line) {
  const out = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let cell = '';
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') { cell += '"'; i += 2; } else { i++; break; }
        } else { cell += line[i]; i++; }
      }
      out.push(cell);
      if (line[i] === ',') i++;
      continue;
    }
    const comma = line.indexOf(',', i);
    if (comma === -1) { out.push(line.slice(i).trim()); break; }
    out.push(line.slice(i, comma).trim());
    i = comma + 1;
  }
  return out;
}

function loadCSV(filePath, brandKey = 'brand', modelKey = 'model') {
  const raw = readFileSync(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ' ').trim());
  const brandIdx = header.findIndex((h) => h === brandKey);
  const modelIdx = header.findIndex((h) => h === modelKey);
  if (brandIdx < 0 || modelIdx < 0) return [];
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const brand = (cells[brandIdx] ?? '').trim();
    const model = (cells[modelIdx] ?? '').trim();
    if (!brand || !model) continue;
    rows.push({ brand, model });
  }
  return rows;
}

function dedupe(tests) {
  const seen = new Set();
  return tests.filter((t) => {
    const key = `${t.brand}\t${t.model}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Laptops: Compare Laptop Prices only (no Swappa). */
async function testSwappaThenEbay(brand, model) {
  try {
    const cr = await fetch(`${BASE}/api/credits/compare-laptop-prices-lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand, model, condition: 'Good' }),
    });
    const cd = await cr.json();
    return { ok: !cd.error && cd.credits != null && cd.credits > 0 };
  } catch (e) {
    return { ok: false };
  }
}

/** Extract USD prices from HTML (e.g. $199.00, $1,299). */
function extractUsdPrices(html, min = 30, max = 15000) {
  const prices = [];
  for (const m of html.matchAll(/\$[\s]*([\d,]+\.?\d*)/g)) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (Number.isFinite(n) && n >= min && n <= max) prices.push(n);
  }
  return prices;
}

/** Try Back Market search; return array of prices or empty. */
async function fetchBackMarketPrices(brand, model) {
  const query = `${brand} ${model}`.trim();
  const url = `https://www.backmarket.com/en-us/search?q=${encodeURIComponent(query)}`;
  try {
    const brandL = brand.toLowerCase();
    const modelL = model.toLowerCase();
    const prices = [];
    const lines = html.split(/\n/);
    for (const line of lines) {
      if (!line.includes('| $') || !line.includes(brandL) || !line.includes(modelL)) continue;
      for (const m of line.matchAll(/\$[\s]*([\d,]+\.?\d*)/g)) {
        const n = parseFloat(m[1].replace(/,/g, ''));
        if (Number.isFinite(n) && n >= 40 && n <= 15000) prices.push(n);
      }
    }
    if (prices.length > 0) return [...new Set(prices)];
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const html = await res.text();
    return extractUsdPrices(html);
  } catch (e) {
    return [];
  }
}

/** UsedPrice.com: try computer index or brand slug; extract any USD prices. */
async function fetchUsedPricePrices(brand, model) {
  const slug = brand.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!slug) return [];
  const url = `https://www.usedprice.com/items/computer/${slug}/`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const html = await res.text();
    return extractUsdPrices(html);
  } catch (e) {
    return [];
  }
}

/** Gazelle trade-in style: check if they have a laptop category with prices. */
async function fetchGazellePrices(brand, model) {
  const query = `${brand} ${model}`.trim();
  const url = `https://www.gazelle.com/trade-in?search=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const html = await res.text();
    return extractUsdPrices(html);
  } catch (e) {
    return [];
  }
}

async function main() {
  const laptops = dedupe(loadCSV(path.join(DATA_DIR, 'laptop.csv')));
  console.log('Collecting failed laptop models (Swappa + eBay)...');
  const failures = [];
  for (let i = 0; i < laptops.length; i++) {
    const { brand, model } = laptops[i];
    if (i > 0) await new Promise((r) => setTimeout(r, 350));
    const result = await testSwappaThenEbay(brand, model);
    if (!result.ok) failures.push({ brand, model });
  }
  console.log(`Failures: ${failures.length} of ${laptops.length} models.\n`);
  if (failures.length === 0) {
    console.log('No failures; nothing to test against alternative sources.');
    return;
  }

  const sites = [
    { name: 'Back Market', fn: fetchBackMarketPrices },
    { name: 'UsedPrice.com', fn: fetchUsedPricePrices },
    { name: 'Gazelle', fn: fetchGazellePrices },
  ];

  const results = { 'Back Market': 0, 'UsedPrice.com': 0, Gazelle: 0 };
  const bySite = { 'Back Market': [], 'UsedPrice.com': [], Gazelle: [] };

  for (let i = 0; i < failures.length; i++) {
    const { brand, model } = failures[i];
    const label = `${brand} / ${model}`;
    console.log(`[${i + 1}/${failures.length}] ${label}`);
    for (const site of sites) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_REQUESTS_MS));
      const prices = await site.fn(brand, model);
      const hasPrice = prices.length > 0;
      if (hasPrice) {
        results[site.name]++;
        bySite[site.name].push({ label, sample: prices.slice(0, 3) });
      }
      console.log(`  ${site.name}: ${hasPrice ? prices.length + ' prices' : 'no prices'}`);
    }
  }

  console.log('\n--- Summary: which sites return pricing for failed models ---');
  for (const [name, count] of Object.entries(results)) {
    console.log(`  ${name}: ${count}/${failures.length} models returned at least one price`);
    if (bySite[name].length > 0 && bySite[name].length <= 10) {
      bySite[name].forEach(({ label, sample }) => console.log(`    - ${label} e.g. $${sample.join(', $')}`));
    } else if (bySite[name].length > 10) {
      bySite[name].slice(0, 5).forEach(({ label, sample }) => console.log(`    - ${label} e.g. $${sample.join(', $')}`));
      console.log(`    ... and ${bySite[name].length - 5} more`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
