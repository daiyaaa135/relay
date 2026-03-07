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

/** GET /api/tablets/options?brand=Apple&model=iPad%20Pro&year=2024 - returns unique year, size for that brand+model (size filtered by year when provided) from data/tablet.csv */
export async function GET(request: NextRequest) {
  const brand = (request.nextUrl.searchParams.get('brand') ?? '').trim();
  const model = (request.nextUrl.searchParams.get('model') ?? '').trim();
  const year = (request.nextUrl.searchParams.get('year') ?? '').trim();

  const result = { year: [] as string[], size: [] as string[] };
  if (!brand) return Response.json(result);

  try {
    const csvPath = join(process.cwd(), 'data', 'tablet.csv');
    const raw = await readFile(csvPath, 'utf8');
    const lines = raw.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return Response.json(result);

    const header = parseCSVLine(lines[0]);
    const brandIdx = header.findIndex((h) => normalize(h) === 'brand');
    const modelIdx = header.findIndex((h) => normalize(h) === 'model');
    const yearIdx = header.findIndex((h) => normalize(h) === 'year');
    const sizeIdx = header.findIndex((h) => normalize(h) === 'size');
    if (brandIdx < 0) return Response.json(result);

    const nBrand = normalize(brand);
    const nModel = model ? normalize(model) : '';
    const nYear = year ? year.trim() : '';
    const yearSet = new Set<string>();
    const sizeSet = new Set<string>();

    for (let i = 1; i < lines.length; i++) {
      const cells = parseCSVLine(lines[i]);
      const rowBrand = (cells[brandIdx] ?? '').trim();
      if (normalize(rowBrand) !== nBrand) continue;
      if (nModel) {
        const rowModel = (cells[modelIdx] ?? '').trim();
        if (!rowModel || normalize(rowModel) !== nModel) continue;
      }
      const rowYear = (cells[yearIdx] ?? '').trim();
      if (yearIdx >= 0) {
        if (rowYear) yearSet.add(rowYear);
      }
      // Size: only include when row matches selected year; size dropdown is dependent on model and year
      if (sizeIdx >= 0 && nYear) {
        if (rowYear !== nYear) continue;
        const v = (cells[sizeIdx] ?? '').trim().replace(/^"+|"+$/g, '');
        if (v) sizeSet.add(v);
      }
    }

    result.year = Array.from(yearSet).sort((a, b) => Number(b) - Number(a));
    result.size = Array.from(sizeSet).sort((a, b) => a.localeCompare(b));
    return Response.json(result);
  } catch {
    return Response.json(result);
  }
}
