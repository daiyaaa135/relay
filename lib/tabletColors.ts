/**
 * Model-specific color options for tablets (from Swappa).
 * Maps brand + model patterns to available colors.
 */

// Apple iPad – Swappa color data
const APPLE_IPAD_COLORS: Record<string, string[]> = {
  // iPad Air 11" (M2) 2024, iPad Air 13" (M2) 2024
  'iPad Air (M2)': ['Blue', 'Gray', 'Purple', 'Starlight'],
  'iPad Air (M3)': ['Blue', 'Gray', 'Purple', 'Starlight'],
  'iPad Air 4th Gen': ['Sky Blue', 'Green', 'Rose Gold', 'Silver'],
  'iPad Air 5th Gen': ['Blue', 'Pink', 'Purple', 'Starlight'],
  'iPad Air 3rd Gen': ['Space Gray', 'Gold', 'Silver'],
  'iPad Air 2': ['Space Gray', 'Gold', 'Silver'],
  'iPad Air': ['Space Gray', 'Silver'],
  // iPad Pro
  'iPad Pro (M4)': ['Silver', 'Space Gray'],
  'iPad Pro (M5)': ['Silver', 'Space Gray'],
  'iPad Pro 6th Gen': ['Silver', 'Space Gray'],
  'iPad Pro 5th Gen': ['Silver', 'Space Gray'],
  'iPad Pro 4th Gen': ['Silver', 'Space Gray'],
  'iPad Pro 3rd Gen': ['Silver', 'Space Gray'],
  'iPad Pro 2nd Gen': ['Silver', 'Space Gray'],
  'iPad Pro 1st Gen': ['Silver', 'Space Gray', 'Gold'],
  'iPad Pro': ['Silver', 'Space Gray'],
  // iPad standard
  'iPad 11th Gen': ['Blue', 'Pink', 'Silver', 'Yellow'],
  'iPad 10th Gen': ['Blue', 'Pink', 'Silver', 'Yellow'],
  'iPad 9th Gen': ['Space Gray', 'Silver'],
  'iPad 8th Gen': ['Space Gray', 'Silver', 'Gold'],
  'iPad 7th Gen': ['Space Gray', 'Silver', 'Gold'],
  'iPad 6th Gen': ['Space Gray', 'Silver', 'Gold'],
  'iPad 5th Gen': ['Space Gray', 'Silver', 'Gold'],
  'iPad 4': ['Black', 'White'],
  // iPad Mini
  'iPad Mini 7th Gen': ['Purple', 'Pink', 'Starlight', 'Space Gray'],
  'iPad Mini 6th Gen': ['Purple', 'Pink', 'Starlight', 'Space Gray'],
  'iPad Mini 5th Gen': ['Space Gray', 'Gold', 'Silver', 'Pink'],
  'iPad Mini 4': ['Space Gray', 'Gold', 'Silver'],
  'iPad Mini 3': ['Space Gray', 'Gold', 'Silver'],
  'iPad Mini 2 Retina': ['Space Gray', 'Silver'],
  'iPad Mini': ['Space Gray', 'Silver'],
};

// Samsung Galaxy Tab – Swappa
const SAMSUNG_TAB_COLORS: Record<string, string[]> = {
  'Galaxy Tab S11 Ultra': ['Graphite', 'Silver'],
  'Galaxy Tab S11': ['Graphite', 'Silver'],
  'Galaxy Tab S10 Ultra': ['Graphite', 'Silver'],
  'Galaxy Tab S10 Plus': ['Graphite', 'Silver'],
  'Galaxy Tab S10 FE': ['Graphite', 'Silver'],
  'Galaxy Tab S9 Ultra': ['Beige', 'Graphite'],
  'Galaxy Tab S9 Plus': ['Beige', 'Graphite'],
  'Galaxy Tab S9 Plus FE': ['Graphite', 'Lavender'],
  'Galaxy Tab S9 FE': ['Graphite', 'Lavender', 'Silver'],
  'Galaxy Tab S9': ['Beige', 'Graphite'],
  'Galaxy Tab S8 Ultra': ['Graphite', 'Silver'],
  'Galaxy Tab S8 Plus': ['Graphite', 'Silver', 'Pink Gold'],
  'Galaxy Tab S8': ['Graphite', 'Silver', 'Pink Gold'],
  'Galaxy Tab S7 Plus': ['Mystic Black', 'Mystic Bronze'],
  'Galaxy Tab S7 FE': ['Mystic Black', 'Mystic Green', 'Mystic Pink'],
  'Galaxy Tab S7': ['Mystic Black', 'Mystic Bronze'],
  'Galaxy Tab S6 Lite': ['Oxford Gray', 'Angora Blue', 'Chiffon Rose'],
  'Galaxy Tab S6': ['Mountain Gray', 'Cloud Blue', 'Rose Blush'],
  'Galaxy Tab S5e': ['Black', 'Gold', 'Silver', 'Gray'],
  'Galaxy Tab S4': ['Black', 'Gray'],
  'Galaxy Tab S2': ['Black', 'Gray', 'Gold'],
  'Galaxy Tab S': ['Black', 'White'],
  'Galaxy Tab A9 Plus': ['Graphite', 'Denim'],
  'Galaxy Tab A9': ['Graphite', 'Gray'],
  'Galaxy Tab A7': ['Dark Gray', 'Gold'],
  'Galaxy Tab A7 Lite': ['Gray', 'Silver'],
  'Galaxy Tab A': ['Black', 'Silver'],
  'Galaxy Tab E': ['Black', 'White'],
  'Galaxy Tab Active3': ['Black'],
  'Galaxy Tab Active2': ['Black'],
  'Galaxy Tab 4': ['Black', 'White'],
  'Galaxy View': ['Black'],
};

// Microsoft Surface
const MICROSOFT_SURFACE_COLORS: Record<string, string[]> = {
  'Go 3': ['Platinum', 'Matte Black'],
  'Go 2': ['Platinum', 'Matte Black'],
  'Go': ['Platinum'],
  '3': ['Silver'],
};

// Amazon
const AMAZON_TAB_COLORS: Record<string, string[]> = {
  'Kindle Scribe': ['Black'],
  'Kindle Scribe (2nd Gen)': ['Black'],
  'Kindle Paperwhite': ['Black', 'Agave Green', 'Denim', 'Sage'],
  'Kindle Oasis': ['Graphite', 'Champagne Gold'],
  'Kindle Fire HD': ['Black', 'Denim', 'Plum'],
  'Kindle Colorsoft': ['Black'],
  'Fire HD 10': ['Black', 'Denim', 'Lilac'],
  'Fire HD 10 Kids Pro': ['Black', 'Happiness', 'Magic', 'Universe'],
  'Fire 7': ['Black', 'Denim', 'Lilac'],
};

// Google
const GOOGLE_TAB_COLORS: Record<string, string[]> = {
  'Pixel Slate': ['Midnight Blue', 'Silver'],
  'Pixel Tablet': ['Haze', 'Porcelain', 'Rose'],
};

// reMarkable
const REMARKABLE_COLORS: Record<string, string[]> = {
  '2': ['Black'],
  'Paper Pro': ['Black'],
};

// Wacom
const WACOM_TAB_COLORS: Record<string, string[]> = {
  'Cintiq 16 Creative Pen Display Drawing Tablet': ['Black'],
};

// Fallback when brand/model has no specific colors
const DEFAULT_TABLET_COLORS = [
  'Black', 'White', 'Silver', 'Space Gray', 'Gray', 'Gold', 'Blue',
  'Graphite', 'Other',
];

function matchModel(entries: Record<string, string[]>, model: string): string[] | undefined {
  const n = model.toLowerCase().trim();
  // Exact match first
  for (const [key, colors] of Object.entries(entries)) {
    if (n === key.toLowerCase()) return colors;
  }
  // Partial match: model contains key or key contains model
  for (const [key, colors] of Object.entries(entries)) {
    const k = key.toLowerCase();
    if (n.includes(k) || k.includes(n)) return colors;
  }
  return undefined;
}

/**
 * Returns color options for the given brand and model (Swappa tablet colors).
 */
export function getTabletColorsForModel(brand: string, modelName: string): string[] {
  const model = (modelName || '').trim();
  if (!model) return DEFAULT_TABLET_COLORS;

  const b = brand.toLowerCase();

  if (b.includes('apple')) {
    const c = matchModel(APPLE_IPAD_COLORS, model);
    if (c) return c;
  }
  if (b.includes('samsung')) {
    const c = matchModel(SAMSUNG_TAB_COLORS, model);
    if (c) return c;
  }
  if (b.includes('microsoft') || b.includes('surface')) {
    const c = matchModel(MICROSOFT_SURFACE_COLORS, model);
    if (c) return c;
  }
  if (b.includes('amazon')) {
    const c = matchModel(AMAZON_TAB_COLORS, model);
    if (c) return c;
  }
  if (b.includes('google')) {
    const c = matchModel(GOOGLE_TAB_COLORS, model);
    if (c) return c;
  }
  if (b.includes('remarkable')) {
    const c = matchModel(REMARKABLE_COLORS, model);
    if (c) return c;
  }
  if (b.includes('wacom')) {
    const c = matchModel(WACOM_TAB_COLORS, model);
    if (c) return c;
  }

  return DEFAULT_TABLET_COLORS;
}
