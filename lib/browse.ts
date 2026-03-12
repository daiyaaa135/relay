import { readFile } from 'fs/promises';
import { join } from 'path';
import { createServerClient } from '@/lib/supabase-server';

export type BrowseDevice = {
  id: string;
  brand: string;
  model: string;
  price: number | null;
  image_url: string | null;
  year?: number | null;
  size?: string | null;
  console?: string | null;
};

export type BrowseResponse = {
  category: string;
  brands: { brand: string; devices: BrowseDevice[] }[];
};

const CATEGORY_TO_CSV: Record<string, string> = {
  Phones: 'phones.csv',
  Laptops: 'data/laptop.csv',
  Tablets: 'data/tablet.csv',
  Headphones: 'data/headphones.csv',
  Speaker: 'data/speaker.csv',
  Console: 'data/console.csv',
  'Video Games': 'data/video-games.csv',
  'MP3': 'data/relics.csv',
  'Gaming Handhelds': 'data/gaming-handhelds.csv',
};

const VIDEO_GAME_CONSOLE_ORDER = [
  'PlayStation 5', 'PlayStation 4', 'Switch 2', 'Switch', 'Xbox Series X|S', 'Xbox One',
];

export const VALID_CATEGORIES = new Set([
  'Phones', 'Laptops', 'Tablets', 'Headphones', 'Speaker', 'Console', 'Video Games', 'MP3', 'Gaming Handhelds',
]);

/** Module-level cache so CSV files are only read once per server instance. */
const csvCache = new Map<string, BrowseDevice[]>();

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
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

function normalize(s: string): string {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeModelKey(model: string): string {
  return normalize(model);
}

async function loadFromCsv(category: string, csvPath: string): Promise<BrowseDevice[]> {
  const raw = await readFile(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCSVLine(lines[0]).map((h) => normalize(h));
  const brandIdx = header.findIndex((h) => h === 'brand');
  const consoleIdx = header.findIndex((h) => h === 'console');
  const modelIdx = header.findIndex((h) => h === 'model');
  const nameCol = modelIdx >= 0 ? modelIdx : consoleIdx;
  const priceIdx = header.findIndex((h) => h === 'price');
  const imageIdx = header.findIndex((h) => h === 'image_url' || h === 'image url');
  const yearIdx = header.findIndex((h) => h === 'year');
  const sizeIdx = header.findIndex((h) => h === 'size');
  if (brandIdx < 0 || nameCol < 0) return [];
  const devices: BrowseDevice[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const brand = (cells[brandIdx] ?? '').trim();
    const model = (cells[nameCol] ?? '').trim();
    if (!brand || !model) continue;
    const consoleName = consoleIdx >= 0 ? (cells[consoleIdx] ?? '').trim() || null : null;
    const price = priceIdx >= 0 && cells[priceIdx] ? parseInt(cells[priceIdx], 10) : null;
    const image_url = imageIdx >= 0 && cells[imageIdx] ? (cells[imageIdx] ?? '').trim() || null : null;
    const year = yearIdx >= 0 && cells[yearIdx] ? parseInt(cells[yearIdx], 10) : null;
    const size = sizeIdx >= 0 && cells[sizeIdx] ? (cells[sizeIdx] ?? '').trim() || null : null;
    devices.push({
      id: `csv-${category}-${i}-${brand}-${model}`,
      brand, model,
      price: Number.isNaN(price as number) ? null : (price as number),
      image_url: image_url || null,
      year: year != null && !Number.isNaN(year) ? year : null,
      size: size || null,
      console: consoleName,
    });
  }
  return devices;
}

function sortBrands(brands: string[]): string[] {
  const set = new Set(brands);
  const apple = set.has('Apple') ? ['Apple'] : [];
  const rest = [...set].filter((b) => b !== 'Apple').sort((a, b) => a.localeCompare(b));
  return [...apple, ...rest];
}

export function canonicalBrandName(brand: string): string {
  const raw = (brand || '').trim();
  if (!raw) return 'Other';
  const lower = raw.toLowerCase();
  const SPECIAL: Record<string, string> = {
    apple: 'Apple', google: 'Google', motorola: 'Motorola', oneplus: 'OnePlus', samsung: 'Samsung',
    acer: 'Acer', asus: 'Asus', dell: 'Dell', hp: 'HP', huawei: 'Huawei', lenovo: 'Lenovo',
    msi: 'MSI', microsoft: 'Microsoft', 'microsoft surface': 'Microsoft Surface', razer: 'Razer',
    thunderobot: 'Thunderobot', beats: 'Beats', bose: 'Bose', 'bowers & wilkins': 'Bowers & Wilkins',
    marshall: 'Marshall', shure: 'Shure', skullcandy: 'Skullcandy', jbl: 'JBL',
    'bang & olufsen': 'Bang & Olufsen', 'harman kardon': 'Harman Kardon', polk: 'Polk', svs: 'SVS',
    sonos: 'Sonos', soundcore: 'Soundcore', tribit: 'TRIBIT', totem: 'Totem',
    'ultimate ears': 'Ultimate Ears', yamaha: 'Yamaha', nintendo: 'Nintendo',
    playstation: 'PlayStation', xbox: 'Xbox', analogue: 'Analogue', arcade1up: 'Arcade1Up',
    'asus rog': 'Asus ROG', 'lenovo legion': 'Lenovo Legion', steam: 'Steam', sega: 'Sega',
  };
  if (SPECIAL[lower]) return SPECIAL[lower];
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function makeListingKey(brand: string, model: string): string {
  return `${canonicalBrandName(brand || 'Other')}||${normalizeModelKey(model || '')}`;
}

function sortDevicesByListingCount(devices: BrowseDevice[], listingCounts: Map<string, number>): BrowseDevice[] {
  if (!devices.length || listingCounts.size === 0) return devices;
  return [...devices].sort((a, b) => {
    const countA = listingCounts.get(makeListingKey(a.brand, a.model)) ?? 0;
    const countB = listingCounts.get(makeListingKey(b.brand, b.model)) ?? 0;
    if (countB !== countA) return countB - countA;
    return a.model.localeCompare(b.model);
  });
}

/** Core data-fetching logic for browse pages — usable from both API routes and Server Components. */
export async function fetchBrowseCategory(category: string): Promise<BrowseResponse | null> {
  if (!VALID_CATEGORIES.has(category)) return null;

  const csvRel = CATEGORY_TO_CSV[category];
  let devices: BrowseDevice[] = [];

  if (csvRel) {
    try {
      if (csvCache.has(category)) {
        devices = csvCache.get(category)!;
      } else {
        const csvPath = join(process.cwd(), csvRel);
        const csvDevices = await loadFromCsv(category, csvPath);
        if (csvDevices.length > 0) {
          csvCache.set(category, csvDevices);
          devices = csvDevices;
        }
      }
    } catch { /* CSV missing or unreadable */ }
  }

  const listingCounts = new Map<string, number>();
  const supabase = createServerClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('gadgets')
      .select('brand, name, category, status')
      .eq('status', 'available')
      .eq('category', category);
    if (!error && data) {
      for (const row of data as { brand: string | null; name: string | null }[]) {
        const key = makeListingKey(row.brand ?? 'Other', row.name ?? '');
        listingCounts.set(key, (listingCounts.get(key) ?? 0) + 1);
      }
    }
  }

  if (category === 'Video Games') {
    const byConsole = new Map<string, BrowseDevice[]>();
    for (const d of devices) {
      const key = d.console || d.brand || 'Other';
      if (!byConsole.has(key)) byConsole.set(key, []);
      byConsole.get(key)!.push(d);
    }
    const orderedKeys = [
      ...VIDEO_GAME_CONSOLE_ORDER.filter((c) => byConsole.has(c)),
      ...[...byConsole.keys()].filter((k) => !VIDEO_GAME_CONSOLE_ORDER.includes(k)),
    ];
    return {
      category,
      brands: orderedKeys.map((consoleName) => ({
        brand: consoleName,
        devices: sortDevicesByListingCount(byConsole.get(consoleName) ?? [], listingCounts),
      })),
    };
  }

  const byBrand = new Map<string, BrowseDevice[]>();
  for (const d of devices) {
    const b = canonicalBrandName(d.brand || 'Other');
    if (!byBrand.has(b)) byBrand.set(b, []);
    byBrand.get(b)!.push(d);
  }
  const sortedBrandNames = sortBrands([...byBrand.keys()]);
  return {
    category,
    brands: sortedBrandNames.map((brand) => ({
      brand,
      devices: sortDevicesByListingCount(byBrand.get(brand) ?? [], listingCounts),
    })),
  };
}
