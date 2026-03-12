/**
 * Laptop device lookup: match user input (BRAND, MODEL, CHIP/CPU, YEAR, RAM, SIZE)
 * against supported devices. Credits = PRICE when matched; 0 and message when not supported.
 */

export type LaptopLookupParams = {
  brand: string;
  model: string;
  chipCpu: string;
  year: string;
  ram: string;
  size: string;
};

export type LaptopLookupResult = {
  credits: number;
  supported: boolean;
  message?: string;
};

/**
 * Call the API to look up credits for a laptop. Returns credits (price) if device is in the list, else 0 and message.
 */
export async function lookupLaptopCredits(params: LaptopLookupParams): Promise<LaptopLookupResult> {
  const q = new URLSearchParams({
    brand: params.brand?.trim() ?? '',
    model: params.model?.trim() ?? '',
    chipCpu: params.chipCpu?.trim() ?? '',
    year: params.year?.trim() ?? '',
    ram: params.ram?.trim() ?? '',
    size: params.size?.trim() ?? '',
  });
  const res = await fetch(`/api/devices/lookup?${q.toString()}`);
  if (!res.ok) return { credits: 0, supported: false, message: 'We don\'t support this type of device.' };
  const data = await res.json();
  return {
    credits: data.credits ?? 0,
    supported: data.supported ?? false,
    message: data.message,
  };
}
