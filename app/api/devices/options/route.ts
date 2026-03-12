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

/** GET /api/devices/options?brand=Apple&model=MacBook%20Pro - returns unique chip_cpu, year, ram, size for that brand (and model) */
export async function GET(request: NextRequest) {
  const brand = (request.nextUrl.searchParams.get('brand') ?? '').trim();
  const model = (request.nextUrl.searchParams.get('model') ?? '').trim();

  const result = { chipCpu: [] as string[], year: [] as string[], ram: [] as string[], size: [] as string[] };
  if (!brand) return Response.json(result);

  let csvPath: string;
  try {
    csvPath = join(process.cwd(), 'devices.csv');
    await readFile(csvPath, 'utf8');
  } catch {
    return Response.json(result);
  }

  const raw = await readFile(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return Response.json(result);

  const header = parseCSVLine(lines[0]);
  const brandIdx = header.findIndex((h) => normalize(h) === 'brand');
  const modelIdx = header.findIndex((h) => normalize(h) === 'model');
  const chipIdx = header.findIndex((h) => normalize(h).includes('chip') || normalize(h).includes('cpu'));
  const yearIdx = header.findIndex((h) => normalize(h) === 'year');
  const ramIdx = header.findIndex((h) => normalize(h) === 'ram');
  const sizeIdx = header.findIndex((h) => normalize(h) === 'size');
  if (brandIdx < 0) return Response.json(result);

  const nBrand = normalize(brand);
  const nModel = model ? normalize(model) : '';
  const chipSet = new Set<string>();
  const yearSet = new Set<string>();
  const ramSet = new Set<string>();
  const sizeSet = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const rowBrand = (cells[brandIdx] ?? '').trim();
    if (normalize(rowBrand) !== nBrand) continue;
    if (nModel) {
      const rowModel = (cells[modelIdx] ?? '').trim();
      if (!rowModel || !normalize(rowModel).includes(nModel)) continue;
    }
    if (chipIdx >= 0) {
      const v = (cells[chipIdx] ?? '').trim();
      if (v) chipSet.add(v);
    }
    if (yearIdx >= 0) {
      const v = (cells[yearIdx] ?? '').trim();
      if (v) yearSet.add(v);
    }
    if (ramIdx >= 0) {
      const v = (cells[ramIdx] ?? '').trim();
      if (v) ramSet.add(v);
    }
    if (sizeIdx >= 0) {
      const v = (cells[sizeIdx] ?? '').trim();
      if (v) sizeSet.add(v);
    }
  }

  result.chipCpu = Array.from(chipSet).sort((a, b) => a.localeCompare(b));
  result.year = Array.from(yearSet).sort((a, b) => Number(b) - Number(a)); // newest first
  result.ram = Array.from(ramSet).sort((a, b) => a.localeCompare(b));
  result.size = Array.from(sizeSet).sort((a, b) => a.localeCompare(b));
  // When model is selected but devices.csv has no CHIP/CPU for it, provide common processor options so the dropdown is never empty
  if (model && result.chipCpu.length === 0) {
    result.chipCpu = [
      'Apple M1', 'Apple M2', 'Apple M3', 'Apple M4',
      'Intel Celeron', 'Intel Pentium', 'Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9',
      'AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9',
      'Qualcomm Snapdragon',
      'Other',
    ];
  }
  return Response.json(result);
}
