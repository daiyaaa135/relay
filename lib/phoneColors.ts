/**
 * Model-specific color options for listing. iPhone colors by model; fallback for other devices.
 */

const IPHONE_MODEL_COLORS: Record<string, string[]> = {
  'iPhone 16 Pro': ['Black', 'White', 'Natural', 'Desert'],
  'iPhone 16 Pro Max': ['Black', 'White', 'Natural', 'Desert'],
  'iPhone 15': ['Black', 'Blue', 'Green', 'Yellow', 'Pink'],
  'iPhone 15 Plus': ['Black', 'Blue', 'Green', 'Yellow', 'Pink'],
  'iPhone 15 Pro': ['Black', 'White', 'Blue', 'Natural'],
  'iPhone 15 Pro Max': ['Black', 'White', 'Blue', 'Natural'],
  'iPhone 14': ['Midnight', 'Starlight', 'Product Red', 'Blue', 'Purple', 'Yellow'],
  'iPhone 14 Plus': ['Midnight', 'Starlight', 'Product Red', 'Blue', 'Purple', 'Yellow'],
  'iPhone 14 Pro': ['Space Black', 'Silver', 'Gold', 'Deep Purple'],
  'iPhone 14 Pro Max': ['Space Black', 'Silver', 'Gold', 'Deep Purple'],
  'iPhone 13': ['Midnight', 'Starlight', 'Product Red', 'Blue', 'Pink', 'Green'],
  'iPhone 13 Mini': ['Midnight', 'Starlight', 'Product Red', 'Blue', 'Pink', 'Green'],
  'iPhone 13 Pro': ['Graphite', 'Gold', 'Silver', 'Blue', 'Green'],
  'iPhone 13 Pro Max': ['Graphite', 'Gold', 'Silver', 'Blue', 'Green'],
};

const SAMSUNG_MODEL_COLORS: Record<string, string[]> = {
  'Galaxy S25': ['Navy Blue', 'Icy Blue', 'Mint', 'Silver Shadow'],
  'Galaxy S25+': ['Navy Blue', 'Icy Blue', 'Mint', 'Silver Shadow'],
  'Galaxy S25 Ultra': ['Black', 'Gray', 'Silverblue', 'Whitesilver', 'Jadegreen'],
  'Galaxy S24': ['Black', 'Gray', 'Orange', 'Violet', 'Yellow'],
  'Galaxy S24+': ['Black', 'Gray', 'Orange', 'Violet', 'Yellow'],
  'Galaxy S24 Ultra': ['Black', 'Gray', 'Green', 'Violet', 'Yellow'],
  'Galaxy S23': ['Black', 'Cream', 'Green', 'Lavender'],
  'Galaxy S23+': ['Black', 'Cream', 'Green', 'Lavender'],
  'Galaxy S23 Ultra': ['Black', 'Cream', 'Green', 'Lavender'],
  'Galaxy S22': ['Black', 'Green', 'Purple', 'Rose Gold', 'White'],
  'Galaxy S22+': ['Black', 'Green', 'Purple', 'Rose Gold', 'White'],
  'Galaxy S22 Ultra': ['Black', 'Burgundy', 'Graphite', 'Green', 'Sky Blue', 'White'],
};

/** Google Pixel colors as shown on Swappa (exact names for filter match). */
const GOOGLE_MODEL_COLORS: Record<string, string[]> = {
  'Pixel 9': ['Obsidian', 'Peony', 'Porcelain', 'Wintergreen'],
  'Pixel 9 Pro': ['Obsidian', 'Porcelain', 'Bay', 'Mint'],
  'Pixel 9 Pro XL': ['Obsidian', 'Porcelain', 'Bay', 'Mint'],
  'Pixel 9a': ['Obsidian', 'Aloe', 'Porcelain', 'Bay'],
  'Pixel 8': ['Hazel', 'Mint', 'Obsidian', 'Rose'],
  'Pixel 8 Pro': ['Bay', 'Mint', 'Obsidian', 'Porcelain'],
  'Pixel 8a': ['Obsidian', 'Aloe', 'Bay', 'Porcelain'],
  'Pixel 7': ['Hazel', 'Lemongrass', 'Obsidian', 'Snow'],
  'Pixel 7 Pro': ['Hazel', 'Obsidian', 'Snow'],
  'Pixel 7a': ['Charcoal', 'Snow', 'Sea', 'Coral'],
  'Pixel 6': ['Black', 'Green', 'Orange', 'Pink', 'Yellow'],
  'Pixel 6 Pro': ['Black', 'Cloudy White', 'Gold', 'Silver', 'Yellow'],
  'Pixel Fold': ['Obsidian', 'Porcelain'],
  'Pixel 9 Pro Fold': ['Obsidian', 'Porcelain'],
  'Pixel 10': ['Obsidian', 'Peony', 'Porcelain', 'Wintergreen'],
  'Pixel 10 Pro': ['Obsidian', 'Porcelain', 'Bay', 'Mint'],
  'Pixel 10 Pro XL': ['Obsidian', 'Porcelain', 'Bay', 'Mint'],
  'Pixel XL': ['Black', 'Blue', 'White'],
};

/** Motorola phone colors as shown on Swappa. */
const MOTOROLA_MODEL_COLORS: Record<string, string[]> = {
  'Edge Plus': ['Gray', 'Purple'],
  'Edge Plus (2022)': ['Gray', 'Purple'],
  'Edge (2024)': ['Black', 'Peacock'],
  'Edge (2025)': ['Black', 'Peacock', 'Sage'],
  'Razr': ['Black', 'Sage Green', 'Slate Blue', 'Viva Magenta'],
  'Razr (2023)': ['Black', 'Sage Green', 'Slate Blue', 'Viva Magenta'],
  'Razr Plus': ['Black', 'Sage Green', 'Slate Blue', 'Viva Magenta'],
  'Razr Plus (2023)': ['Black', 'Sage Green', 'Slate Blue', 'Viva Magenta'],
  'Razr Ultra (2025)': ['Black', 'Sage Green', 'Slate Blue', 'Viva Magenta'],
};

/** OnePlus phone colors as shown on Swappa. */
const ONEPLUS_MODEL_COLORS: Record<string, string[]> = {
  '12': ['Black', 'Green', 'Silver'],
  '12R': ['Black', 'Blue', 'Iron Gray'],
  '15': ['Black', 'Gray', 'Silver'],
};

const DEFAULT_COLORS = [
  'Black', 'White', 'Silver', 'Gold', 'Space Gray', 'Graphite', 'Blue', 'Navy Blue',
  'Green', 'Pink', 'Red', 'Purple', 'Yellow', 'Natural Titanium', 'Other',
];

const STRIP_WORDS = ['titanium', 'sierra', 'alpine'];

/** Removes "titanium", "sierra", "alpine" from color names (e.g. "Natural Titanium" → "Natural"). */
function stripColorWords(color: string): string {
  let s = color;
  for (const word of STRIP_WORDS) {
    s = s.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
  }
  return s.replace(/\s+/g, ' ').trim();
}

function processColors(colors: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of colors) {
    const stripped = stripColorWords(c);
    if (stripped && !seen.has(stripped)) {
      seen.add(stripped);
      result.push(stripped);
    }
  }
  return result;
}

/**
 * Returns color options for the given brand and model (e.g. Apple + "iPhone 16 Pro").
 * Uses model-specific iPhone colors when available; otherwise default list.
 * Strips the words "titanium", "sierra", and "alpine" from color names (e.g. "Natural Titanium" → "Natural").
 */
export function getColorsForModel(brand: string, modelName: string): string[] {
  const model = (modelName || '').trim();
  if (!model) return processColors(DEFAULT_COLORS);

  const n = model.toLowerCase();
  const b = brand.toLowerCase();

  if (b === 'apple') {
    for (const [key, colors] of Object.entries(IPHONE_MODEL_COLORS)) {
      if (n === key.toLowerCase()) return processColors(colors);
    }
  }

  if (b === 'samsung') {
    for (const [key, colors] of Object.entries(SAMSUNG_MODEL_COLORS)) {
      if (n === key.toLowerCase()) return colors; // Samsung colors are already Swappa-compatible, no stripping
    }
  }

  if (b === 'google') {
    for (const [key, colors] of Object.entries(GOOGLE_MODEL_COLORS)) {
      if (n === key.toLowerCase()) return colors;
    }
    // Partial match for variants (e.g. "Pixel 9 Pro Fold")
    for (const [key, colors] of Object.entries(GOOGLE_MODEL_COLORS)) {
      if (n.includes(key.toLowerCase()) || key.toLowerCase().includes(n)) return colors;
    }
  }

  if (b === 'motorola') {
    for (const [key, colors] of Object.entries(MOTOROLA_MODEL_COLORS)) {
      if (n === key.toLowerCase()) return colors;
    }
    for (const [key, colors] of Object.entries(MOTOROLA_MODEL_COLORS)) {
      if (n.includes(key.toLowerCase()) || key.toLowerCase().includes(n)) return colors;
    }
  }

  if (b === 'oneplus' || b === 'one plus') {
    for (const [key, colors] of Object.entries(ONEPLUS_MODEL_COLORS)) {
      if (n === key.toLowerCase()) return colors;
    }
    for (const [key, colors] of Object.entries(ONEPLUS_MODEL_COLORS)) {
      if (n.includes(key.toLowerCase()) || key.toLowerCase().includes(n)) return colors;
    }
  }

  return processColors(DEFAULT_COLORS);
}
