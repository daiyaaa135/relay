/**
 * Model-specific color options for Headphones, Speakers, and Consoles (from Swappa).
 */

// Headphones - Swappa color data
const HEADPHONE_COLORS: Record<string, string[]> = {
  'AirPods Max': ['Silver', 'Space Gray', 'Sky Blue', 'Green', 'Pink'],
  'AirPods Max USB-C': ['Silver', 'Space Gray', 'Sky Blue', 'Green', 'Pink'],
  'WH-1000XM5': ['Black', 'Navy Blue', 'Silver'],
  'WH-1000XM4': ['Black', 'Silver', 'Midnight Blue'],
  'Studio Pro': ['Black', 'Deep Earth', 'Transparent'],
  'Studio3': ['Black', 'Blue', 'Lux Gray', 'Red', 'White'],
  'Solo 4': ['Black', 'Transparent'],
  'Solo3': ['Black', 'Blue', 'Gold', 'Gray', 'Rose Gold'],
  'QuietComfort Ultra Headphones': ['Black', 'White', 'Smoke'],
  'QuietComfort 35 II': ['Black', 'Silver', 'Rose Gold'],
  'QuietComfort 45': ['Black', 'White', 'Smoke'],
  'Noise Cancelling Headphones 700': ['Black', 'Silver', 'Lux Gray'],
  'Major V On-Ear Headphone': ['Black', 'Cream', 'Brown'],
  'PX8': ['Anthracite', 'Copper'],
  'Atlas Air Headset': ['Black', 'White'],
  'Kraken Wired Headset': ['Black', 'Green', 'Mercury', 'Quartz'],
};

// Speakers - common Swappa colors
const SPEAKER_COLORS: Record<string, string[]> = {
  'Play: 1': ['Black', 'White'],
  'One': ['Black', 'White'],
  'One SL': ['Black', 'White'],
  'SUB': ['Black', 'White'],
  'Sub Mini': ['Black', 'White'],
  'Era 100': ['Black', 'White'],
  'Era 300': ['Black', 'White'],
  'Ray': ['Black', 'White'],
  'Move 2': ['Black', 'Olive', 'Linen'],
  'Wonderboom': ['Black', 'Blue', 'Gray', 'Red'],
  'Wonderboom 2': ['Black', 'Blue', 'Gray', 'Red'],
  'Wonderboom 3': ['Black', 'Blue', 'Gray', 'Red', 'Lavender'],
  'Boom 3': ['Black', 'Blue', 'Gray', 'Red', 'Purple'],
  'MEGABOOM 3': ['Black', 'Blue', 'Gray', 'Red', 'Purple'],
  'Charge 5': ['Black', 'Blue', 'Squad', 'Teal'],
  'Charge 6': ['Black', 'Blue', 'Squad', 'Teal'],
  'Clip 5': ['Black', 'Blue', 'Gray', 'Squad'],
  'Flip 7': ['Black', 'Blue', 'Gray', 'Squad', 'Camouflage'],
  'Soundlink Flex': ['Black', 'Stone', 'White'],
  'Soundlink Revolve 2': ['Black', 'Lux Gray'],
  'SoundLink Revolve Plus II': ['Black', 'Lux Gray'],
  'Soundlink Max': ['Black', 'Blue'],
  'Acton II': ['Black', 'Cream'],
  'Emberton': ['Black', 'Cream'],
  'Willen': ['Black', 'Cream'],
};

// Consoles
const CONSOLE_COLORS: Record<string, string[]> = {
  'Switch': ['Gray', 'Neon Red/Blue', 'White'],
  'Switch 2': ['White', 'Gray'],
  'Switch - OLED': ['White', 'Neon Red/Blue'],
  'Switch Lite': ['Gray', 'Coral', 'Yellow', 'Turquoise', 'Blue'],
  'New 3DS XL': ['Black', 'Red', 'Galaxy', 'Zelda', 'SNES', 'Hyrule', 'Pikachu', 'Solgaleo/Lunala', 'Samus', 'Fire Emblem Fates'],
  'Original 3DS XL': ['Black', 'Blue + Black', 'Zelda Edition [A Link Between Worlds Pre-installed]', 'Silver Mario & Luigi Edition', 'Retro NES Edition'],
  'Wii': ['White', 'Black'],
  'Steam Deck': ['Black'],
  'Deck': ['Black'],
  'Deck OLED Edition': ['Black'],
  'Deck OLED Limited Edition': ['Black'],
  'Deck OLED Limited Edition White': ['White'],
  '3D': ['Black', 'White', 'Funtastic [Clear]', 'Funtastic [Fire]', 'Funtastic [Gold]', 'Funtastic [Grape]', 'Funtastic [Ice]', 'Funtastic [Jungle]', 'Funtastic [Smoke]', 'Funtastic [Watermelon]', 'Extreme Green'],
  'Series X (2020)': ['Black'],
  'Series S (2020)': ['White', 'Black'],
  'One S (2016)': ['White', 'Black'],
  'One X (2017)': ['Black'],
  'One (2013)': ['Black'],
  '5 Standard Edition (2020)': ['White', 'Black'],
  '5 Slim Standard Edition (2023)': ['White', 'Black'],
  '5 Digital Edition (2020)': ['White', 'Black'],
  '5 Slim Digital Edition (2023)': ['White', 'Black'],
  '4 Pro': ['Black'],
  '4 Slim': ['Black'],
  '4': ['Black'],
  'Ally Ally X': ['Black'],
  'Ally Handheld Console (original)': ['Black', 'White'],
};

const DEFAULT_ACCESSORY_COLORS = [
  'Black', 'White', 'Silver', 'Gray', 'Space Gray', 'Blue', 'Red',
  'Graphite', 'Gold', 'Other',
];

function matchModel(entries: Record<string, string[]>, model: string): string[] | undefined {
  const n = model.toLowerCase().trim();
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
 * Returns color options for accessories by category (Headphones, Speaker, Console).
 */
export function getAccessoryColorsForModel(
  category: string,
  brand: string,
  modelName: string
): string[] {
  const model = (modelName || '').trim();
  const cat = category.toLowerCase();

  if (cat === 'headphones') {
    const c = matchModel(HEADPHONE_COLORS, model);
    if (c) return c;
  }
  if (cat === 'speaker') {
    const c = matchModel(SPEAKER_COLORS, model);
    if (c) return c;
  }
  if (cat === 'console' || cat === 'video games') {
    const c = matchModel(CONSOLE_COLORS, model);
    if (c) return c;
  }

  return DEFAULT_ACCESSORY_COLORS;
}
