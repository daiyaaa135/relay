#!/usr/bin/env node
/**
 * Test Get Valuation (Swappa + eBay fallback) for every tablet in data/tablet.csv.
 * Builds model string like the list UI: MODEL + SIZE + YEAR when present.
 * Run with: node scripts/test-tablet-valuation.mjs
 * Requires dev server: npm run dev
 */
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const CSV_PATH = path.join(__dirname, '..', 'data', 'tablet.csv');

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

function buildModelForSwappa(model, size, year) {
  const sizeClean = (size ?? '').replace(/"/g, '').trim();
  const yearClean = (year ?? '').trim();
  if (!sizeClean && !yearClean) return model;
  const m = model.match(/^(iPad Pro)\s+(.+)$/i);
  if (m) {
    return [m[1], sizeClean, m[2], yearClean].filter(Boolean).join(' ');
  }
  return [model, sizeClean, yearClean].filter(Boolean).join(' ');
}

async function main() {
  const raw = readFileSync(CSV_PATH, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    console.log('No tablet rows in CSV');
    process.exit(1);
  }

  const header = parseCSVLine(lines[0]);
  const brandIdx = header.findIndex((h) => h.toLowerCase() === 'brand');
  const modelIdx = header.findIndex((h) => h.toLowerCase() === 'model');
  const sizeIdx = header.findIndex((h) => h.toLowerCase() === 'size');
  const yearIdx = header.findIndex((h) => h.toLowerCase() === 'year');
  if (brandIdx < 0 || modelIdx < 0) {
    console.log('CSV missing BRAND or MODEL');
    process.exit(1);
  }

  const tests = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const brand = (cells[brandIdx] ?? '').trim();
    const model = (cells[modelIdx] ?? '').trim();
    const size = sizeIdx >= 0 ? (cells[sizeIdx] ?? '').trim() : '';
    const year = yearIdx >= 0 ? (cells[yearIdx] ?? '').trim() : '';
    if (!brand || !model) continue;
    const modelForSwappa = buildModelForSwappa(model, size, year);
    tests.push({ brand, model: modelForSwappa, label: `${brand} / ${modelForSwappa}` });
  }

  // Dedupe by (brand, model) to avoid hitting same valuation many times
  const seen = new Set();
  const unique = tests.filter((t) => {
    const key = `${t.brand}\t${t.model}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Testing tablet valuation (Swappa → eBay fallback) for ${unique.length} unique tablet models\n`);
  let passed = 0;
  let failed = 0;
  const failures = [];

  for (let i = 0; i < unique.length; i++) {
    const { brand, model, label } = unique[i];
    if (i > 0) await new Promise((r) => setTimeout(r, 500));
    try {
      let credits = null;
      let error = null;
      const sr = await fetch(`${BASE}/api/credits/swappa-lookup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand,
          model,
          storage: '',
          condition: 'Good',
          carrier: '',
          color: undefined,
        }),
      });
      const sd = await sr.json();
      if (!sd.error && sd.credits != null && sd.credits > 0) {
        credits = sd.credits;
      } else {
        error = sd.error ?? 'no Swappa price';
      }
      if (credits != null && credits > 0) {
        console.log(`  OK   ${label}  →  ${credits} credits`);
        passed++;
      } else {
        console.log(`  FAIL ${label}  →  ${error ?? 'no credits'}`);
        failures.push({ label, reason: error });
        failed++;
      }
    } catch (e) {
      console.log(`  ERR  ${label}  →  ${e.message}`);
      failures.push({ label, reason: e.message });
      failed++;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`${passed} passed, ${failed} failed (total ${unique.length})`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach(({ label, reason }) => console.log(`  ${label}: ${reason}`));
  }
  process.exit(failed > 0 ? 1 : 0);
}

main();
