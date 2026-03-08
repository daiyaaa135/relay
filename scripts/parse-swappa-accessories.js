#!/usr/bin/env node
/**
 * Parse Swappa Headphones, Speaker, Console, and Tablet CSVs:
 * - Split combined product name into BRAND and MODEL
 * - For tablets: also extract SIZE and YEAR
 * - Output: data/headphones.csv, data/speaker.csv, data/console.csv, data/tablet.csv
 *
 * Usage: node scripts/parse-swappa-accessories.js
 * Or: node scripts/parse-swappa-accessories.js /path/to/Desktop/swappa
 */

const fs = require('fs');
const path = require('path');

const swappaDir = process.argv[2] || path.join(__dirname, '../../Desktop/swappa');
const outDir = path.join(__dirname, '../data');

// Multi-word brands first (longest match wins)
const MULTI_WORD_BRANDS = [
  'Bowers & Wilkins',
  'Bang & Olufsen',
  'Harman Kardon',
  'Harmon Kardon', // typo in source
  'Ultimate Ears',
  'Turtle Beach',
  'SteelSeries',
  'Arcade1Up',
  'PlayStation',
  'Soundcore',
  'Microsoft Surface',
  'Asus ROG',
  'Lenovo Legion',
  'GPD WIN',
];

const SINGLE_WORD_BRANDS = [
  'Nintendo',
  'Analogue',
  'Xbox',
  'Steam',
  'MSI',
  'Anbernic',
  'Logitech',
  'Sony',
  'Apple',
  'Beats',
  'Bose',
  'Marshall',
  'JBL',
  'Sonos',
  'Samsung',
  'Razer',
  'Skullcandy',
  'Bowers',
  'Microsoft',
  'SVS',
  'Totem',
  'Polk',
  'TRIBIT',
  'GPD',
  'Lenovo',
  'Asus',
  'Amazon',
  'Google',
  'reMarkable',
  'Xiaomi',
  'Kobo',
  'Verizon',
  'HP',
  'Alcatel',
  'Wacom',
  'BOOX',
  'TCL',
];

function parseBrandModel(name) {
  if (!name || !name.trim()) return { brand: '', model: '' };
  let n = name.trim();
  // "New Nintendo 3DS XL" -> Nintendo, New 3DS XL
  if (n.startsWith('New Nintendo ')) {
    return { brand: 'Nintendo', model: n.slice(12) };
  }
  // "Kindle Colorsoft" etc -> Amazon, model
  if (n.startsWith('Kindle ')) {
    return { brand: 'Amazon', model: n.slice(7) };
  }

  // Check multi-word brands first (order matters: longer first)
  for (const b of MULTI_WORD_BRANDS) {
    if (n.startsWith(b + ' ') || n === b) {
      const model = n.slice(b.length).trim() || n;
      return { brand: b, model };
    }
  }

  // Single-word brands
  for (const b of SINGLE_WORD_BRANDS) {
    if (n.startsWith(b + ' ') || n === b) {
      const model = n.slice(b.length).trim() || n;
      return { brand: b, model };
    }
  }

  // Fallback: first word = brand, rest = model
  const parts = n.split(/\s+/);
  if (parts.length >= 2) {
    return { brand: parts[0], model: parts.slice(1).join(' ') };
  }
  return { brand: '', model: n };
}

/** Parse tablet product name: extract size, year; return brand, model (cleaned), size, year */
function parseTabletProduct(name) {
  const { brand, model: rawModel } = parseBrandModel(name);
  let size = '';
  let year = '';
  let model = rawModel;

  // Year: 20xx
  const yearMatch = model.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    year = yearMatch[1];
    model = model.replace(/\s*\(?\s*20\d{2}\s*\)?\s*$/, '').replace(/\s+20\d{2}(?=\s|$)/g, '').trim();
  }

  // Size: 13", 12.9", 11", 8.0, 10.4" etc.
  // Pattern 1: number + inch mark(s) - "13""", "12.9""", "11"""
  let sizeMatch = model.match(/(\d+(?:\.\d+)?)\s*"{1,3}\s*/);
  if (sizeMatch) {
    size = sizeMatch[1] + '"';
    model = model.replace(sizeMatch[0], ' ').replace(/\s+/g, ' ').trim();
  }
  // Pattern 2: decimal size like "Tab E 8.0", "10.4 (2020)", "Paper Pro 11.8"
  if (!size) {
    const m = model.match(/(\d+\.\d+)(?=\s*(?:\(|$|\(20\d{2}\))|Gen|\d{4})/);
    if (m) {
      size = m[1] + '"';
      model = model.replace(m[0], ' ').replace(/\s+/g, ' ').trim();
    }
  }

  model = model.replace(/\s+/g, ' ').trim();
  return { brand, model: model || rawModel, size, year };
}

function escapeCsv(s) {
  if (s == null || s === '') return '';
  const t = String(s);
  if (/[,"\n\r]/.test(t)) return '"' + t.replace(/"/g, '""') + '"';
  return t;
}

// ---- Headphones.csv: 🔗url,Product Name
function parseHeadphones() {
  const inputPath = path.join(swappaDir, 'Headphones.csv');
  if (!fs.existsSync(inputPath)) {
    console.warn('Headphones.csv not found at', inputPath);
    return [];
  }
  const raw = fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/);
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/^\uFEFF/, '');
    if (!line.trim() || line.startsWith(',') || line.startsWith('✏️')) continue;
    if (!line.startsWith('🔗')) continue;
    const match = line.match(/^🔗([^,]+),\s*(.+)$/);
    if (!match) continue;
    const [, url, name] = match;
    if (!name.trim()) continue;
    const { brand, model } = parseBrandModel(name);
    rows.push([escapeCsv(brand), escapeCsv(model), escapeCsv(url)].join(','));
  }
  return rows;
}

// ---- speaker.csv & console.csv: Preview 1,🔗url,Product Name,price
function parseSpeakerOrConsole(filename) {
  const inputPath = path.join(swappaDir, filename);
  if (!fs.existsSync(inputPath)) {
    console.warn(filename, 'not found at', inputPath);
    return [];
  }
  const raw = fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/);
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/^\uFEFF/, '');
    if (!line.trim()) continue;
    if (line.startsWith(',,✏️') || /^,+,✏️/.test(line)) continue;
    // Parse: Preview 1,url,"name with "" or ,",price OR Preview 1,url,name,price
    let url, name, price;
    const previewMatch = line.match(/^Preview\s+1,\s*(🔗https:[^,]+),\s*(.+)$/);
    if (!previewMatch) continue;
    url = previewMatch[1];
    const rest = previewMatch[2];
    if (rest.startsWith('"')) {
      let end = 1;
      while (end < rest.length) {
        const next = rest.indexOf('"', end);
        if (next === -1) break;
        if (rest[next + 1] === '"') { end = next + 2; continue; }
        end = next;
        break;
      }
      name = rest.slice(1, end).replace(/""/g, '"');
      const after = rest.slice(end + 1).replace(/^,\s*/, '');
      price = (after.match(/^(\d+)/) || [])[1] || '';
    } else {
      const lastComma = rest.lastIndexOf(',');
      if (lastComma === -1) continue;
      name = rest.slice(0, lastComma).trim();
      price = (rest.slice(lastComma + 1).match(/^\s*(\d+)/) || [])[1] || '';
    }
    url = previewMatch[1].replace(/^🔗/, '');
    if (!name.trim()) continue;
    const { brand, model } = parseBrandModel(name);
    rows.push([escapeCsv(brand), escapeCsv(model), escapeCsv(url), escapeCsv(price)].join(','));
  }
  return rows;
}

// ---- tablet.csv: Preview 1,🔗url,Product Name (no price, name may be quoted)
function parseTablet() {
  const inputPath = path.join(swappaDir, 'tablet.csv');
  if (!fs.existsSync(inputPath)) {
    console.warn('tablet.csv not found at', inputPath);
    return [];
  }
  const raw = fs.readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, '');
  const lines = raw.split(/\r?\n/);
  const rows = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].replace(/^\uFEFF/, '');
    if (!line.trim()) continue;
    if (line.startsWith(',,✏️') || /^,+,✏️/.test(line)) continue;
    const previewMatch = line.match(/^Preview\s+1,\s*(🔗https:[^,]+),\s*(.+)$/);
    if (!previewMatch) continue;
    let name;
    const rest = previewMatch[2];
    if (rest.startsWith('"')) {
      let end = 1;
      while (end < rest.length) {
        const next = rest.indexOf('"', end);
        if (next === -1) break;
        if (rest[next + 1] === '"') { end = next + 2; continue; }
        end = next;
        break;
      }
      name = rest.slice(1, end).replace(/""/g, '"');
    } else {
      name = rest.trim();
    }
    const url = previewMatch[1].replace(/^🔗/, '');
    if (!name.trim()) continue;
    const { brand, model, size, year } = parseTabletProduct(name);
    rows.push([escapeCsv(brand), escapeCsv(model), escapeCsv(size), escapeCsv(year), escapeCsv(url)].join(','));
  }
  return rows;
}

function main() {
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const headphones = parseHeadphones();
  const headphonesPath = path.join(outDir, 'headphones.csv');
  const headphonesHeader = 'BRAND,MODEL,IMAGE_URL';
  fs.writeFileSync(headphonesPath, [headphonesHeader, ...headphones].join('\n'), 'utf8');
  console.log('Wrote', headphones.length, 'rows to', headphonesPath);

  const speaker = parseSpeakerOrConsole('speaker.csv');
  const speakerPath = path.join(outDir, 'speaker.csv');
  const speakerHeader = 'BRAND,MODEL,IMAGE_URL,PRICE';
  fs.writeFileSync(speakerPath, [speakerHeader, ...speaker].join('\n'), 'utf8');
  console.log('Wrote', speaker.length, 'rows to', speakerPath);

  const consoleRows = parseSpeakerOrConsole('console.csv');
  const consolePath = path.join(outDir, 'console.csv');
  const consoleHeader = 'BRAND,MODEL,IMAGE_URL,PRICE';
  fs.writeFileSync(consolePath, [consoleHeader, ...consoleRows].join('\n'), 'utf8');
  console.log('Wrote', consoleRows.length, 'rows to', consolePath);

  const tabletRows = parseTablet();
  const tabletPath = path.join(outDir, 'tablet.csv');
  const tabletHeader = 'BRAND,MODEL,SIZE,YEAR,IMAGE_URL';
  fs.writeFileSync(tabletPath, [tabletHeader, ...tabletRows].join('\n'), 'utf8');
  console.log('Wrote', tabletRows.length, 'rows to', tabletPath);
}

main();
