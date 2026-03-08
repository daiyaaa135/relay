import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const DEBUG_ENDPOINT = 'http://127.0.0.1:7242/ingest/1b68bc98-dfbf-4969-9794-62dc8b7c5307';
const LOG_PATH = '/Users/serenachan/Documents/dev/relay/.cursor/debug.log';

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  // #region agent log file
  try {
    const dir = path.dirname(LOG_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.appendFile(LOG_PATH, `${JSON.stringify(payload)}\n`, { encoding: 'utf8' });
  } catch {
    // Swallow file logging errors to avoid impacting the app
  }
  // #endregion agent log file

  // #region agent log proxy
  fetch(DEBUG_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion agent log proxy

  return NextResponse.json({ ok: true });
}

