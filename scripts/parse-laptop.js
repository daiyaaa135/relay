/**
 * Parse laptop.csv: separate brand, model, size from a combined "name" column.
 * Usage: node scripts/parse-laptop.js [input.csv] [output.csv]
 * Defaults: data/laptop.csv -> data/laptop-parsed.csv
 */

const fs = require('fs');
const path = require('path');

const defaultInput = path.join(__dirname, '../data/laptop.csv');
const defaultOutput = path.join(__dirname, '../data/laptop.csv');

const inputPath = process.argv[2] || defaultInput;
const outputPath = process.argv[3] || defaultOutput;

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map((line) => parseLine(line));
  return { headers, rows };
}

function parseLine(line) {
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

const BRANDS = [
  'Microsoft', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Asus', 'Acer', 'Samsung',
  'Google', 'Razer', 'MSI', 'Huawei', 'Thunderobot', 'Apple'
];

function parseName(name) {
  const n = String(name || '').trim();
  let brand = '';
  let model = '';
  let year = '';
  let size = '';

  // Brand
  if (n.startsWith('MacBook') || n.startsWith('Macbook')) {
    brand = 'Apple';
  } else {
    for (const b of BRANDS) {
      if (n.startsWith(b + ' ') || n === b) {
        brand = b;
        break;
      }
    }
  }

  // Year: (2020), 2018, 2023, Late 2023, etc.
  let yearMatch = n.match(/\((20\d{2})\)/);
  if (yearMatch) year = yearMatch[1];
  if (!year) {
    yearMatch = n.match(/(?:^|\s)(20\d{2})(?:\s|\)| -|$|")/);
    if (yearMatch) year = yearMatch[1];
  }
  if (!year) {
    const lateMatch = n.match(/Late\s+(20\d{2})/i);
    if (lateMatch) year = lateMatch[1];
  }

  // Size: 18", 16", 15", 14", 13.5", 13.3", 12.3 Inch, etc.
  let sizeMatch = n.match(/(\d+(?:\.\d+)?)\s*""/);
  if (sizeMatch) size = sizeMatch[1] + '"';
  if (!size) sizeMatch = n.match(/(\d+(?:\.\d+)?)\s*Inch/i);
  if (sizeMatch && !size) size = sizeMatch[1] + '"';
  if (!size) sizeMatch = n.match(/(\d+(?:\.\d+)?)"(?=\s|$|,)/);
  if (sizeMatch && !size) size = sizeMatch[1] + '"';

  // Model: everything except brand, year, and size
  let rest = n;
  if (brand) rest = rest.slice(brand.length).trim();
  if (year) rest = rest.replace(year, '').replace(/\(\s*\)/g, '').trim();
  if (size) rest = rest.replace(new RegExp(size.replace(/"/g, '""') + '\\s*', 'g'), '').replace(/\d+(?:\.\d+)?\s*"?\s*(?:Inch)?\s*$/i, '').trim();
  rest = rest.replace(/^\s*-\s*|\s*-\s*$/g, '');
  model = rest.replace(/\s+/g, ' ').trim();

  return { brand, model, year, size };
}

function escapeCsv(s) {
  if (s == null || s === '') return '';
  const t = String(s);
  if (/[,"\n\r]/.test(t)) return '"' + t.replace(/"/g, '""') + '"';
  return t;
}

try {
  const raw = fs.readFileSync(inputPath, 'utf8');
  const { headers, rows } = parseCSV(raw);

  const nameIdx = headers.findIndex((h) =>
    /^name$/i.test(String(h).trim())
  );
  if (nameIdx < 0) {
    console.error('No "name" column found. Headers:', headers.join(', '));
    process.exit(1);
  }

  const outHeaders = ['BRAND', 'MODEL', 'YEAR', 'SIZE'];
  const otherIndices = headers
    .map((h, i) => (i === nameIdx ? -1 : i))
    .filter((i) => i >= 0);
  otherIndices.forEach((i) => outHeaders.push(headers[i]));

  const outRows = rows.map((cells) => {
    const name = cells[nameIdx] ?? '';
    const { brand, model, year, size } = parseName(name);
    const row = [escapeCsv(brand), escapeCsv(model), escapeCsv(year), escapeCsv(size)];
    otherIndices.forEach((i) => row.push(escapeCsv(cells[i] ?? '')));
    return row.join(',');
  });

  const out = [outHeaders.join(','), ...outRows].join('\n');
  fs.writeFileSync(outputPath, out, 'utf8');
  console.log('Wrote', outRows.length, 'rows to', outputPath);
} catch (err) {
  if (err.code === 'ENOENT') {
    console.error('File not found:', inputPath);
    console.error('Create data/laptop.csv with a "name" column, or pass input path as first arg.');
  } else {
    console.error(err);
  }
  process.exit(1);
}
