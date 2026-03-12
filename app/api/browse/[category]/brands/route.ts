import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

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

const VIDEO_GAME_CONSOLE_ORDER = [
  'PlayStation 5',
  'PlayStation 4',
  'Switch 2',
  'Switch',
  'Xbox Series X|S',
  'Xbox One',
];

const VALID_CATEGORIES = new Set([
  'Phones', 'Laptops', 'Tablets', 'Headphones', 'Speaker', 'Console', 'Video Games', 'MP3', 'Gaming Handhelds',
]);

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

/** Extract unique brands/consoles from CSV. */
async function loadBrandsFromCsv(category: string, csvPath: string): Promise<string[]> {
  const raw = await readFile(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCSVLine(lines[0]).map((h) => normalize(h));
  const brandIdx = header.findIndex((h) => h === 'brand');
  const consoleIdx = header.findIndex((h) => h === 'console');
  if (brandIdx < 0 && consoleIdx < 0) return [];
  const colIdx = brandIdx >= 0 ? brandIdx : consoleIdx;
  const brandSet = new Set<string>();
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const val = (cells[colIdx] ?? '').trim();
    if (val) brandSet.add(val);
  }
  const list = Array.from(brandSet);
  if (category === 'Video Games') {
    return [
      ...VIDEO_GAME_CONSOLE_ORDER.filter((c) => list.includes(c)),
      ...list.filter((k) => !VIDEO_GAME_CONSOLE_ORDER.includes(k)),
    ];
  }
  return list.includes('Apple') ? ['Apple', ...list.filter((b) => b !== 'Apple').sort()] : list.sort();
}

/** GET /api/browse/[category]/brands - returns unique brands from device catalog (CSV) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  const rawCategory = (await params).category?.trim() || '';
  const category = rawCategory ? decodeURIComponent(rawCategory) : '';
  if (!VALID_CATEGORIES.has(category)) {
    return Response.json({ brands: [] });
  }
  const csvRel = CATEGORY_TO_CSV[category];
  if (!csvRel) return Response.json({ brands: [] });
  try {
    const csvPath = join(process.cwd(), csvRel);
    const brands = await loadBrandsFromCsv(category, csvPath);
    return Response.json({ brands });
  } catch {
    return Response.json({ brands: [] });
  }
}
