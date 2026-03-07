#!/usr/bin/env node
/**
 * Test that for the same model, credits satisfy: Poor <= Fair <= Good <= Mint <= New.
 * Picks 10 random laptop models and 10 random tablet models, then for each fetches
 * credits for all 5 conditions (Swappa → eBay → Compare Laptop Prices for laptops)
 * and asserts ordering.
 *
 * Run: node scripts/test-condition-order.mjs
 * Requires dev server: npm run dev (BASE_URL defaults to http://localhost:3000)
 */
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const CONDITIONS = ['Poor', 'Fair', 'Good', 'Mint', 'New'];

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

function buildTabletModel(model, size, year) {
  const sizeClean = (size ?? '').replace(/"/g, '').trim();
  const yearClean = (year ?? '').trim();
  if (!sizeClean && !yearClean) return model;
  const m = model.match(/^(iPad Pro)\s+(.+)$/i);
  if (m) {
    return [m[1], sizeClean, m[2], yearClean].filter(Boolean).join(' ');
  }
  return [model, sizeClean, yearClean].filter(Boolean).join(' ');
}

function loadLaptopModels() {
  const raw = readFileSync(path.join(__dirname, '..', 'data', 'laptop.csv'), 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCSVLine(lines[0]);
  const brandIdx = header.findIndex((h) => h.toLowerCase() === 'brand');
  const modelIdx = header.findIndex((h) => h.toLowerCase() === 'model');
  if (brandIdx < 0 || modelIdx < 0) return [];
  const rows = [];
  const seen = new Set();
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const brand = (cells[brandIdx] ?? '').trim();
    const model = (cells[modelIdx] ?? '').trim();
    if (!brand || !model) continue;
    const key = `${brand}\t${model}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ brand, model, label: `Laptop ${brand} ${model}` });
  }
  return rows;
}

function loadTabletModels() {
  const raw = readFileSync(path.join(__dirname, '..', 'data', 'tablet.csv'), 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCSVLine(lines[0]);
  const brandIdx = header.findIndex((h) => h.toLowerCase() === 'brand');
  const modelIdx = header.findIndex((h) => h.toLowerCase() === 'model');
  const sizeIdx = header.findIndex((h) => h.toLowerCase() === 'size');
  const yearIdx = header.findIndex((h) => h.toLowerCase() === 'year');
  if (brandIdx < 0 || modelIdx < 0) return [];
  const rows = [];
  const seen = new Set();
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const brand = (cells[brandIdx] ?? '').trim();
    const model = (cells[modelIdx] ?? '').trim();
    const size = sizeIdx >= 0 ? (cells[sizeIdx] ?? '').trim() : '';
    const year = yearIdx >= 0 ? (cells[yearIdx] ?? '').trim() : '';
    if (!brand || !model) continue;
    const modelForSwappa = buildTabletModel(model, size, year);
    const key = `${brand}\t${modelForSwappa}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ brand, model: modelForSwappa, label: `Tablet ${brand} ${modelForSwappa}` });
  }
  return rows;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Laptops: Compare Laptop Prices only (no Swappa). */
async function getCreditsLaptop(brand, model, condition) {
  const cr = await fetch(`${BASE}/api/credits/compare-laptop-prices-lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand, model, condition }),
  });
  const cd = await cr.json();
  if (!cd.error && cd.credits != null && cd.credits > 0) {
    return { credits: cd.credits, source: 'Compare Laptop Prices' };
  }
  return { credits: null, source: null };
}

async function getCreditsTablet(brand, model, condition) {
  const sr = await fetch(`${BASE}/api/credits/swappa-lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ brand, model, storage: '', condition, carrier: '', color: undefined }),
  });
  const sd = await sr.json();
  if (!sd.error && sd.credits != null && sd.credits > 0) {
    return { credits: sd.credits, source: 'Swappa' };
  }
  return { credits: null, source: null };
}

function checkOrder(creditsByCondition) {
  const values = CONDITIONS.map((c) => creditsByCondition[c] ?? -1);
  for (let i = 1; i < values.length; i++) {
    if (values[i] >= 0 && values[i - 1] >= 0 && values[i] < values[i - 1]) {
      return { ok: false, violation: `${CONDITIONS[i - 1]} (${values[i - 1]}) > ${CONDITIONS[i]} (${values[i]})` };
    }
  }
  return { ok: true };
}

async function main() {
  const laptops = loadLaptopModels();
  const tablets = loadTabletModels();
  const pickLaptops = shuffle(laptops).slice(0, 10);
  const pickTablets = shuffle(tablets).slice(0, 10);
  const models = [...pickLaptops.map((m) => ({ ...m, isLaptop: true })), ...pickTablets.map((m) => ({ ...m, isLaptop: false }))];

  console.log('Condition order test: Poor <= Fair <= Good <= Mint <= New');
  console.log(`Testing ${models.length} models (10 laptop, 10 tablet), 5 conditions each.\n`);

  let passed = 0;
  let failed = 0;
  const failures = [];

  for (let i = 0; i < models.length; i++) {
    const { brand, model, label, isLaptop } = models[i];
    const getCredits = isLaptop ? getCreditsLaptop : getCreditsTablet;
    const creditsByCondition = {};
    let allOk = true;
    for (const cond of CONDITIONS) {
      const { credits } = await getCredits(brand, model, cond);
      creditsByCondition[cond] = credits;
      if (credits == null || credits < 0) allOk = false;
      await new Promise((r) => setTimeout(r, 300));
    }

    const order = checkOrder(creditsByCondition);
    const line = CONDITIONS.map((c) => `${c}=${creditsByCondition[c] ?? '—'}`).join('  ');
    if (order.ok && allOk) {
      console.log(`  OK   ${label}`);
      console.log(`       ${line}`);
      passed++;
    } else if (!order.ok) {
      console.log(`  FAIL ${label}`);
      console.log(`       ${line}`);
      console.log(`       Violation: ${order.violation}`);
      failures.push({ label, creditsByCondition: { ...creditsByCondition }, violation: order.violation });
      failed++;
    } else {
      console.log(`  SKIP ${label} (missing some prices)`);
      console.log(`       ${line}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Passed: ${passed}, Failed: ${failed}, Skipped: ${models.length - passed - failed}`);
  if (failures.length) {
    console.log('\nViolations (Poor < Fair < Good < Mint < New):');
    failures.forEach(({ label, violation }) => console.log(`  ${label}: ${violation}`));
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
