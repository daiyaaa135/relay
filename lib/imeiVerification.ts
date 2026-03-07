/**
 * Parse OCR text from a phone About page screenshot for IMEI and Carrier (Carrier Lock).
 * Used to cross-reference with user-entered IMEI and carrier.
 */

/** Normalize IMEI: digits only (strip spaces, dashes). IMEI is 15 digits. */
export function normalizeImei(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.slice(-15); // use last 15 in case of leading noise
}

/** Normalize carrier for comparison: lowercase, collapse spaces, strip version numbers (e.g. "67.0.1"). */
export function normalizeCarrier(value: string): string {
  let s = value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  // Strip trailing version-like suffix (e.g. "T-Mobile 67.0.1" -> "t-mobile")
  s = s.replace(/\s+[\d.]+\s*$/, '').trim();
  // Common variants
  if (s.includes('t-mobile') || s.includes('t‑mobile') || s === 'tmobile') return 't-mobile';
  if (s.includes('at&t') || s === 'att') return 'at&t';
  if (s.includes('verizon')) return 'verizon';
  if (s.includes('unlocked') || s === 'sim free') return 'unlocked';
  return s;
}

/** Map our dropdown carrier value to normalized form for comparison. */
export function normalizeCarrierInput(carrier: string): string {
  return normalizeCarrier(carrier);
}

/** Normalize storage/capacity for comparison: e.g. "512 GB", "512GB", "1 TB" -> "512gb", "1tb". */
export function normalizeStorage(value: string): string {
  const s = value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/,/g, '')
    .trim();
  return s;
}

/** Normalize model/product name for comparison: lowercase, collapse spaces, strip extra punctuation. */
export function normalizeModelForScreenshot(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Check if user model matches extracted product name or model name from screenshot. */
function screenshotModelMatches(
  userModel: string,
  productName: string | null | undefined,
  modelName: string | null | undefined
): boolean {
  const u = normalizeModelForScreenshot(userModel);
  if (!u) return true;
  const p = productName ? normalizeModelForScreenshot(productName) : '';
  const m = modelName ? normalizeModelForScreenshot(modelName) : '';
  if (p && (u === p || u.includes(p) || p.includes(u))) return true;
  if (m && (u === m || u.includes(m) || m.includes(u))) return true;
  return false;
}

export type ExtractedAbout = {
  imei: string | null;
  /** All IMEIs found (e.g. from "IMEI", "IMEI 1", "IMEI 2"); used so any one match passes (Samsung dual-IMEI). */
  imeis?: string[];
  carrier: string | null;
  capacity: string | null;
};

/**
 * Extract IMEI and Carrier from OCR text (e.g. from iOS Settings > General > About).
 * Prefers the "Carrier" row (e.g. "T-Mobile 67.0.1") over "Carrier Lock" (e.g. "SIM locked") for carrier name.
 */
export function extractImeiAndCarrierFromOcr(ocrText: string): ExtractedAbout {
  const lines = ocrText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let imei: string | null = null;
  const imeis: string[] = [];
  let carrier: string | null = null;
  let carrierLockValue: string | null = null;
  let capacity: string | null = null;
  let productName: string | null = null;
  let modelName: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const lower = line.toLowerCase();
    const nextLine = lines[i + 1];

    // IMEI: label might be "IMEI", "IMEI 1", "IMEI 2", "IMEI1", "IMEI2". Collect every one found.
    if (lower.includes('imei')) {
      const afterColon = line.split(/[:\-]\s*/).slice(1).join(' ').trim();
      const fromLine = (afterColon || line).replace(/\D/g, '');
      let found: string | null = null;
      if (fromLine.length >= 15) {
        found = fromLine.slice(-15);
      } else if (nextLine) {
        const nextDigits = nextLine.replace(/\D/g, '');
        if (nextDigits.length >= 15) found = nextDigits.slice(-15);
      }
      if (found && !imeis.includes(found)) {
        imeis.push(found);
        if (!imei) imei = found;
      }
    }

    // "Carrier" row (carrier name, e.g. "T-Mobile 67.0.1") – use for verification. Handle "Carrier: T-Mobile" or "Carrier T-Mobile".
    if (lower === 'carrier' || (lower.startsWith('carrier') && !lower.includes('carrier lock'))) {
      const afterColon = line.split(/[:\-]\s*/).slice(1).join(' ').trim();
      const afterLabel = line.replace(/^carrier\s*[:\-]?\s*/i, '').trim();
      if (afterColon) {
        carrier = afterColon;
      } else if (afterLabel && afterLabel.length > 0) {
        carrier = afterLabel;
      } else if (lines[i + 1]) {
        carrier = lines[i + 1]!.trim();
      }
    }
    // "Carrier Lock" row (e.g. "SIM locked") – fallback if no "Carrier" row found
    if (!carrier && lower.includes('carrier lock')) {
      const afterColon = line.split(/[:\-]\s*/).slice(1).join(' ').trim();
      if (afterColon) {
        carrierLockValue = afterColon;
      } else if (lines[i + 1]) {
        carrierLockValue = lines[i + 1]!.trim();
      }
    }

    // "Capacity" row (e.g. "512 GB") – for storage verification
    if (lower.includes('capacity') && !capacity) {
      const afterColon = line.split(/[:\-]\s*/).slice(1).join(' ').trim();
      const afterLabel = line.replace(/^capacity\s*[:\-]?\s*/i, '').trim();
      if (afterColon) {
        capacity = afterColon;
      } else if (afterLabel && afterLabel.length > 0) {
        capacity = afterLabel;
      } else if (lines[i + 1]) {
        capacity = lines[i + 1]!.trim();
      }
    }

    // "Product name" (e.g. Samsung "Galaxy S22")
    if ((lower === 'product name' || lower.startsWith('product name')) && !productName) {
      const afterColon = line.split(/[:\-]\s*/).slice(1).join(' ').trim();
      const afterLabel = line.replace(/^product\s+name\s*[:\-]?\s*/i, '').trim();
      if (afterColon) {
        productName = afterColon;
      } else if (afterLabel && afterLabel.length > 0) {
        productName = afterLabel;
      } else if (nextLine) {
        productName = nextLine;
      }
    }
    // "Model name" (e.g. Samsung "SM-S901U")
    if ((lower === 'model name' || lower.startsWith('model name')) && !modelName) {
      const afterColon = line.split(/[:\-]\s*/).slice(1).join(' ').trim();
      const afterLabel = line.replace(/^model\s+name\s*[:\-]?\s*/i, '').trim();
      if (afterColon) {
        modelName = afterColon;
      } else if (afterLabel && afterLabel.length > 0) {
        modelName = afterLabel;
      } else if (nextLine) {
        modelName = nextLine;
      }
    }
  }

  // Fallback: find any 15-digit sequence in the text (IMEI format)
  const fallbackMatches = ocrText.replace(/\s/g, '').match(/\d{15}/g);
  if (fallbackMatches) {
    for (const m of fallbackMatches) {
      if (!imeis.includes(m)) imeis.push(m);
    }
    if (!imei) imei = fallbackMatches[0] ?? null;
  }

  if (!carrier && carrierLockValue) carrier = carrierLockValue;
  return {
    imei,
    imeis: imeis.length > 0 ? imeis : undefined,
    carrier,
    capacity,
    productName: productName ?? undefined,
    modelName: modelName ?? undefined,
  };
}

export type VerificationResult = {
  passed: boolean;
  message: string;
  extracted?: ExtractedAbout;
};

/**
 * Build a specific error message when screenshot verification fails.
 * When useSnlookupForMissing is true (Samsung), we only fail on fields present in the screenshot;
 * missing carrier or storage are not reported here (SNLookup will verify them later).
 * When skipCarrierCheck is true (e.g. Google + non-Unlocked), carrier is not included in failures.
 */
function buildScreenshotFailureMessage(
  imeiMatch: boolean,
  carrierMatch: boolean,
  storageMatch: boolean,
  modelMatch: boolean,
  hasExtractedCarrier: boolean,
  hasExtractedCapacity: boolean,
  hasExtractedModel: boolean,
  useSnlookupForMissing: boolean,
  skipCarrierCheck?: boolean
): string {
  if (useSnlookupForMissing) {
    const failures: string[] = [];
    if (!imeiMatch) failures.push('IMEI');
    if (hasExtractedModel && !modelMatch) failures.push('model');
    if (hasExtractedCarrier && !carrierMatch) failures.push('carrier');
    if (hasExtractedCapacity && !storageMatch) failures.push('storage');
    if (failures.length === 0) return '';
    if (failures.length === 1) return `The screenshot does not match the ${failures[0]}.`;
    return `The screenshot does not match the ${failures.join(' and ')}.`;
  }
  const failures: string[] = [];
  if (!imeiMatch) failures.push('IMEI');
  if (!skipCarrierCheck && !carrierMatch) failures.push('carrier');
  if (!storageMatch) failures.push('storage');
  if (failures.length === 1) return `The screenshot does not match the ${failures[0]}.`;
  if (failures.length === 2) return `The screenshot does not match the ${failures[0]} and ${failures[1]}.`;
  return `The screenshot does not match the ${failures[0]}, ${failures[1]}, and ${failures[2]}.`;
}

/**
 * Compare extracted IMEI, carrier, capacity, and model from screenshot with user input.
 * Returns passed: true only when required checks pass.
 * When useSnlookupForMissing is true (Samsung), carrier and storage are only checked if present in the screenshot;
 * when missing, SNLookup is used later to verify them. Model is always checked from screenshot when present (Samsung).
 * When skipCarrierCheck is true (e.g. Google + user did not select Unlocked), carrier is not verified from the screenshot.
 */
export function verifyImeiAndCarrier(
  extracted: ExtractedAbout,
  userImei: string,
  userCarrier: string,
  userStorage?: string,
  useSnlookupForMissing?: boolean,
  userModel?: string,
  skipCarrierCheck?: boolean
): VerificationResult {
  const normalizedUserImei = normalizeImei(userImei);
  const normalizedUserCarrier = normalizeCarrierInput(userCarrier);
  const normalizedUserStorage = userStorage ? normalizeStorage(userStorage) : '';

  if (!normalizedUserImei || normalizedUserImei.length < 15) {
    return { passed: false, message: 'Please enter a valid 15-digit IMEI in Step 1.', extracted };
  }

  const imeiMatch =
    (extracted.imeis && extracted.imeis.length > 0
      ? extracted.imeis.some((e) => normalizeImei(e) === normalizedUserImei)
      : extracted.imei != null && normalizeImei(extracted.imei) === normalizedUserImei);

  const hasExtractedModel =
    (extracted.productName != null && extracted.productName.trim().length > 0) ||
    (extracted.modelName != null && extracted.modelName.trim().length > 0);
  const modelMatch =
    !useSnlookupForMissing ||
    !userModel ||
    !hasExtractedModel ||
    screenshotModelMatches(userModel, extracted.productName ?? null, extracted.modelName ?? null);

  const extractedCarrierNorm = extracted.carrier != null ? normalizeCarrier(extracted.carrier) : '';
  const hasExtractedCarrier = extracted.carrier != null && extracted.carrier.trim().length > 0;
  const carrierMatch =
    (normalizedUserCarrier === 'unlocked' && !hasExtractedCarrier) ||
    (hasExtractedCarrier &&
      (normalizedUserCarrier === 'other carriers'
        ? extracted.carrier!.trim().length > 0
        : extractedCarrierNorm === normalizedUserCarrier ||
          extractedCarrierNorm.includes(normalizedUserCarrier) ||
          normalizedUserCarrier.includes(extractedCarrierNorm)));

  const extractedCapacityNorm = extracted.capacity != null ? normalizeStorage(extracted.capacity) : '';
  const hasExtractedCapacity = extracted.capacity != null && extracted.capacity.trim().length > 0;
  const storageMatch =
    !normalizedUserStorage ||
    !hasExtractedCapacity ||
    extractedCapacityNorm === normalizedUserStorage ||
    extractedCapacityNorm.includes(normalizedUserStorage) ||
    normalizedUserStorage.includes(extractedCapacityNorm);

  const requireCarrier = !skipCarrierCheck && (!useSnlookupForMissing || hasExtractedCarrier);
  const requireStorage = !useSnlookupForMissing || hasExtractedCapacity;
  const passed =
    imeiMatch &&
    modelMatch &&
    (!requireCarrier || carrierMatch) &&
    (!requireStorage || storageMatch);

  if (!passed) {
    const message = buildScreenshotFailureMessage(
      imeiMatch,
      carrierMatch,
      storageMatch,
      modelMatch,
      hasExtractedCarrier,
      hasExtractedCapacity,
      hasExtractedModel,
      useSnlookupForMissing ?? false,
      skipCarrierCheck
    );
    return { passed: false, message, extracted };
  }

  return {
    passed: true,
    message: 'IMEI, carrier, and storage match.',
    extracted,
  };
}
