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

/** GET /api/accessories/brands?type=headphones|speaker|console */
export async function GET(request: NextRequest) {
  const type = (request.nextUrl.searchParams.get('type') ?? '').toLowerCase();
  if (!VALID_TYPES.includes(type as AccessoryType)) {
    return Response.json({ brands: [] });
  }

  try {
    const csvPath = join(process.cwd(), 'data', `${type}.csv`);
    const raw = await readFile(csvPath, 'utf8');
    const lines = raw.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return Response.json({ brands: [] });

    const header = parseCSVLine(lines[0]);
    const brandIdx = header.findIndex((h) => normalize(h) === 'brand');
    if (brandIdx < 0) return Response.json({ brands: [] });

    const brandSet = new Set<string>();
    for (let i = 1; i < lines.length; i++) {
      const cells = parseCSVLine(lines[i]);
      const b = (cells[brandIdx] ?? '').trim();
      if (b) brandSet.add(b);
    }

    const brands = Array.from(brandSet).sort((a, b) => a.localeCompare(b));
    return Response.json({ brands });
  } catch {
    return Response.json({ brands: [] });
  }
}
