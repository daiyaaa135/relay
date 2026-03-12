import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

const VALID_TYPES = ['headphones', 'speaker', 'console'] as const;
type AccessoryType = (typeof VALID_TYPES)[number];

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
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** GET /api/accessories/models?type=headphones&brand=Apple */
export async function GET(request: NextRequest) {
  const type = (request.nextUrl.searchParams.get('type') ?? '').toLowerCase();
  const brand = (request.nextUrl.searchParams.get('brand') ?? '').trim();
  if (!VALID_TYPES.includes(type as AccessoryType) || !brand) {
    return Response.json({ models: [] });
  }

  try {
    const csvPath = join(process.cwd(), 'data', `${type}.csv`);
    const raw = await readFile(csvPath, 'utf8');
    const lines = raw.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return Response.json({ models: [] });

    const header = parseCSVLine(lines[0]);
    const brandIdx = header.findIndex((h) => normalize(h) === 'brand');
    const modelIdx = header.findIndex((h) => normalize(h) === 'model');
    const variantIdx = type === 'console' ? header.findIndex((h) => normalize(h) === 'variant') : -1;
    if (brandIdx < 0 || modelIdx < 0) return Response.json({ models: [] });

    const nBrand = normalize(brand);
    const modelSet = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const cells = parseCSVLine(lines[i]);
      const rowBrand = (cells[brandIdx] ?? '').trim();
      const rowModel = (cells[modelIdx] ?? '').trim();
      if (normalize(rowBrand) !== nBrand || !rowModel) continue;
      const variant = variantIdx >= 0 ? (cells[variantIdx] ?? '').trim() : '';
      const useVariant = variant && variant !== '-' && variant !== '—';
      const displayModel = useVariant ? `${rowModel} ${variant}` : rowModel;
      modelSet.add(displayModel);
    }

    const models = Array.from(modelSet).sort((a, b) => a.localeCompare(b));
    return Response.json({ models });
  } catch {
    return Response.json({ models: [] });
  }
}
