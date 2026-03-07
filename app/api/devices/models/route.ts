import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

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

/** GET /api/devices/models?brand=Apple - returns unique MODEL values for that brand from devices.csv */
export async function GET(request: NextRequest) {
  const brand = (request.nextUrl.searchParams.get('brand') ?? '').trim();
  if (!brand) {
    return Response.json({ models: [] });
  }

  let csvPath: string;
  try {
    csvPath = join(process.cwd(), 'devices.csv');
    await readFile(csvPath, 'utf8');
  } catch {
    return Response.json({ models: [] });
  }

  const raw = await readFile(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return Response.json({ models: [] });

  const header = parseCSVLine(lines[0]);
  const brandIdx = header.findIndex((h) => normalize(h) === 'brand');
  const modelIdx = header.findIndex((h) => normalize(h) === 'model');
  if (brandIdx < 0 || modelIdx < 0) return Response.json({ models: [] });

  const nBrand = normalize(brand);
  const modelSet = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const rowBrand = (cells[brandIdx] ?? '').trim();
    const rowModel = (cells[modelIdx] ?? '').trim();
    if (normalize(rowBrand) === nBrand && rowModel) {
      modelSet.add(rowModel);
    }
  }

  const models = Array.from(modelSet).sort((a, b) => a.localeCompare(b));
  return Response.json({ models });
}
