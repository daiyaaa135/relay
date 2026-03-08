#!/usr/bin/env node
/**
 * Test PriceCharting lookup for 10 console models across different brands.
 * Run with: node scripts/test-pricecharting-consoles.mjs
 * Requires dev server: npm run dev (and base URL default localhost:3000)
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000';

const TESTS = [
  { brand: 'Steam', model: 'Deck' },
  { brand: 'Nintendo', model: 'Switch 2' },
  { brand: 'Nintendo', model: 'Switch - OLED' },
  { brand: 'Nintendo', model: 'Wii' },
  { brand: 'Nintendo', model: 'Original 3DS XL' },
  { brand: 'Nintendo', model: 'New 3DS XL' },
  { brand: 'Analogue', model: '3D' },
  { brand: 'Asus ROG', model: 'Ally Handheld Console (original)' },
  { brand: 'Lenovo Legion', model: 'Go 512GB' },
  { brand: 'Arcade1Up', model: 'Counter-Cade' },
];

async function run() {
  console.log('Testing PriceCharting lookup for 10 console models\n');
  let passed = 0;
  let failed = 0;
  for (const { brand, model } of TESTS) {
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
        console.log(`  OK   ${label}  →  ${data.credits} credits ($${data.price ?? data.credits})`);
        passed++;
      } else {
        console.log(`  FAIL ${label}  →  ${data.error ?? 'no credits'}`);
        failed++;
      }
    } catch (e) {
      console.log(`  ERR  ${label}  →  ${e.message}`);
      failed++;
    }
  }
  console.log('\n' + passed + ' passed, ' + failed + ' failed');
  process.exit(failed > 0 ? 1 : 0);
}

run();
