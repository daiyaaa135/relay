/**
 * SNLookup.com Samsung IMEI lookup - verify carrier and model.
 * @see https://snlookup.com/samsung
 * Used for Samsung phones instead of IMEIDB; returns model and carrier from result page.
 */

export type SnlookupResult = {
  brand: string;
  model: string;
  carrier?: string;
  /** Storage parsed from model name when present (e.g. "256GB", "128GB"). */
  storageFromModel?: string;
  /** If true, device may be blacklisted or invalid. */
  blacklisted?: boolean;
};

/** Extract storage/capacity from model string (e.g. "Galaxy S24 256GB", "SM-S921B 128GB"). */
export function parseStorageFromModel(model: string): string | null {
  if (!model || typeof model !== 'string') return null;
  const m = model.match(/\b(1?\d{2,3})\s*GB\b/i) || model.match(/\b(1)\s*TB\b/i);
  if (m) {
    const num = m[1];
    const unit = /tb/i.test(model.slice(model.indexOf(m[0]!))) ? 'TB' : 'GB';
    return `${num}${unit}`;
  }
  return null;
}

const SAMSUNG_LOOKUP_URL = 'https://snlookup.com/samsung';

/** In-memory cache: normalized IMEI (15 digits) -> last lookup result. */
const lookupCache = new Map<string, SnlookupResult | null>();

function normalizeImei(imei: string): string {
  return (imei ?? '').trim().replace(/\s/g, '').replace(/\D/g, '');
}

/**
 * Fetch Samsung lookup page with IMEI and parse HTML for model and carrier.
 * SNLookup expects IMEI for phones (15 digits). We POST the form and parse the result HTML.
 */
export async function lookupSamsungByImei(imei: string): Promise<SnlookupResult | null> {
  const digitsOnly = normalizeImei(imei);
  if (digitsOnly.length < 15) {
    console.log('[SNLookup] IMEI has fewer than 15 digits');
    return null;
  }

  const cached = lookupCache.get(digitsOnly);
  if (cached !== undefined) {
    console.log('[SNLookup] cache hit, reusing previous result');
    return cached;
  }

  try {
    // SNLookup form field is "sn" (serial number / IMEI) with submit button "search=Search"
    const formBody = new URLSearchParams();
    formBody.set('sn', digitsOnly);
    formBody.set('search', 'Search');

    const res = await fetch(SAMSUNG_LOOKUP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      body: formBody.toString(),
      signal: AbortSignal.timeout(35000),
    });

    const html = await res.text();

    // Parse HTML for model and carrier. SNLookup result page uses "Model name:", "Provider / carrier:", etc.
    const model = extractField(html, ['model name', 'model', 'product name', 'product', 'device model', 'device']);
    const carrier = extractField(html, ['provider / carrier', 'provider/carrier', 'provider carrier', 'carrier', 'network', 'operator', 'sim lock']);

    // If we found at least model or carrier, consider it a valid result; brand is Samsung
    if (model || carrier) {
      const storageFromModel = model ? parseStorageFromModel(model) ?? undefined : undefined;
      const result: SnlookupResult = {
        brand: 'Samsung',
        model: model || '',
        carrier: carrier || undefined,
        storageFromModel,
      };
      lookupCache.set(digitsOnly, result);
      console.log('[SNLookup] OK:', result);
      return result;
    }

    // Check for blacklist / invalid indicators in HTML
    const lower = html.toLowerCase();
    if (lower.includes('blacklist') && (lower.includes('yes') || lower.includes('reported'))) {
      const result: SnlookupResult = { brand: 'Samsung', model: '', blacklisted: true };
      lookupCache.set(digitsOnly, result);
      return result;
    }

    // No clear result - might be invalid IMEI or page structure changed
    console.log('[SNLookup] No model/carrier found in response (length:', html.length, ')');
    lookupCache.set(digitsOnly, null);
    return null;
  } catch (err) {
    console.log('[SNLookup] Request failed:', err instanceof Error ? err.message : err);
    lookupCache.set(digitsOnly, null);
    return null;
  }
}

/** Extract value for a field from HTML (looks for "Field Name:" or <th>Field</th><td>value</td>). */
function extractField(html: string, fieldNames: string[]): string {
  for (const name of fieldNames) {
    // Pattern: "Model name: value" or "Provider / carrier: value" as plain text (colon required to avoid
    // backtracking where the optional colon is skipped and ':' gets captured as the value itself).
    const labelRegex = new RegExp(`${escapeRegExp(name)}\\s*:\\s*([^<\\n]+)`, 'i');
    const m = html.match(labelRegex);
    if (m) {
      const value = decodeHtmlEntities(m[1].replace(/<[^>]+>/g, ''));
      if (value.length > 0 && value.length < 200) return value;
    }
    // Pattern: <th>Model</th> or <th>Model:</th> ... <td>value</td>
    const thRegex = new RegExp(`<th[^>]*>\\s*${escapeRegExp(name)}:?\\s*</th>[\\s\\S]*?<td[^>]*>([^<]+)`, 'i');
    const m2 = html.match(thRegex);
    if (m2) {
      const value = decodeHtmlEntities(m2[1]);
      if (value.length > 0 && value.length < 200) return value;
    }
    // Look for data in table row: "Label:" or "Label" in th/td then next td with value
    const rowRegex = new RegExp(`${escapeRegExp(name)}:?[^<]*</(?:th|td)>[\\s\\S]*?<td[^>]*>([^<]+)`, 'i');
    const m3 = html.match(rowRegex);
    if (m3) {
      const value = decodeHtmlEntities(m3[1]);
      if (value.length > 0 && value.length < 200) return value;
    }
  }
  // SNLookup "Provider / carrier" - same-line, then next <td>; search in result section only
  if (fieldNames.some((n) => n.toLowerCase().includes('carrier'))) {
    const resultSection =
      html.includes('Device Information') ? html.slice(html.indexOf('Device Information')) :
      html.includes('device information') ? html.slice(html.indexOf('device information')) :
      html;
    const sameLine = /provider\s*\/\s*carrier\s*:\s*([^\n<]+)/i.exec(resultSection);
    if (sameLine) {
      const v = decodeHtmlEntities(sameLine[1].replace(/<[^>]+>/g, ''));
      if (v.length > 0 && v.length < 200) return v;
    }
    const nextTd = /provider\s*\/\s*carrier\s*:?[\s\S]*?<td[^>]*>([^<]+)/i.exec(resultSection);
    if (nextTd) {
      const v = decodeHtmlEntities(nextTd[1]);
      if (v.length > 0 && v.length < 200) return v;
    }
    // Full cell: value may contain tags or entities (e.g. AT&T)
    const fullTd = /provider\s*\/\s*carrier\s*:?[\s\S]*?<td[^>]*>([\s\S]+?)<\/td>/i.exec(resultSection);
    if (fullTd) {
      const v = decodeHtmlEntities(fullTd[1].replace(/<[^>]+>/g, '')).trim();
      if (v.length > 0 && v.length < 200) return v;
    }
    // Fallback: "Carrier:" (without "Provider /") then next <td>
    const carrierOnly = /(?:^|[>\s])carrier\s*:?[\s\S]*?<td[^>]*>([^<]+)/i.exec(resultSection);
    if (carrierOnly) {
      const v = decodeHtmlEntities(carrierOnly[1]).trim();
      if (v.length > 0 && v.length < 200 && !/could not be verified|not found|n\/a/i.test(v)) return v;
    }
  }
  return '';
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- Serial lookup for laptops & tablets (Apple, Dell, HP, Lenovo, etc.) ---

export type SerialLookupResult = {
  model: string;
  brand?: string;
};

const SERIAL_LOOKUP_URLS: Record<string, string> = {
  apple: 'https://snlookup.com/apple',
  dell: 'https://snlookup.com/dell',
  hp: 'https://snlookup.com/hp',
  lenovo: 'https://snlookup.com/lenovo',
  microsoft: 'https://snlookup.com/microsoft',
  samsung: 'https://snlookup.com/samsung',
};

const serialCache = new Map<string, SerialLookupResult | null>();

function normalizeSerial(s: string): string {
  return (s ?? '').trim().replace(/\s/g, '').toUpperCase().replace(/^S/, '');
}

function getLookupUrl(brand: string): string | null {
  const b = brand.toLowerCase().trim();
  if (SERIAL_LOOKUP_URLS[b]) return SERIAL_LOOKUP_URLS[b];
  if (b.includes('apple')) return SERIAL_LOOKUP_URLS.apple;
  if (b.includes('dell')) return SERIAL_LOOKUP_URLS.dell;
  if (b.includes('hp')) return SERIAL_LOOKUP_URLS.hp;
  if (b.includes('lenovo')) return SERIAL_LOOKUP_URLS.lenovo;
  if (b.includes('microsoft')) return SERIAL_LOOKUP_URLS.microsoft;
  if (b.includes('samsung')) return SERIAL_LOOKUP_URLS.samsung;
  return null;
}

/**
 * Fetch SNLookup page for the given brand with serial number and parse HTML for model.
 * Used for laptop and tablet serial verification (Apple, Dell, HP, Lenovo, etc.).
 */
export async function lookupSerialByBrand(brand: string, serial: string): Promise<SerialLookupResult | null> {
  const url = getLookupUrl(brand);
  if (!url) return null;

  const key = `${brand.toLowerCase()}:${normalizeSerial(serial)}`;
  if (!key.split(':')[1] || key.split(':')[1]!.length < 7) return null;

  const cached = serialCache.get(key);
  if (cached !== undefined) return cached;

  const sn = normalizeSerial(serial);
  if (!sn || sn.length < 7) return null;

  try {
    const formBody = new URLSearchParams();
    formBody.set('sn', sn);
    formBody.set('search', 'Search');

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      body: formBody.toString(),
      signal: AbortSignal.timeout(35000),
    });

    const html = await res.text();
    const model = extractField(html, ['model', 'model name', 'product name', 'product', 'device model', 'configuration', 'model identifier', 'service tag', 'product name']);
    if (model && model.length > 0 && model.length < 200) {
      const result: SerialLookupResult = { model: decodeHtmlEntities(model).trim(), brand };
      serialCache.set(key, result);
      return result;
    }
    serialCache.set(key, null);
    return null;
  } catch (err) {
    console.log('[SNLookup] Request failed for', brand, err instanceof Error ? err.message : err);
    serialCache.set(key, null);
    return null;
  }
}

/** @deprecated Use lookupSerialByBrand instead. */
export async function lookupAppleBySerial(serial: string): Promise<SerialLookupResult | null> {
  return lookupSerialByBrand('Apple', serial);
}
