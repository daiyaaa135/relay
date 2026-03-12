#!/usr/bin/env node
/**
 * Look up prices for all gaming handhelds from Swappa and PriceCharting.
 * Output: table with columns Model, Price from Swappa, Price from PriceCharting.
 * Run: node scripts/gaming-handhelds-dual-source-prices.mjs
 * Requires: npm run dev (server on localhost:3000)
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const CONDITION = 'Good';

// PriceCharting uses "Switch - OLED" but CSV has "Switch OLED"
function modelForPriceCharting(brand, model) {
  if (brand === 'Nintendo' && model === 'Switch OLED') return 'Switch - OLED';
  return model;
}

function parseCsv(path) {
  const text = readFileSync(path, 'utf-8');
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const [header, ...rows] = lines;
  const cols = header.split(',').map((c) => c.trim());
  return rows.map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row = {};
    cols.forEach((c, i) => { row[c] = values[i] ?? ''; });
    return row;
  });
}

async function swappaPrice(brand, model) {
  try {
    const res = await fetch(`${BASE}/api/credits/swappa-lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand, model, condition: CONDITION }),
    });
    const data = await res.json();
    if (data.error) return { price: null, error: data.error };
    return { price: data.price ?? data.credits ?? null, error: null };
  } catch (e) {
    return { price: null, error: e.message };
  }
}

async function priceChartingPrice(brand, model) {
  const pcModel = modelForPriceCharting(brand, model);
  try {
    const res = await fetch(`${BASE}/api/credits/pricecharting-lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand, model: pcModel, condition: CONDITION }),
    });
    const data = await res.json();
    if (data.error) return { price: null, error: data.error };
    return { price: data.price ?? data.credits ?? null, error: null };
  } catch (e) {
    return { price: null, error: e.message };
  }
}

function formatPrice(p) {
  if (p == null) return '—';
  if (typeof p === 'number') return `$${p}`;
  return String(p);
}

async function run() {
  const csvPath = join(__dirname, '..', 'data', 'gaming-handhelds.csv');
  const rows = parseCsv(csvPath);
  const results = [];

  console.log('Fetching prices from Swappa and PriceCharting (condition: Good)…\n');

  for (const row of rows) {
    const brand = row.BRAND || '';
    const model = row.MODEL || '';
    const label = model ? `${brand} ${model}` : brand;

    const [swappa, pc] = await Promise.all([
      swappaPrice(brand, model),
      priceChartingPrice(brand, model),
    ]);

    results.push({
      model: label,
      swappaPrice: swappa.price,
      swappaError: swappa.error,
      pcPrice: pc.price,
      pcError: pc.error,
    });

    const swappaStr = swappa.price != null ? `$${swappa.price}` : (swappa.error || '—');
    const pcStr = pc.price != null ? `$${pc.price}` : (pc.error || '—');
    console.log(`  ${label}  →  Swappa: ${swappaStr}  |  PriceCharting: ${pcStr}`);
  }

  // Build markdown table
  const sep = '|';
  const header = `${sep} Model ${sep} Price from Swappa ${sep} Price from PriceCharting ${sep}`;
  const divider = `${sep}---${sep}---${sep}---${sep}`;
  const body = results
    .map(
      (r) =>
        `${sep} ${r.model} ${sep} ${r.swappaError ? r.swappaError : formatPrice(r.swappaPrice)} ${sep} ${r.pcError ? r.pcError : formatPrice(r.pcPrice)} ${sep}`
    )
    .join('\n');

  console.log('\n\n--- Table (Markdown) ---\n');
  console.log(header);
  console.log(divider);
  console.log(body);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
