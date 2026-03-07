/**
 * IMEIDB.xyz API client for IMEI → brand/model lookup.
 * Token is read from env IMEIDB_API_TOKEN or from .env.local (Next may not pass .env.local to API routes).
 * @see https://imeidb.xyz/api
 */

import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import type { TacEntry } from './tacLookup';

const API_BASE = 'https://imeidb.xyz/api/imei';

type ImeidbData = {
  brand?: string;
  model?: string;
  name?: string;
  models?: string[];
  device_spec?: { name?: string; model?: string; [key: string]: unknown };
  blacklist?: { status?: boolean };
  [key: string]: unknown;
};

export type ImeidbLookupResult = TacEntry & { blacklisted?: boolean; /** All model-related text for "mentioned anywhere" match */ searchableModelText?: string; /** Raw API alias (e.g. XT2519-1, SM-S938U) for alias match via lib/modelAliases */ alias?: string };

/** File-based cache for IMEI lookups. Persists across Turbopack module re-evaluations and server restarts.
 *  Stored as JSON at .imeidb-cache.json in the project root. */
const CACHE_PATH = join(resolve(process.cwd()), '.imeidb-cache.json');

function readFileCache(): Record<string, ImeidbLookupResult | null> {
  try {
    if (existsSync(CACHE_PATH)) {
      return JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
    }
  } catch { /* corrupted file, start fresh */ }
  return {};
}

function writeFileCache(cache: Record<string, ImeidbLookupResult | null>) {
  try {
    const { writeFileSync: wfs } = require('fs') as typeof import('fs');
    wfs(CACHE_PATH, JSON.stringify(cache, null, 2));
  } catch { /* ignore write errors */ }
}

function getCached(imei: string): ImeidbLookupResult | null | undefined {
  const cache = readFileCache();
  return imei in cache ? cache[imei] : undefined;
}

function setCached(imei: string, result: ImeidbLookupResult | null) {
  const cache = readFileCache();
  cache[imei] = result;
  writeFileCache(cache);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Alias codes like A2849, MGHX3 – we never use these as the model. */
function isAliasCode(s: string): boolean {
  const t = s.trim();
  return /^[A-Z]\d{4,}$/i.test(t) || (/^\d+[A-Z]*$/i.test(t) && t.length <= 8);
}

/** Prefer "iPhone 11 Pro Max" over alias codes like "A2849". */
function looksLikeDisplayName(s: string): boolean {
  if (!s || isAliasCode(s)) return false;
  const t = s.trim();
  return t.includes(' ') || /\b(iPhone|Galaxy|Pixel|OnePlus|iPad|Mac)\b/i.test(t);
}

/** Log to server terminal (where you run npm run dev) - not the browser console. */
function log(msg: string, ...args: unknown[]) {
  console.log('[IMEIDB]', msg, ...args);
}

/** Get token from process.env or by reading .env.local (fallback when Next doesn't expose it). */
function getToken(): string | null {
  const fromEnv = process.env.IMEIDB_API_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  try {
    // Next/Turbopack may run with cwd elsewhere; walk up to find .env.local
    let dir = process.cwd();
    for (let i = 0; i < 10; i++) {
      const envPath = join(dir, '.env.local');
      if (existsSync(envPath)) {
        const raw = readFileSync(envPath, 'utf8');
        const line = raw.split(/\r?\n/).find((l) => /^\s*IMEIDB_API_TOKEN\s*=/.test(l.trim()));
        if (line) {
          const value = line.replace(/^\s*IMEIDB_API_TOKEN\s*=\s*/, '').trim().replace(/^["']|["']$/g, '');
          if (value) return value;
        }
        break; // found file but no token, don't search higher
      }
      const parent = resolve(dir, '..');
      if (parent === dir) break;
      dir = parent;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Look up device by IMEI via IMEIDB.xyz API.
 * Returns { brand, model, blacklisted? } or null if token missing, request fails, or no data.
 * IMEI is normalized (digits only) before the request.
 */
export async function lookupByImeidb(imei: string): Promise<ImeidbLookupResult | null> {
  const digitsOnly = (imei ?? '').trim().replace(/\s/g, '').replace(/\D/g, '');
  log('lookup called, IMEI (digits):', digitsOnly.slice(0, 8) + '...');

  if (digitsOnly.length >= 15) {
    const cached = getCached(digitsOnly);
    if (cached !== undefined && cached !== null && (cached as ImeidbLookupResult).searchableModelText !== undefined) {
      const c = cached as ImeidbLookupResult;
      if (c.alias !== undefined) {
        log('cache hit, reusing previous result');
        return cached;
      }
      log('cache entry missing alias (old format), re-fetching from API');
    }
    if (cached !== undefined && cached !== null && !(cached as ImeidbLookupResult).searchableModelText) {
      log('cache entry missing searchableModelText (old format), re-fetching from API');
    }
  }

  const token = getToken();
  if (!token) {
    log('SKIP: No IMEIDB_API_TOKEN. cwd=', process.cwd(), ' .env.local exists=', existsSync(join(process.cwd(), '.env.local')));
    return null;
  }

  if (digitsOnly.length < 15) {
    log('SKIP: IMEI has fewer than 15 digits');
    return null;
  }

  const url = `${API_BASE}/${digitsOnly}?token=${encodeURIComponent(token)}&format=json`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Api-Key': token,
      },
      signal: AbortSignal.timeout(15000),
    });

    const json = (await res.json()) as {
      success?: boolean;
      data?: ImeidbData;
      message?: string;
      code?: number;
    };

    if (!res.ok) {
      log('API error:', res.status, json?.message ?? res.statusText, 'code:', json?.code);
      setCached(digitsOnly, null);
      return null;
    }

    if (json.success === false) {
      log('API success=false:', json?.message, 'code:', json?.code);
      setCached(digitsOnly, null);
      return null;
    }

    const data = json?.data;
    if (!data || typeof data !== 'object') {
      log('No data in response, typeof data:', typeof json?.data);
      setCached(digitsOnly, null);
      return null;
    }

    const brand = String(data.brand ?? data.manufacturer ?? '').trim();
    // API may store the display name in different fields; "model" is sometimes the alias (e.g. A2849).
    // Collect from every plausible field, then take the first that looks like a display name (never an alias).
    const spec = data.device_spec && typeof data.device_spec === 'object' ? data.device_spec : undefined;
    const candidates: string[] = [
      Array.isArray(data.models) ? data.models[0] : undefined,
      typeof data.name === 'string' ? data.name : undefined,
      spec && typeof spec.name === 'string' ? spec.name : undefined,
      spec && typeof spec.model === 'string' ? spec.model : undefined,
      (data as { product_name?: string }).product_name,
      (data as { display_name?: string }).display_name,
      (data as { device_name?: string }).device_name,
    ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
    const nameStr = typeof data.name === 'string' ? data.name.trim() : '';
    const modelFromNameRaw = brand && nameStr ? nameStr.replace(new RegExp(`^${escapeRegExp(brand)}\\s+`, 'i'), '').trim() : nameStr;
    if (modelFromNameRaw) candidates.push(modelFromNameRaw);
    const firstGood = candidates.find((c) => !isAliasCode(c.trim()));
    let model = firstGood ? String(firstGood.trim()) : '';
    if (brand && model && model.toLowerCase().startsWith(brand.toLowerCase() + ' ')) {
      model = model.slice(brand.length).trim();
    }
    if (!brand && !model) {
      log('data has no brand/model, keys:', Object.keys(data));
      setCached(digitsOnly, null);
      return null;
    }
    const blacklisted = data.blacklist?.status === true;
    // Searchable text for "user model mentioned anywhere" uses only display/product name fields (not the alias); alias is stored separately for match via lib/modelAliases.
    const allModelStrings: string[] = [
      typeof data.name === 'string' ? data.name : '',
      Array.isArray(data.models) ? data.models.filter((m): m is string => typeof m === 'string').join(' ') : '',
      spec && typeof spec.name === 'string' ? spec.name : '',
      spec && typeof spec.model === 'string' ? spec.model : '',
      (data as { product_name?: string }).product_name ?? '',
      (data as { display_name?: string }).display_name ?? '',
      (data as { device_name?: string }).device_name ?? '',
    ].filter(Boolean);
    const rawAlias = typeof data.model === 'string' ? data.model.trim() : '';
    const searchableModelText = allModelStrings.join(' ').trim() || undefined;
    const result: ImeidbLookupResult = { brand, model, blacklisted, searchableModelText, alias: rawAlias || undefined };
    setCached(digitsOnly, result);
    log('OK:', { brand, model, blacklisted });
    return result;
  } catch (err) {
    log('Request failed:', err instanceof Error ? err.message : err);
    setCached(digitsOnly, null);
    return null;
  }
}
