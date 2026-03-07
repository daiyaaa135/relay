#!/usr/bin/env node
/** Test valuation for laptop models that previously failed Swappa & eBay. Run: node scripts/test-failed-laptops.mjs. Requires: npm run dev */
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const FAILED = [
  { brand: 'Acer', model: 'Chromebook 15' },
  { brand: 'Apple', model: 'MacBook Air' },
  { brand: 'Apple', model: 'MacBook Pro' },
  { brand: 'Dell', model: 'XPS Laptop' },
  { brand: 'HP', model: 'Spectre Laptop' },
  { brand: 'Lenovo', model: 'Legion 7i' },
];
async function test(brand, model) {
  const sd = (await (await fetch(BASE + '/api/credits/swappa-lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brand, model, storage: '', condition: 'Good', carrier: '', color: undefined }) })).json());
  if (sd.credits > 0) return { ok: true, credits: sd.credits, source: 'Swappa' };
  const cd = (await (await fetch(BASE + '/api/credits/compare-laptop-prices-lookup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brand, model, condition: 'Good' }) })).json());
  if (cd.credits > 0) return { ok: true, credits: cd.credits, source: 'Compare Laptop Prices' };
  return { ok: false, error: cd.error || sd.error || 'no price' };
}
async function run() {
  console.log('Failed laptop models: Compare Laptop Prices only\n');
  let p = 0, f = 0;
  for (const { brand, model } of FAILED) {
    await new Promise(r => setTimeout(r, 600));
    try {
      const r = await test(brand, model);
      const label = brand + ' / ' + model;
      if (r.ok) { console.log('  OK   ' + label + '  ->  ' + r.credits + ' credits (' + r.source + ')'); p++; }
      else { console.log('  FAIL ' + label + '  ->  ' + r.error); f++; }
    } catch (e) { console.log('  ERR  ' + brand + ' / ' + model + '  ->  ' + e.message); f++; }
  }
  console.log('\n--- ' + p + ' passed, ' + f + ' failed ---');
  process.exit(f > 0 ? 1 : 0);
}
run();
