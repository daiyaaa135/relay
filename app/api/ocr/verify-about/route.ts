import { NextRequest } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import { extractImeiAndCarrierFromOcr, verifyImeiAndCarrier } from '@/lib/imeiVerification';
import { lookupByImeidb, type ImeidbLookupResult } from '@/lib/imeidb';
import { isAliasForModel } from '@/lib/modelAliases';
import { lookupSamsungByImei } from '@/lib/snlookup';
import { createAnonClient } from '@/lib/supabase-server';

/** Max image size 10MB */
const MAX_SIZE = 10 * 1024 * 1024;
const isDev = process.env.NODE_ENV === 'development';

/** Normalize carrier for comparison (e.g. "T-Mobile" vs "T-Mobile US"). */
function normalizeCarrier(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[-–—]/g, '')
    .trim();
}

function isUnlockedCarrier(carrier: string): boolean {
  const u = carrier.toLowerCase().replace(/\s+/g, ' ').trim();
  return !u || u === 'unlocked' || u === 'sim free';
}

/** Normalize for "mentioned anywhere" check: lowercase, collapse spaces. */
function normalizeForModelSearch(s: string): string {
  return (s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** True if user's selected model appears anywhere in IMEIDB API response text (name, display_name, etc.). */
function userModelMentionedInSearchableText(searchableModelText: string | undefined, userModel: string): boolean {
  if (!searchableModelText || !userModel.trim()) return false;
  const haystack = normalizeForModelSearch(searchableModelText);
  const needle = normalizeForModelSearch(userModel);
  return haystack.includes(needle);
}

/** Returns true if OCR text from the OEM unlocking screenshot suggests the toggle is ON.
 * ON = blue capsule + checkmark (OCR may give "unlocked", "on", ✓, or "checkmark").
 * OFF = gray knob + X (OCR may give "off", "x", "disabled"). */
function checkOemUnlockingEnabled(ocrText: string): boolean {
  const t = ocrText.toLowerCase().replace(/\s+/g, ' ');
  const hasOemUnlock = /oem\s*unlock/.test(t);
  const hasOnOrUnlocked =
    /\b(on|enabled|yes|unlocked)\b/.test(t) || /[✓✔]|checkmark|check\s*mark/.test(t);
  const hasOff = /\b(off|disabled|no|x)\b/.test(t);
  return hasOemUnlock && hasOnOrUnlocked && !hasOff;
}

export async function POST(request: NextRequest) {
  // Require auth to prevent unauthenticated IMEI lookups and OCR abuse
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const anon = createAnonClient(token);
  const { data: { user }, error: authError } = await anon.auth.getUser(token);
  if (authError || !user?.id) {
    return Response.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
  let tempPath: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const userImei = (formData.get('userImei') as string)?.trim() ?? '';
    const userCarrier = (formData.get('userCarrier') as string)?.trim() ?? '';
    const userStorage = (formData.get('userStorage') as string)?.trim() ?? '';
    const userModel = (formData.get('userModel') as string)?.trim() ?? '';
    const userBrand = (formData.get('userBrand') as string)?.trim() ?? '';
    const isGoogle = userBrand.toLowerCase() === 'google';

    if (!file || typeof file.arrayBuffer !== 'function') {
      return Response.json(
        { error: 'Please upload an image (PNG or JPEG).' },
        { status: 400 }
      );
    }
    if (file.size > MAX_SIZE) {
      return Response.json(
        { error: 'Image is too large. Use a screenshot under 10MB.' },
        { status: 400 }
      );
    }
    // Google Pixel: require storage page screenshot (we don't verify via SNLookup)
    if (isGoogle) {
      const storageImage = formData.get('storageImage') as File | null;
      if (!storageImage || typeof storageImage.arrayBuffer !== 'function') {
        return Response.json(
          { error: 'For Google Pixel, please upload a screenshot of your Storage page (Settings > Storage).' },
          { status: 400 }
        );
      }
      if (storageImage.size > MAX_SIZE) {
        return Response.json(
          { error: 'Storage screenshot is too large. Use an image under 10MB.' },
          { status: 400 }
        );
      }
      if (isUnlockedCarrier(userCarrier)) {
        const oemImage = formData.get('oemUnlockingImage') as File | null;
        if (!oemImage || typeof oemImage.arrayBuffer !== 'function') {
          return Response.json(
            { error: 'For Unlocked Google Pixel, please upload a screenshot of Developer Options showing "OEM unlocking" toggled on.' },
            { status: 400 }
          );
        }
        if (oemImage.size > MAX_SIZE) {
          return Response.json(
            { error: 'OEM unlocking screenshot is too large. Use an image under 10MB.' },
            { status: 400 }
          );
        }
      }
    }
    if (!userImei || userImei.length < 15) {
      return Response.json(
        { error: 'Please enter a valid 15-digit IMEI in Step 1.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const extName = file.name?.match(/\.(png|jpe?g|webp)/i)?.[1] ?? 'png';
    tempPath = join(tmpdir(), `relay-ocr-${randomBytes(8).toString('hex')}.${extName}`);
    await writeFile(tempPath, buffer);

    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    try {
      // Try file path first (most reliable in Node); fallback to buffer
      let data: { text: string };
      try {
        const result = await worker.recognize(tempPath);
        data = result.data;
      } catch (pathErr) {
        const result = await worker.recognize(buffer);
        data = result.data;
      }
      const extracted = extractImeiAndCarrierFromOcr(data.text);
      const isSamsung = userBrand.toLowerCase() === 'samsung';
      const skipCarrierCheck = isGoogle && !isUnlockedCarrier(userCarrier);
      const result = verifyImeiAndCarrier(
        extracted,
        userImei,
        userCarrier,
        userStorage,
        isSamsung,
        userModel,
        skipCarrierCheck
      );
      if (!result.passed) {
        return Response.json({ passed: false, message: result.message });
      }
      // Blacklist check: always use IMEIDB
      console.log('[verify-about] OCR passed, calling IMEIDB for blacklist check...');
      const tacEntry = await lookupByImeidb(userImei);
      if (!tacEntry) {
        return Response.json({
          passed: false,
          message: 'No verification result for this IMEI. The IMEI was not found in our database.',
        });
      }
      if (tacEntry.blacklisted) {
        return Response.json({ passed: false, message: "sorry, you can't list this product" });
      }

      if (isSamsung) {
        // Samsung: model is verified from screenshot only. Use SNLookup only when carrier or storage missing from screenshot.
        const needCarrierFromSn = !extracted.carrier?.trim();
        const needStorageFromSn = userStorage && !extracted.capacity?.trim();
        if (needCarrierFromSn || needStorageFromSn) {
          const snResult = await lookupSamsungByImei(userImei);
          if (!snResult) {
            return Response.json({
              passed: false,
              message: 'Could not verify device details. No result from the lookup service. Please try again later.',
            });
          }
          if (needCarrierFromSn) {
            const uCarrier = normalizeCarrier(userCarrier);
            const isUserUnlocked = !userCarrier || uCarrier === 'unlocked' || uCarrier === 'sim free';
            if (!snResult.carrier?.trim()) {
              // No carrier from SNLookup — expected for unlocked devices, fail otherwise.
              if (!isUserUnlocked) {
                return Response.json({
                  passed: false,
                  message: 'Carrier could not be verified for this device. No carrier information was found.',
                });
              }
              console.log('[verify-about] Samsung: no carrier from SNLookup, user selected Unlocked — OK');
            } else {
              const snCarrier = normalizeCarrier(snResult.carrier);
              const carrierMatch = isUserUnlocked || snCarrier === uCarrier || snCarrier.includes(uCarrier) || uCarrier.includes(snCarrier);
              if (!carrierMatch) {
                console.log('[verify-about] Samsung carrier mismatch: userCarrier=', userCarrier, 'SNLookup carrier=', snResult.carrier);
                return Response.json({ passed: false, message: 'The carrier does not match the device.' });
              }
            }
          }
          if (needStorageFromSn && userStorage && snResult.storageFromModel) {
            const normalizedUserStorage = userStorage.toLowerCase().replace(/\s+/g, '').replace(/,/g, '').trim();
            const normalizedSnStorage = snResult.storageFromModel.toLowerCase().replace(/\s+/g, '').trim();
            const storageMatch =
              normalizedSnStorage === normalizedUserStorage ||
              normalizedSnStorage.includes(normalizedUserStorage) ||
              normalizedUserStorage.includes(normalizedSnStorage);
            if (!storageMatch) {
              console.log('[verify-about] Samsung storage mismatch: userStorage=', userStorage, 'SNLookup storage=', snResult.storageFromModel);
              return Response.json({ passed: false, message: 'The storage does not match the device.' });
            }
          }
        }
        return Response.json({
          passed: true,
          message: result.message,
        });
      }

      // Non-Samsung: use IMEIDB for model match. Pass if (1) user's model appears in API display/product text, or (2) IMEIDB alias is in our known aliases for this brand+model.
      const imeidbResult = tacEntry as ImeidbLookupResult;
      const mentionedAnywhere = userModelMentionedInSearchableText(imeidbResult.searchableModelText, userModel);
      const aliasMatch = isAliasForModel(userBrand, userModel, imeidbResult.alias);
      const modelMatch = mentionedAnywhere || aliasMatch;
      if (modelMatch === false) {
        return Response.json({ passed: false, message: 'The model does not match the device.' });
      }
      const modelNote = modelMatch ? ' Model matches IMEI.' : '';

      // Google + Unlocked: verify OEM unlocking toggle is ON in the screenshot
      if (isGoogle && isUnlockedCarrier(userCarrier)) {
        const oemImage = formData.get('oemUnlockingImage') as File | null;
        if (oemImage && typeof oemImage.arrayBuffer === 'function') {
          const oemBuffer = Buffer.from(await oemImage.arrayBuffer());
          let oemData: { text: string };
          try {
            const oemResult = await worker.recognize(oemBuffer);
            oemData = oemResult.data;
          } catch {
            return Response.json({
              passed: false,
              message: 'We couldn\'t read the OEM unlocking screenshot. Please upload a clear screenshot of Developer Options with "OEM unlocking" toggled on.',
            });
          }
          const oemPass = checkOemUnlockingEnabled(oemData.text);
          if (!oemPass) {
            return Response.json({
              passed: false,
              message: 'OEM unlocking must be toggled on for Unlocked devices. Please upload a screenshot of Developer Options with "OEM unlocking" enabled.',
            });
          }
        }
      }

      return Response.json({
        passed: true,
        message: result.message + modelNote,
      });
    } finally {
      await worker.terminate();
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    if (isDev) {
      console.error('[OCR verify-about]', msg, stack);
    }
    const userMessage =
      msg.includes('fetch') || msg.includes('ENOENT') || msg.includes('Cannot find')
        ? 'OCR service could not load. Please try again.'
        : 'Could not read the image. Please upload a clear screenshot of your About page (Settings > General > About).';
    return Response.json(
      {
        error: isDev && msg ? `${userMessage} (${msg})` : userMessage,
      },
      { status: 500 }
    );
  } finally {
    if (tempPath) {
      try {
        await unlink(tempPath);
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
