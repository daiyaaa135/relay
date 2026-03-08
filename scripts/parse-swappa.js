const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2] || path.join(__dirname, '../../Desktop/swappa/swappa2.csv');
const raw = fs.readFileSync(inputPath, 'utf8');

const rows = [];
const lines = raw.split(/\r?\n/);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line || line.startsWith('✏️')) continue;

  let name, priceStr;
  if (line.startsWith('"')) {
    let pos = 1;
    let nameEnd = -1;
    while (pos < line.length) {
      const next = line.indexOf('"', pos);
      if (next === -1) break;
      if (line[next + 1] === '"') {
        pos = next + 2;
        continue;
      }
      nameEnd = next;
      break;
    }
    if (nameEnd !== -1) {
      name = line.slice(1, nameEnd).replace(/""/g, '"');
      priceStr = line.slice(nameEnd + 1).replace(/^,\s*/, '').trim();
    } else {
      const lastComma = line.lastIndexOf(',');
      name = line.slice(1, lastComma - 1).replace(/""/g, '"');
      priceStr = line.slice(lastComma + 1).trim();
    }
  } else {
    const lastComma = line.lastIndexOf(',');
    name = line.slice(0, lastComma).trim();
    priceStr = line.slice(lastComma + 1).trim();
  }

  const price = priceStr && /^\d+$/.test(priceStr) ? priceStr : '';
  if (!name || price === '') continue;

  const parsed = parseName(name, price);
  rows.push(parsed);
}

function parseName(name, price) {
  const n = name;
  let brand = '';
  let model = '';
  let chipCpu = '';
  let year = '';
  let ram = '';
  let size = '';

  const brandOrder = [
    'Microsoft', 'Dell', 'HP', 'Lenovo', 'Asus', 'ASUS', 'Samsung', 'Google',
    'Acer', 'Razer', 'MSI', 'Huawei', 'Thunderobot', 'Chromebook'
  ];
  for (const b of brandOrder) {
    if (n.startsWith(b + ' ') || n === b) {
      brand = b;
      if (b === 'Chromebook') brand = ''; // Chromebook is product type, get brand from context
      break;
    }
  }
  if (!brand && (n.startsWith('MacBook') || n.startsWith('Macbook'))) brand = 'Apple';

  // Chip/CPU: (M2), (M3), (M4), (M3 Pro), etc.
  const chipMatch = n.match(/\((M\d+(?:\s*Pro)?)\)/i);
  if (chipMatch) chipCpu = chipMatch[1].trim();

  // Year: 4-digit in parentheses (2020) or standalone 2018, 2023, Late 2023
  let yearMatch = n.match(/\((20\d{2})\)/);
  if (yearMatch) year = yearMatch[1];
  if (!year) {
    yearMatch = n.match(/(?:^|\s)(20\d{2})(?:\s|\)| -|$)/);
    if (yearMatch) year = yearMatch[1];
  }
  if (!year) {
    const lateMatch = n.match(/Late\s+(20\d{2})/i);
    if (lateMatch) year = lateMatch[1];
  }

  // Size: 18", 16", 15", 14", 13.5", 13.3", 13", 12", 11", 12.3 Inch, etc.
  let sizeMatch = n.match(/(\d+(?:\.\d+)?)\s*""/);
  if (sizeMatch) size = sizeMatch[1] + '"';
  if (!size) sizeMatch = n.match(/(\d+(?:\.\d+)?)\s*Inch/i);
  if (sizeMatch && !size) size = sizeMatch[1] + ' Inch';
  if (!size) sizeMatch = n.match(/(\d+(?:\.\d+)?)"(?:\s|$)/);
  if (sizeMatch && !size) size = sizeMatch[1] + '"';

  // Model: product line. For Apple = MacBook Pro / MacBook Air / Macbook Retina
  if (brand === 'Apple') {
    if (n.includes('MacBook Pro')) model = 'MacBook Pro';
    else if (n.includes('MacBook Air')) model = 'MacBook Air';
    else if (n.includes('Macbook Retina') || n.includes('MacBook Retina')) model = 'MacBook Retina';
    else model = n.split(/\s+\d{4}/)[0] || n.split(' - ')[0] || n;
  } else if (brand) {
    const rest = n.slice(brand.length).trim();
    const beforeYear = rest.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s*-\s*[\d.]+\s*"?\s*(Inch)?\s*"?\s*$/i, '').trim();
    const modelPart = beforeYear.replace(/\s*(20\d{2})\s*.*$/, '').trim();
    model = modelPart || rest.split(/\s+\d+/)[0] || rest;
    if (model.length > 60) model = model.slice(0, 60);
  } else {
    if (n.includes('Chromebook Pixel')) {
      brand = 'Google';
      model = n; // e.g. "Chromebook Pixel 2nd Gen"
    } else {
      model = n;
    }
  }

  function escapeCsv(s) {
    if (s == null || s === '') return '';
    const t = String(s);
    if (/[,"\n\r]/.test(t)) return '"' + t.replace(/"/g, '""') + '"';
    return t;
  }

  return [
    escapeCsv(brand),
    escapeCsv(model),
    escapeCsv(chipCpu),
    escapeCsv(year),
    escapeCsv(ram),
    escapeCsv(size),
    escapeCsv(price)
  ].join(',');
}

const header = 'BRAND,MODEL,CHIP/CPU,YEAR,RAM,SIZE,PRICE';
const out = [header, ...rows].join('\n');

const outPath = path.join(__dirname, '../devices.csv');
fs.writeFileSync(outPath, out, 'utf8');
console.log('Wrote', rows.length, 'rows to', outPath);
