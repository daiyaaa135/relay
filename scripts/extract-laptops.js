/**
 * Extract laptop rows from devices.csv to data/laptop.csv with BRAND, MODEL, YEAR, SIZE, PRICE.
 * Includes year so models like MacBook Pro can be distinguished by version (e.g. 2019 vs 2023).
 */

const fs = require('fs');
const path = require('path');

const devicesPath = path.join(__dirname, '../devices.csv');
const laptopPath = path.join(__dirname, '../data/laptop.csv');

function parseCSVLine(line) {
  const out = [];
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
          cell += line[i++];
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

function escapeCsv(s) {
  if (s == null || s === '') return '';
  const t = String(s);
  if (/[,"\n\r]/.test(t)) return '"' + t.replace(/"/g, '""') + '"';
  return t;
}

const laptopKeywords = /(MacBook|Laptop|Surface Laptop|Pixelbook|Chromebook|Galaxy Book|Blade|ROG|Legion|ThinkPad|XPS|Alienware|Omen|Spectre|Envy|Pavilion|EliteBook|Vivobook|Victus|Predator|Swift|Katana|Stealth|Omnibook|Pro Laptop|IdeaPad|ThinkBook|Vivobook|MateBook|Zenbook)/i;

const raw = fs.readFileSync(devicesPath, 'utf8');
const lines = raw.split(/\r?\n/).filter((l) => l.trim());
const header = parseCSVLine(lines[0]);
const brandIdx = header.findIndex((h) => /^brand$/i.test(h.trim()));
const modelIdx = header.findIndex((h) => /^model$/i.test(h.trim()));
const yearIdx = header.findIndex((h) => /^year$/i.test(h.trim()));
const sizeIdx = header.findIndex((h) => /^size$/i.test(h.trim()));
const priceIdx = header.findIndex((h) => /^price$/i.test(h.trim()));

const outHeader = 'BRAND,MODEL,YEAR,SIZE,PRICE';
const outRows = [];

for (let i = 1; i < lines.length; i++) {
  const cells = parseCSVLine(lines[i]);
  const brand = (cells[brandIdx] ?? '').trim();
  const model = (cells[modelIdx] ?? '').trim();
  const year = (cells[yearIdx] ?? '').trim();
  const size = (cells[sizeIdx] ?? '').trim();
  const price = (cells[priceIdx] ?? '').trim();
  if (!laptopKeywords.test(brand + ' ' + model)) continue;
  outRows.push([
    escapeCsv(brand),
    escapeCsv(model),
    escapeCsv(year),
    escapeCsv(size),
    escapeCsv(price),
  ].join(','));
}

// Sort by name: Brand, Model, Year, Size
const parsed = outRows.map((row) => {
  const cells = [];
  let i = 0;
  const line = row;
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
          cell += line[i++];
        }
      }
      cells.push(cell);
      if (line[i] === ',') i++;
      continue;
    }
    const comma = line.indexOf(',', i);
    if (comma === -1) {
      cells.push(line.slice(i));
      break;
    }
    cells.push(line.slice(i, comma));
    i = comma + 1;
  }
  return cells;
});

parsed.sort((a, b) => {
  const brandA = (a[0] || '').toLowerCase();
  const brandB = (b[0] || '').toLowerCase();
  if (brandA !== brandB) return brandA.localeCompare(brandB);
  const modelA = (a[1] || '').toLowerCase();
  const modelB = (b[1] || '').toLowerCase();
  if (modelA !== modelB) return modelA.localeCompare(modelB);
  const yearA = parseInt(a[2], 10) || 0;
  const yearB = parseInt(b[2], 10) || 0;
  if (yearA !== yearB) return yearA - yearB;
  const sizeA = parseFloat(String(a[3]).replace(/[^0-9.]/g, '')) || 0;
  const sizeB = parseFloat(String(b[3]).replace(/[^0-9.]/g, '')) || 0;
  return sizeA - sizeB;
});

const sortedRows = parsed.map((cells) =>
  cells.map((c) => (/[,"\n\r]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c)).join(',')
);

const out = [outHeader, ...sortedRows].join('\n');
fs.writeFileSync(laptopPath, out, 'utf8');
console.log('Wrote', sortedRows.length, 'laptop rows (sorted by name) to', laptopPath);
