import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export type SearchDevice = {
  id: string;
  category: string;
  brand: string;
  model: string;
  /** Storage/size variant (e.g. "128GB", "13\"") */
  size?: string | null;
  image_url: string | null;
  /** Display: "Brand Model" e.g. "Apple iPhone 15" */
  name: string;
};

const CATEGORY_TO_CSV: Record<string, string> = {
  Phones: 'phones.csv',
  Laptops: 'data/laptop.csv',
  Tablets: 'data/tablet.csv',
  Headphones: 'data/headphones.csv',
  Speaker: 'data/speaker.csv',
  Console: 'data/console.csv',
  'Video Games': 'data/video-games.csv',
  MP3: 'data/relics.csv',
  'Gaming Handhelds': 'data/gaming-handhelds.csv',
};

const VALID_CATEGORIES = Object.keys(CATEGORY_TO_CSV);

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
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

function normalize(s: string): string {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

async function loadFromCsv(category: string, csvPath: string): Promise<SearchDevice[]> {
  const raw = await readFile(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCSVLine(lines[0]).map((h) => normalize(h));
  const brandIdx = header.findIndex((h) => h === 'brand');
  const consoleIdx = header.findIndex((h) => h === 'console');
  const modelIdx = header.findIndex((h) => h === 'model');
  const nameCol = modelIdx >= 0 ? modelIdx : consoleIdx;
  const imageIdx = header.findIndex((h) => h === 'image_url' || h === 'image url');
  const sizeIdx = header.findIndex((h) => h === 'size');
  if (brandIdx < 0 || nameCol < 0) return [];
  const devices: SearchDevice[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const brand = (cells[brandIdx] ?? '').trim();
    const model = (cells[nameCol] ?? '').trim();
    if (!brand || !model) continue;
    const image_url = imageIdx >= 0 && cells[imageIdx] ? (cells[imageIdx] ?? '').trim() || null : null;
    const size = sizeIdx >= 0 && cells[sizeIdx] ? (cells[sizeIdx] ?? '').trim() || null : null;
    devices.push({
      id: `csv-${category}-${i}-${brand}-${model}`,
      category,
      brand,
      model,
      size: size || null,
      image_url: image_url || null,
      name: `${brand} ${model}`,
    });
  }
  return devices;
}

/** Load all devices from all category CSVs. */
async function loadAllDevices(): Promise<SearchDevice[]> {
  const all: SearchDevice[] = [];
  for (const category of VALID_CATEGORIES) {
    const csvRel = CATEGORY_TO_CSV[category];
    try {
      const csvPath = join(process.cwd(), csvRel);
      const devices = await loadFromCsv(category, csvPath);
      all.push(...devices);
    } catch {
      // CSV missing or unreadable
    }
  }
  return all;
}

/** Filter devices by query (name, brand, model, size). */
function filterDevices(devices: SearchDevice[], query: string): SearchDevice[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  return devices.filter(
    (d) =>
      d.name.toLowerCase().includes(q) ||
      d.brand.toLowerCase().includes(q) ||
      d.model.toLowerCase().includes(q) ||
      (d.size ?? '').toLowerCase().includes(q)
  );
}

/** Rank by score: exact/start match > partial match. */
function rankResults(results: SearchDevice[], query: string): SearchDevice[] {
  const q = query.toLowerCase().trim();
  if (!q) return results;
  return [...results].sort((a, b) => {
    const aName = a.name.toLowerCase();
    const bName = b.name.toLowerCase();
    const aStarts = aName.startsWith(q) ? 1 : 0;
    const bStarts = bName.startsWith(q) ? 1 : 0;
    if (aStarts !== bStarts) return bStarts - aStarts;
    const aExact = aName === q ? 1 : 0;
    const bExact = bName === q ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;
    return aName.localeCompare(bName);
  });
}

const TOP_N = 8;

/** GET /api/devices/search?q=iphone - returns filtered devices for search dropdown. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
  const devices = await loadAllDevices();
  const filtered = filterDevices(devices, q);
  const ranked = rankResults(filtered, q);
  const top = ranked.slice(0, TOP_N);
  return Response.json({ devices: top });
}
