#!/usr/bin/env node
/**
 * Look up PriceCharting prices for all consoles under all conditions (New, Mint, Good, Fair, Poor).
 * Output: table with columns Console, New, Mint, Good, Fair, Poor.
 * Run: node scripts/console-prices-all-conditions.mjs
 * Optional: DELAY_BETWEEN_DEVICES_MS=2500 DELAY_BETWEEN_REQUESTS_MS=800 node ...  (to reduce 403s)
 * Requires: npm run dev (server on localhost:3000)
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const DELAY_BETWEEN_DEVICES_MS = Number(process.env.DELAY_BETWEEN_DEVICES_MS) || 0;
const DELAY_BETWEEN_REQUESTS_MS = Number(process.env.DELAY_BETWEEN_REQUESTS_MS) || 0;

const CONDITIONS = ['New', 'Mint', 'Good', 'Fair', 'Poor'];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
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

function hasVariant(v) {
  const s = (v ?? '').trim().replace(/\u2014/g, '-');
  return s.length > 0 && s !== '-';
}

function uniqueDevices(rows, modelKey = 'MODEL', brandKey = 'BRAND', variantKey = 'VARIANT') {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const brand = (r[brandKey] ?? '').trim();
    const model = (r[modelKey] ?? '').trim();
    const variant = (r[variantKey] ?? '').trim();
    const modelForApi = hasVariant(variant) ? `${model} ${variant}`.trim() : model;
    if (!brand || !modelForApi) continue;
    const key = `${brand}\t${modelForApi}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ brand, model: modelForApi, label: `${brand} ${modelForApi}` });
  }
  return out;
}

async function fetchPrice(brand, model, condition) {
  try {
    const res = await fetch(`${BASE}/api/credits/pricecharting-lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand, model, condition }),
    });
    const data = await res.json();
    if (data.error) return { price: null, error: data.error };
    const price = data.price ?? data.credits ?? null;
    return { price: typeof price === 'number' ? price : null, error: null };
  } catch (e) {
    return { price: null, error: e.message };
  }
}

async function run() {
  const consolePath = join(__dirname, '..', 'data', 'console.csv');
  const rows = parseCsv(consolePath);
  const devices = uniqueDevices(rows, 'MODEL', 'BRAND', 'VARIANT');

  console.log('Console prices (PriceCharting) — all conditions\n');
  console.log('Fetching with delays to reduce rate limits…\n');

  const results = [];

  for (const { brand, model, label } of devices) {
    const row = { label, New: null, Mint: null, Good: null, Fair: null, Poor: null };
    for (const cond of CONDITIONS) {
      if (DELAY_BETWEEN_REQUESTS_MS > 0) await sleep(DELAY_BETWEEN_REQUESTS_MS);
      const { price, error } = await fetchPrice(brand, model, cond);
      row[cond] = error ? error : price;
    }
    results.push(row);
    const preview = CONDITIONS.map((c) => (row[c] == null || typeof row[c] === 'string' ? '—' : `$${row[c]}`)).join('  ');
    console.log(`  ${label}  →  ${preview}`);
    if (DELAY_BETWEEN_DEVICES_MS > 0) await sleep(DELAY_BETWEEN_DEVICES_MS);
  }

  const sep = '|';
  const header = [sep, ' Console ', sep, ' New ', sep, ' Mint ', sep, ' Good ', sep, ' Fair ', sep, ' Poor ', sep].join('');
  const divider = [sep, '---', sep, '---', sep, '---', sep, '---', sep, '---', sep, '---', sep].join('');

  const fmt = (v) => {
    if (v == null) return '—';
    if (typeof v === 'string') return v;
    return `$${v}`;
  };

  const body = results
    .map((r) => [sep, ` ${r.label} `, sep, ` ${fmt(r.New)} `, sep, ` ${fmt(r.Mint)} `, sep, ` ${fmt(r.Good)} `, sep, ` ${fmt(r.Fair)} `, sep, ` ${fmt(r.Poor)} `, sep].join(''))
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
