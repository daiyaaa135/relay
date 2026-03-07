import { NextRequest } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

type DeviceRow = {
  brand: string;
  model: string;
  chipCpu: string;
  year: string;
  ram: string;
  size: string;
  price: number;
};

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
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSize(s: string): string {
  const n = normalize(s);
  if (!n) return '';
  return n.replace(/\s*inch(es)?\s*/gi, '"').replace(/\s/g, '');
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const brand = searchParams.get('brand') ?? '';
  const model = searchParams.get('model') ?? '';
  const chipCpu = searchParams.get('chipCpu') ?? '';
  const year = searchParams.get('year') ?? '';
  const ram = searchParams.get('ram') ?? '';
  const size = searchParams.get('size') ?? '';

  let csvPath: string;
  try {
    csvPath = join(process.cwd(), 'devices.csv');
    await readFile(csvPath, 'utf8');
  } catch {
    return Response.json(
      { credits: 0, supported: false, message: 'We don\'t support this type of device.' },
      { status: 200 }
    );
  }

  const raw = await readFile(csvPath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return Response.json(
      { credits: 0, supported: false, message: 'We don\'t support this type of device.' },
      { status: 200 }
    );
  }

  const rows: DeviceRow[] = [];
  const header = parseCSVLine(lines[0]);
  const brandIdx = header.findIndex((h) => normalize(h) === 'brand');
  const modelIdx = header.findIndex((h) => normalize(h) === 'model');
  const chipIdx = header.findIndex((h) => normalize(h).includes('chip') || normalize(h).includes('cpu'));
  const yearIdx = header.findIndex((h) => normalize(h) === 'year');
  const ramIdx = header.findIndex((h) => normalize(h) === 'ram');
  const sizeIdx = header.findIndex((h) => normalize(h) === 'size');
  const priceIdx = header.findIndex((h) => normalize(h) === 'price');

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
    const price = priceIdx >= 0 && cells[priceIdx] ? Number(cells[priceIdx]) : 0;
    if (Number.isNaN(price) || price < 0) continue;
    rows.push({
      brand: brandIdx >= 0 ? (cells[brandIdx] ?? '').trim() : '',
      model: modelIdx >= 0 ? (cells[modelIdx] ?? '').trim() : '',
      chipCpu: chipIdx >= 0 ? (cells[chipIdx] ?? '').trim() : '',
      year: yearIdx >= 0 ? (cells[yearIdx] ?? '').trim() : '',
      ram: ramIdx >= 0 ? (cells[ramIdx] ?? '').trim() : '',
      size: sizeIdx >= 0 ? (cells[sizeIdx] ?? '').trim() : '',
      price,
    });
  }

  const nBrand = normalize(brand);
  const nModel = normalize(model);
  const nChip = normalize(chipCpu);
  const nYear = year.trim();
  const nRam = normalize(ram);
  const nSize = normalizeSize(size);

  const matches = rows.filter((r) => {
    if (nBrand && normalize(r.brand) !== nBrand) return false;
    if (nModel && !normalize(r.model).includes(nModel) && !nModel.includes(normalize(r.model))) return false;
    if (nChip && r.chipCpu && normalize(r.chipCpu) !== nChip) return false;
    if (nYear && r.year && r.year !== nYear) return false;
    if (nRam && r.ram && normalize(r.ram) !== normalize(nRam)) return false;
    if (nSize && r.size) {
      const rSize = normalizeSize(r.size);
      if (rSize && nSize !== rSize && !rSize.includes(nSize) && !nSize.includes(rSize)) return false;
    }
    return true;
  });

  if (matches.length === 0) {
    return Response.json({
      credits: 0,
      supported: false,
      message: "We don't support this type of device.",
    });
  }

  const first = matches[0];
  return Response.json({
    credits: first.price,
    supported: true,
  });
}
