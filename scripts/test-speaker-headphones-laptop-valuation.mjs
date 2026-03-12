#!/usr/bin/env node
/**
 * Test Get Valuation for all Speaker, Headphones, and Laptop models.
 * - Speaker & Headphones: HiFi Shark (base avg × condition multiplier).
 * - Laptops: Swappa first, then eBay fallback.
 * Run with: node scripts/test-speaker-headphones-laptop-valuation.mjs
 * Requires dev server: npm run dev
 */
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const DATA_DIR = path.join(__dirname, '..', 'data');

function parseCSVLine(line) {
  const out = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let cell = '';
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') {
            cell += '"';
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          cell += line[i];
          i++;
        }
      }
      out.push(cell);
      if (line[i] === ',') i++;
      continue;
    }
    const comma = line.indexOf(',', i);
    if (comma === -1) {
      out.push(line.slice(i).trim());
      break;
    }
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

async function testHifiShark(brand, model) {
  const res = await fetch(`${BASE}/api/credits/hifishark-lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand, model, condition: 'Good' }),
  });
  const data = await res.json();
  const ok = !data.error && data.credits != null && data.credits > 0;
  return { ok, credits: data.credits, price: data.price, error: data.error };
}

/** Laptops: Compare Laptop Prices only (no Swappa). */
async function testSwappaThenEbayThenCompareLaptopPrices(brand, model) {
  const cr = await fetch(`${BASE}/api/credits/compare-laptop-prices-lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand, model, condition: 'Good' }),
  });
  const cd = await cr.json();
  const ok = !cd.error && cd.credits != null && cd.credits > 0;
  return { ok, credits: cd.credits, error: ok ? null : (cd.error ?? 'no price') };
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

async function run() {
  const headphones = dedupe(loadCSV(path.join(DATA_DIR, 'headphones.csv')));
  const speaker = dedupe(loadCSV(path.join(DATA_DIR, 'speaker.csv')));
  const laptop = dedupe(loadCSV(path.join(DATA_DIR, 'laptop.csv')));

  let totalPass = 0;
  let totalFail = 0;
  const failures = [];

  const runCategory = async (name, tests, testFn) => {
    console.log(`\n--- ${name} (${tests.length} models) ---\n`);
    for (let i = 0; i < tests.length; i++) {
      const { brand, model } = tests[i];
      if (i > 0) await new Promise((r) => setTimeout(r, 400));
      const label = `${brand} / ${model}`;
      try {
        const result = await testFn(brand, model, label);
        if (result.ok) {
          console.log(`  OK   ${label}  →  ${result.credits} credits`);
          totalPass++;
        } else {
          console.log(`  FAIL ${label}  →  ${result.error ?? 'no credits'}`);
          failures.push({ category: name, label, reason: result.error });
          totalFail++;
        }
      } catch (e) {
        console.log(`  ERR  ${label}  →  ${e.message}`);
        failures.push({ category: name, label, reason: e.message });
        totalFail++;
      }
    }
  };

  await runCategory('Speaker', speaker, async (brand, model) => testHifiShark(brand, model));
  await runCategory('Headphones', headphones, async (brand, model) => testHifiShark(brand, model));
  await runCategory('Laptops', laptop, async (brand, model) => testSwappaThenEbayThenCompareLaptopPrices(brand, model));

  console.log('\n--- Summary ---');
  console.log(`${totalPass} passed, ${totalFail} failed (total ${totalPass + totalFail})`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach(({ category, label, reason }) => console.log(`  [${category}] ${label}: ${reason}`));
  }
  process.exit(totalFail > 0 ? 1 : 0);
}

run();
