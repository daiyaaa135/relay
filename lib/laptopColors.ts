/**
 * Model-specific color options for laptops (from Swappa).
 * Maps brand + model patterns to available colors.
 */

// Apple MacBook – Swappa color data
const APPLE_MACBOOK_COLORS: Record<string, string[]> = {
  // MacBook Air
  'MacBook Air 2025 15"': ['Midnight', 'Silver', 'Sky Blue', 'Starlight'],
  'MacBook Air 2025 13"': ['Midnight', 'Silver', 'Sky Blue', 'Starlight'],
  'MacBook Air 2024 15"': ['Midnight', 'Silver', 'Starlight'],
  'MacBook Air 2024 13"': ['Midnight', 'Gray', 'Silver', 'Starlight'],
  'MacBook Air 2023 15"': ['Midnight', 'Starlight', 'Space Gray', 'Silver'],
  'MacBook Air 2022 13"': ['Midnight', 'Starlight', 'Space Gray', 'Silver'],
  'MacBook Air 2020 13"': ['Gold', 'Space Gray', 'Silver'],
  'MacBook Air 2019 13"': ['Gold', 'Space Gray', 'Silver'],
  'MacBook Air 2018 13"': ['Gold', 'Space Gray', 'Silver'],
  'MacBook Air 2017 13"': ['Gold', 'Space Gray', 'Silver'],
  'MacBook Air 2015 13"': ['Gold', 'Silver'],
  'MacBook Air 2015 11"': ['Gold', 'Silver'],
  'MacBook Air 2014 13"': ['Gold', 'Silver'],
  'MacBook Air 2014 11"': ['Gold', 'Silver'],
  'MacBook Air 2012 13"': ['Silver'],
  'MacBook Air 2012 11"': ['Silver'],
  'MacBook Air': ['Gold', 'Space Gray', 'Silver', 'Midnight', 'Starlight'],
  // MacBook Pro
  'MacBook Pro 2025 14"': ['Space Gray', 'Silver'],
  'MacBook Pro 2024 16"': ['Space Gray', 'Silver'],
  'MacBook Pro 2024 14"': ['Space Gray', 'Silver'],
  'MacBook Pro 2023 16"': ['Space Gray', 'Silver'],
  'MacBook Pro 2023 14"': ['Space Gray', 'Silver'],
  'MacBook Pro 2022 13"': ['Space Gray', 'Silver'],
  'MacBook Pro 2021 16"': ['Space Gray', 'Silver'],
  'MacBook Pro 2021 14"': ['Space Gray', 'Silver'],
  'MacBook Pro 2020 13"': ['Space Gray', 'Silver'],
  'MacBook Pro 2019 16"': ['Space Gray', 'Silver'],
  'MacBook Pro 2019 15"': ['Space Gray', 'Silver'],
  'MacBook Pro 2019 13"': ['Space Gray', 'Silver'],
  'MacBook Pro 2018 15"': ['Space Gray', 'Silver'],
  'MacBook Pro 2018 13"': ['Space Gray', 'Silver'],
  'MacBook Pro 2017 15"': ['Space Gray', 'Silver'],
  'MacBook Pro 2017 13"': ['Space Gray', 'Silver'],
  'MacBook Pro 2015 15"': ['Space Gray', 'Silver'],
  'MacBook Pro 2015 13"': ['Space Gray', 'Silver'],
  'MacBook Pro 2014 15"': ['Space Gray', 'Silver'],
  'MacBook Pro 2013 15"': ['Space Gray', 'Silver'],
  'MacBook Pro 2013 13"': ['Space Gray', 'Silver'],
  'MacBook Pro 2012 15"': ['Silver'],
  'MacBook Retina 2017 12"': ['Gold', 'Rose Gold', 'Silver', 'Space Gray'],
  'MacBook Pro': ['Space Gray', 'Silver'],
};

// Other brands – common Swappa-style options
const OTHER_LAPTOP_COLORS: Record<string, string[]> = {
  'Chromebook': ['Black', 'Silver', 'Gray'],
  'ROG': ['Black', 'Gray'],
  'Zephyrus': ['Black', 'Gray', 'White'],
  'Predator': ['Black'],
  'Swift': ['Silver', 'Gray'],
  'XPS': ['Silver', 'Platinum', 'Black'],
  'Inspiron': ['Black', 'Silver'],
  'ThinkPad': ['Black', 'Graphite'],
  'IdeaPad': ['Gray', 'Platinum', 'Abyss Blue'],
  'Yoga': ['Slate Gray', 'Storm Gray'],
  'Surface Laptop': ['Platinum', 'Sage', 'Sandstone', 'Black'],
  'Surface Book': ['Platinum'],
  'Razer Blade': ['Black', 'Mercury'],
};

const DEFAULT_LAPTOP_COLORS = [
  'Black', 'White', 'Silver', 'Space Gray', 'Gray', 'Gold', 'Blue',
  'Graphite', 'Platinum', 'Other',
];

function normalizeModel(s: string): string {
  return s.replace(/\s*-\s*/g, ' ').trim();
}

function matchModel(entries: Record<string, string[]>, model: string): string[] | undefined {
  const n = normalizeModel(model).toLowerCase();
  for (const [key, colors] of Object.entries(entries)) {
    if (n === key.toLowerCase()) return colors;
  }
  for (const [key, colors] of Object.entries(entries)) {
    const k = key.toLowerCase();
    if (n.includes(k) || k.includes(n)) return colors;
  }
  return undefined;
}

/**
 * Returns color options for the given brand and model (Swappa laptop colors).
 */
export function getLaptopColorsForModel(brand: string, modelName: string): string[] {
  const model = (modelName || '').trim();
  if (!model) return DEFAULT_LAPTOP_COLORS;

  const b = brand.toLowerCase();

  if (b.includes('apple')) {
    const c = matchModel(APPLE_MACBOOK_COLORS, model);
    if (c) return c;
  }

  const c = matchModel(OTHER_LAPTOP_COLORS, model);
  if (c) return c;

  return DEFAULT_LAPTOP_COLORS;
}
