#!/usr/bin/env node
/**
 * Re-test condition order (Poor <= Fair <= Good <= Mint <= New) for the 5 models
 * that previously failed. Laptops: Compare Laptop Prices only; tablets: Swappa only.
 * Run: node scripts/test-condition-order-five.mjs  (dev server: npm run dev)
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const CONDITIONS = ['Poor', 'Fair', 'Good', 'Mint', 'New'];

const MODELS = [
  { brand: 'HP', model: 'Spectre Laptop', label: 'Laptop HP Spectre', isLaptop: true },
  { brand: 'HP', model: 'Envy Laptop', label: 'Laptop HP Envy', isLaptop: true },
  { brand: 'Samsung', model: 'Galaxy Book Ion', label: 'Laptop Samsung Galaxy Book Ion', isLaptop: true },
  { brand: 'Apple', model: 'iPad Pro 12.9 5th Gen 2021', label: 'Tablet Apple iPad Pro 12.9 5th Gen 2021', isLaptop: false },
  { brand: 'Samsung', model: 'Galaxy Tab 4', label: 'Tablet Samsung Galaxy Tab 4', isLaptop: false },
];

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
  console.log('Condition order re-test: Poor <= Fair <= Good <= Mint <= New');
  console.log('Models that previously failed (no eBay; laptops: Swappa → Compare Laptop Prices)\n');

  let passed = 0;
  let failed = 0;

  for (const { brand, model, label, isLaptop } of MODELS) {
    const getCredits = isLaptop ? getCreditsLaptop : getCreditsTablet;
    const creditsByCondition = {};
    const sourceByCondition = {};
    let allOk = true;
    for (const cond of CONDITIONS) {
      const { credits, source } = await getCredits(brand, model, cond);
      creditsByCondition[cond] = credits;
      sourceByCondition[cond] = source ?? '—';
      if (credits == null || credits < 0) allOk = false;
      await new Promise((r) => setTimeout(r, 350));
    }

    const order = checkOrder(creditsByCondition);
    const line = CONDITIONS.map((c) => `${c}=${creditsByCondition[c] ?? '—'}`).join('  ');
    const sources = CONDITIONS.map((c) => sourceByCondition[c]).join(' ');
    if (order.ok && allOk) {
      console.log(`  OK   ${label}`);
      console.log(`       ${line}`);
      console.log(`       sources: ${sources}`);
      passed++;
    } else if (!order.ok) {
      console.log(`  FAIL ${label}`);
      console.log(`       ${line}`);
      console.log(`       sources: ${sources}`);
      console.log(`       Violation: ${order.violation}`);
      failed++;
    } else {
      console.log(`  SKIP ${label} (missing some prices)`);
      console.log(`       ${line}`);
      console.log(`       sources: ${sources}`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Passed: ${passed}, Failed: ${failed}, Skipped: ${MODELS.length - passed - failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
