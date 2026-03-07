#!/usr/bin/env node
/**
 * Empirical condition multipliers from Swappa:
 * - Pick 80 random models (laptops + tablets)
 * - Get Swappa valuation for Poor, Fair, Good, Mint, New (avgPrice + count from API)
 * - Keep only conditions with MIN_LISTINGS+ listings (default 5; set MIN_LISTINGS=2 or 3 for larger sample)
 * - Filter to models where ordering holds: Poor < Fair < Good < Mint <= New (Swappa uses same page for Mint/New)
 * - Normalize each condition price by Good (Good = 1.00), average across passing models
 *
 * Run: node scripts/test-empirical-multipliers.mjs
 *       MIN_LISTINGS=3 node scripts/test-empirical-multipliers.mjs
 * Requires: npm run dev (BASE_URL defaults to http://localhost:3000)
 */
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const CONDITIONS = ['Poor', 'Fair', 'Good', 'Mint', 'New'];
const MIN_LISTINGS = parseInt(process.env.MIN_LISTINGS || '1', 10) || 1;

function parseCSVLine(line) {
  const out = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let cell = '';
      i++;
      while (i < line.length) {
        if (line[i] === '"') {
          if (line[i + 1] === '"') { cell += '"'; i += 2; }
          else { i++; break; }
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

function buildTabletModel(model, size, year) {
  const sizeClean = (size ?? '').replace(/"/g, '').trim();
  const yearClean = (year ?? '').trim();
  if (!sizeClean && !yearClean) return model;
  const m = model.match(/^(iPad Pro)\s+(.+)$/i);
  if (m) return [m[1], sizeClean, m[2], yearClean].filter(Boolean).join(' ');
  return [model, sizeClean, yearClean].filter(Boolean).join(' ');
}

function loadLaptopModels() {
  const raw = readFileSync(path.join(__dirname, '..', 'data', 'laptop.csv'), 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCSVLine(lines[0]);
  const bi = header.findIndex((h) => h.toLowerCase() === 'brand');
  const mi = header.findIndex((h) => h.toLowerCase() === 'model');
  if (bi < 0 || mi < 0) return [];
  const seen = new Set();
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const c = parseCSVLine(lines[i]);
    const brand = (c[bi] ?? '').trim();
    const model = (c[mi] ?? '').trim();
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
  const bi = header.findIndex((h) => h.toLowerCase() === 'brand');
  const mi = header.findIndex((h) => h.toLowerCase() === 'model');
  const si = header.findIndex((h) => h.toLowerCase() === 'size');
  const yi = header.findIndex((h) => h.toLowerCase() === 'year');
  if (bi < 0 || mi < 0) return [];
  const seen = new Set();
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const c = parseCSVLine(lines[i]);
    const brand = (c[bi] ?? '').trim();
    const model = (c[mi] ?? '').trim();
    const size = si >= 0 ? (c[si] ?? '').trim() : '';
    const year = yi >= 0 ? (c[yi] ?? '').trim() : '';
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

async function fetchSwappaCondition(brand, model, condition) {
  try {
    const res = await fetch(`${BASE}/api/credits/swappa-lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand, model, storage: '', condition, carrier: '', color: undefined }),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return { avgPrice: null, count: 0 };
    }
    if (data.error || data.avgPrice == null || data.count == null) {
      return { avgPrice: null, count: 0 };
    }
    return { avgPrice: data.avgPrice, count: data.count };
  } catch (e) {
    return { avgPrice: null, count: 0 };
  }
}

/** Strict except Mint <= New (Swappa uses same "mint" page for both). */
function strictOrder(prices) {
  const order = ['Poor', 'Fair', 'Good', 'Mint', 'New'];
  for (let i = 1; i < order.length; i++) {
    const a = prices[order[i - 1]];
    const b = prices[order[i]];
    if (a != null && b != null) {
      if (i < order.length - 1) {
        if (a >= b) return false;
      } else {
        if (a > b) return false;
      }
    }
  }
  return true;
}

async function main() {
  const laptops = loadLaptopModels();
  const tablets = loadTabletModels();
  const combined = shuffle([...laptops, ...tablets]).slice(0, 80);

  console.log(`Empirical condition multipliers (Swappa only, ${MIN_LISTINGS}+ listings per condition)`);
  console.log(`Testing ${combined.length} random models (laptops + tablets)\n`);

  const passing = [];
  let tested = 0;
  let skippedLowCount = 0;
  let failedOrder = 0;

  for (const { brand, model, label } of combined) {
    const byCond = {};
    let skip = false;
    for (const cond of CONDITIONS) {
      const { avgPrice, count } = await fetchSwappaCondition(brand, model, cond);
      if (count < MIN_LISTINGS) skip = true;
      byCond[cond] = count >= MIN_LISTINGS ? avgPrice : null;
      await new Promise((r) => setTimeout(r, 320));
    }
    tested++;
    if (skip) {
      skippedLowCount++;
      continue;
    }
    const allPresent = CONDITIONS.every((c) => byCond[c] != null);
    if (!allPresent) continue;
    if (!strictOrder(byCond)) {
      failedOrder++;
      continue;
    }
    passing.push({ label, brand, model, prices: { ...byCond } });
    if (passing.length % 10 === 0 && passing.length > 0) {
      console.log(`  ... ${passing.length} models pass (tested ${tested})`);
    }
  }

  console.log(`  Skipped (condition with <${MIN_LISTINGS} listings): ${skippedLowCount}`);
  console.log(`  Had ${MIN_LISTINGS}+ all conditions but failed ordering: ${failedOrder}`);

  console.log(`\nModels with strict ordering (Poor < Fair < Good < Mint <= New) and ${MIN_LISTINGS}+ listings: ${passing.length}`);
  if (passing.length > 0 && passing.length <= 15) {
    passing.forEach(({ label }) => console.log(`  - ${label}`));
  }

  if (passing.length === 0) {
    console.log('No passing models; cannot compute empirical multipliers.');
    process.exit(1);
  }

  const sumMultipliers = { Poor: 0, Fair: 0, Good: 0, Mint: 0, New: 0 };
  for (const { prices } of passing) {
    const goodPrice = prices.Good;
    if (!goodPrice || goodPrice <= 0) continue;
    for (const c of CONDITIONS) {
      sumMultipliers[c] += prices[c] / goodPrice;
    }
  }

  const n = passing.length;
  const empirical = {
    Poor: sumMultipliers.Poor / n,
    Fair: sumMultipliers.Fair / n,
    Good: sumMultipliers.Good / n,
    Mint: sumMultipliers.Mint / n,
    New: sumMultipliers.New / n,
  };

  console.log('\n--- Empirical multipliers (normalized to Good = 1.00) ---');
  for (const c of CONDITIONS) {
    console.log(`  ${c.padEnd(6)} ${empirical[c].toFixed(4)}`);
  }
  console.log('\n(Good = 1.00 by construction)');
  console.log(`Based on ${n} models.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
