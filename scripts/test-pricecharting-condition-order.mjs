#!/usr/bin/env node
/**
 * Test that Console and Gaming Handhelds using PriceCharting satisfy:
 *   New >= Mint >= Good >= Fair >= Poor (valuation decreases as condition worsens)
 * Run: node scripts/test-pricecharting-condition-order.mjs
 * Optional: DELAY_BETWEEN_DEVICES_MS=2500 DELAY_BETWEEN_REQUESTS_MS=800 node ...  (to reduce 403 rate limits)
 * Requires: npm run dev (server on localhost:3000)
 *
 * 1. Asserts that condition multipliers (as in pricecharting-lookup route) are in descending order.
 * 2. For each device, calls the API for all 5 conditions; if all succeed, asserts price order.
 *    (403 from PriceCharting = rate limit / block; counted as "could not verify", not failure.)
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

// Must match app/api/credits/pricecharting-lookup/route.ts CONDITION_MULTIPLIER
const EXPECTED_MULTIPLIERS = { New: 0.85, Mint: 0.72, Good: 0.64, Fair: 0.57, Poor: 0.5 };

function assertMultiplierOrder() {
  const vals = CONDITIONS.map((c) => EXPECTED_MULTIPLIERS[c]);
  for (let i = 1; i < vals.length; i++) {
    if (vals[i] > vals[i - 1]) {
      console.error('Condition multipliers must satisfy New >= Mint >= Good >= Fair >= Poor.');
      console.error(EXPECTED_MULTIPLIERS);
      process.exit(1);
    }
  }
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

/** Treat as no variant if blank, dash, or em-dash */
function hasVariant(v) {
  const s = (v ?? '').trim().replace(/\u2014/g, '-');
  return s.length > 0 && s !== '-';
}

/** Dedupe by (brand, model); return list of { brand, model } */
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
    out.push({ brand, model: modelForApi });
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

/** Gaming handhelds CSV has "Switch OLED"; PriceCharting expects "Switch - OLED" */
function modelForApi(brand, model, source) {
  if (source === 'handhelds' && brand === 'Nintendo' && model === 'Switch OLED')
    return 'Switch - OLED';
  return model;
}

async function run() {
  const consolePath = join(__dirname, '..', 'data', 'console.csv');
  const handheldsPath = join(__dirname, '..', 'data', 'gaming-handhelds.csv');

  const consoleRows = parseCsv(consolePath);
  const handheldRows = parseCsv(handheldsPath);

  const consoleDevices = uniqueDevices(consoleRows, 'MODEL', 'BRAND', 'VARIANT');
  const handheldDevices = uniqueDevices(handheldRows).map((d) => ({
    brand: d.brand,
    model: modelForApi(d.brand, d.model, 'handhelds'),
  }));

  const allDevices = [
    ...consoleDevices.map((d) => ({ ...d, category: 'Console' })),
    ...handheldDevices.map((d) => ({ ...d, category: 'Gaming Handhelds' })),
  ];

  assertMultiplierOrder();
  console.log('PriceCharting condition order test: New >= Mint >= Good >= Fair >= Poor\n');
  console.log(`Testing ${allDevices.length} devices (${consoleDevices.length} console, ${handheldDevices.length} handhelds).\n`);

  let passed = 0;
  let orderFailed = 0;
  let apiError = 0;
  const orderFailures = [];
  const apiErrors = [];

  for (const { brand, model, category } of allDevices) {
    const label = `${category}: ${brand} ${model}`;
    const prices = {};
    let hasError = false;
    let firstError = null;
    for (const cond of CONDITIONS) {
      if (DELAY_BETWEEN_REQUESTS_MS > 0) await sleep(DELAY_BETWEEN_REQUESTS_MS);
      const { price, error } = await fetchPrice(brand, model, cond);
      if (error) {
        prices[cond] = null;
        if (!hasError) {
          hasError = true;
          firstError = `condition "${cond}": ${error}`;
        }
      } else {
        prices[cond] = price;
      }
    }

    if (hasError) {
      apiError++;
      apiErrors.push({ label, reason: firstError });
      continue;
    }

    const orderOk =
      prices.New >= prices.Mint &&
      prices.Mint >= prices.Good &&
      prices.Good >= prices.Fair &&
      prices.Fair >= prices.Poor;

    if (orderOk) {
      passed++;
      console.log(`  PASS  ${label}`);
    } else {
      orderFailed++;
      const str = CONDITIONS.map((c) => `${c}=${prices[c]}`).join('  ');
      console.log(`  FAIL  ${label}  →  ${str}`);
      orderFailures.push({ label, prices: { ...prices } });
    }
    if (DELAY_BETWEEN_DEVICES_MS > 0) await sleep(DELAY_BETWEEN_DEVICES_MS);
  }

  console.log('\n--- Summary ---');
  assertMultiplierOrder();
  console.log('Multipliers (in code): New >= Mint >= Good >= Fair >= Poor  OK');
  console.log(`Order verified (API):  ${passed} passed`);
  console.log(`Order wrong (API):     ${orderFailed} failed`);
  console.log(`Could not verify:     ${apiError} (API error e.g. 403 rate limit)`);
  if (orderFailures.length > 0) {
    console.log('\nOrder failures (prices not New>=Mint>=Good>=Fair>=Poor):');
    orderFailures.forEach((f) => {
      console.log(`  ${f.label}  ${JSON.stringify(f.prices)}`);
    });
  }
  if (apiErrors.length > 0 && apiErrors.length <= 10) {
    console.log('\nSample API errors (e.g. 403 = PriceCharting rate limit):');
    apiErrors.slice(0, 5).forEach((e) => console.log(`  ${e.label}: ${e.reason}`));
  } else if (apiErrors.length > 10) {
    console.log(`\n(${apiErrors.length} devices had API errors; run with dev server and no rate limit to verify all.)`);
  }
  process.exit(orderFailed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
