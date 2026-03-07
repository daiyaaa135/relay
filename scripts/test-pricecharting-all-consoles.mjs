#!/usr/bin/env node
/**
 * Test PriceCharting lookup for every console model in data/console.csv.
 * Model sent to API = VARIANT ? "MODEL VARIANT" : MODEL (matches list UI / consoleStorage keys).
 * Run with: node scripts/test-pricecharting-all-consoles.mjs
 * Requires dev server: npm run dev
 */
import { readFileSync } from 'fs';
import { createInterface } from 'readline';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const CSV_PATH = new URL('../data/console.csv', import.meta.url);

function parseCsv(path) {
  const raw = readFileSync(path, 'utf8');
  const lines = raw.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(',');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row = {};
    header.forEach((h, j) => { row[h] = values[j] ?? ''; });
    rows.push(row);
  }
  return rows;
}

function displayModel(row) {
  const { BRAND, MODEL, VARIANT } = row;
  const v = (VARIANT || '').trim();
  if (!v || v === '—' || v === '-') return MODEL;
  return `${MODEL} ${VARIANT}`.trim();
}

async function main() {
  const rows = parseCsv(CSV_PATH);
  const seen = new Set();
  const tests = [];
  for (const row of rows) {
    const brand = row.BRAND?.trim();
    const model = displayModel(row);
    if (!brand || !model) continue;
    const key = `${brand}\t${model}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tests.push({ brand, model });
  }

  console.log(`Testing PriceCharting for ${tests.length} unique console models (all brands)\n`);
  let passed = 0;
  let failed = 0;
  const failures = [];

  for (let i = 0; i < tests.length; i++) {
    const { brand, model } = tests[i];
    if (i > 0) await new Promise((r) => setTimeout(r, 600));
    const label = `${brand} / ${model}`;
    try {
      const res = await fetch(`${BASE}/api/credits/pricecharting-lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, model, condition: 'Good' }),
      });
      const data = await res.json();
      const ok = !data.error && data.credits != null && data.credits > 0;
      if (ok) {
        console.log(`  OK   ${label}  →  ${data.credits} credits`);
        passed++;
      } else {
        const reason = data.error ?? 'no credits';
        console.log(`  FAIL ${label}  →  ${reason}`);
        failures.push({ brand, model, reason });
        failed++;
      }
    } catch (e) {
      console.log(`  ERR  ${label}  →  ${e.message}`);
      failures.push({ brand, model, reason: e.message });
      failed++;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`${passed} passed, ${failed} failed (total ${tests.length})`);
  if (failures.length) {
    console.log('\nFailures (expected for brands without PriceCharting mapping: Xbox, PlayStation, MSI, GPD WIN, Anbernic, Logitech; and Nintendo Game Boy Color):');
    failures.forEach(({ brand, model, reason }) => console.log(`  ${brand} / ${model}: ${reason}`));
  }
  process.exit(failed > 0 ? 1 : 0);
}

main();
