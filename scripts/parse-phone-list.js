const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2] || path.join(__dirname, '../../Desktop/swappa/phone list.csv');
const raw = fs.readFileSync(inputPath, 'utf8');

const rows = [];
const lines = raw.split(/\r?\n/);

function escapeCsv(s) {
  if (s == null || s === '') return '';
  const t = String(s);
  if (/[,"\n\r]/.test(t)) return '"' + t.replace(/"/g, '""') + '"';
  return t;
}

function parseName(name) {
  const n = name.trim();
  let brand = '';
  let model = n;

  const brandFirst = [
    'Apple', 'Samsung', 'Google', 'OnePlus', 'Nokia', 'LG', 'Motorola',
    'T-Mobile', 'Razer', 'ASUS', 'Xiaomi', 'Sony', 'Nothing'
  ];
  for (const b of brandFirst) {
    if (n.startsWith(b + ' ')) {
      brand = b;
      model = n.slice(b.length).trim();
      break;
    }
  }

  if (!brand) {
    if (/^Galaxy\s/i.test(n)) {
      brand = 'Samsung';
      model = n;
    } else if (/^Moto\s/i.test(n)) {
      brand = 'Motorola';
      model = n;
    } else if (/^Pixel\s/i.test(n)) {
      brand = 'Google';
      model = n;
    } else if (/^Revvl\s/i.test(n)) {
      brand = 'T-Mobile';
      model = n;
    } else {
      brand = '';
      model = n;
    }
  }

  return { brand, model };
}

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

  const { brand, model } = parseName(name);
  rows.push([escapeCsv(brand), escapeCsv(model), escapeCsv(price)].join(','));
}

const header = 'BRAND,MODEL,PRICE';
const out = [header, ...rows].join('\n');

const outPath = path.join(__dirname, '../phones.csv');
fs.writeFileSync(outPath, out, 'utf8');
console.log('Wrote', rows.length, 'rows to', outPath);
