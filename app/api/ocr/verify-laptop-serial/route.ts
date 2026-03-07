import { NextRequest } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { lookupSerialByBrand } from '@/lib/snlookup';

const MAX_SIZE = 10 * 1024 * 1024;

function normalizeForMatch(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[""]/g, '"')
    .trim();
}

/** True if user model matches lookup model (e.g. "MacBook Pro" matches "MacBook Pro 14\" M3"). */
function modelMatches(userModel: string, lookupModel: string): boolean {
  const u = normalizeForMatch(userModel);
  const l = normalizeForMatch(lookupModel);
  if (!u || !l) return false;
  return l.includes(u) || u.includes(l);
}

/** Extract Apple-style serial from OCR text. Serial is typically 10–12 alphanumeric (0/1 used instead of O/I). */
function extractSerialFromOcr(ocrText: string): string | null {
  const noSpaces = (ocrText ?? '').replace(/\s/g, '');
  // Apple serial: often C02X..., F5..., etc. – alphanumeric, 10–12 chars
  const match = noSpaces.match(/\b([A-Z0-9]{10,12})\b/gi);
  if (match && match.length > 0) {
    const best = match.find((m) => /[A-Z]/i.test(m) && /\d/.test(m) && m.length >= 10) ?? match[0];
    return best ? best.replace(/\s/g, '').toUpperCase() : null;
  }
  const fallback = noSpaces.match(/([A-Z0-9]{10,14})/gi);
  if (fallback && fallback.length > 0) return fallback[0]!.toUpperCase();
  return null;
}

export async function POST(request: NextRequest) {
  let tempPath: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const userSerial = (formData.get('userSerial') as string)?.trim() ?? '';
    const userBrand = (formData.get('userBrand') as string)?.trim() ?? '';
    const userModel = (formData.get('userModel') as string)?.trim() ?? '';

    if (!userBrand || !userModel) {
      return Response.json(
        { passed: false, message: 'Brand and model are required.' },
        { status: 400 }
      );
    }

    if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0 || file.size > MAX_SIZE) {
      return Response.json(
        { passed: false, message: 'Please upload a screenshot of the serial number (Settings / About or label).' },
        { status: 400 }
      );
    }

    let serialToUse = userSerial.replace(/\s/g, '').toUpperCase();
    if (serialToUse.length < 7) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const extName = file.name?.match(/\.(png|jpe?g|webp)/i)?.[1] ?? 'png';
      tempPath = join(tmpdir(), `relay-serial-${randomBytes(8).toString('hex')}.${extName}`);
      await writeFile(tempPath, buffer);

      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      try {
        const result = await worker.recognize(tempPath);
        const text = result.data.text;
        const extracted = extractSerialFromOcr(text);
        if (extracted) serialToUse = extracted;
      } finally {
        await worker.terminate();
      }
    }

    if (!serialToUse || serialToUse.length < 7) {
      return Response.json({
        passed: false,
        message: 'Could not read serial number from the image. Please enter the serial number in Step 1 and upload a clear screenshot showing it.',
      });
    }

    const lookup = await lookupSerialByBrand(userBrand, serialToUse);
    if (!lookup || !lookup.model) {
      return Response.json({
        passed: false,
        message: `Serial number could not be verified for ${userBrand}. Please check the serial entered in Step 1 and that the screenshot clearly shows it.`,
      });
    }

    const matches = modelMatches(userModel, lookup.model);
    if (!matches) {
      return Response.json({
        passed: false,
        message: `Serial number is valid but the model does not match. We found: ${lookup.model}. You selected: ${userModel}.`,
      });
    }

    return Response.json({ passed: true, message: 'Serial number and model verified.' });
  } catch (err) {
    console.error('[verify-laptop-serial]', err);
    return Response.json(
      { passed: false, message: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  } finally {
    if (tempPath) {
      try {
        await unlink(tempPath);
      } catch {}
    }
  }
}
