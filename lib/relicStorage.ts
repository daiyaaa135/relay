/**
 * Storage options per Relics model.
 * Aligned with SellCell / product specs (e.g. iPod Touch 7th: 32/128/256GB; iPod Classic 7th: 160GB).
 * Sony Walkman models have fixed storage per unit.
 */
export const RELIC_STORAGE_BY_MODEL: Record<string, string[]> = {
  'iPod Touch (7th Gen)': ['32GB', '128GB', '256GB'],
  'iPod Touch (6th Gen)': ['16GB', '32GB', '64GB', '128GB'],
  'iPod Nano (7th Gen)': ['8GB', '16GB'],
  'iPod Classic (7th Gen)': ['160GB'],
  'iPod Classic (6th Gen)': ['80GB', '160GB'],
  'iPod Classic (1st Gen)': ['5GB', '10GB'],
  // Sony Walkman – fixed storage per model
  'Walkman NW-A306': ['16GB'],
  'NW-A35': ['16GB'],
  'NW-A45': ['16GB'],
  'NW-A55': ['16GB'],
  'NW-A105': ['16GB'],
  'NW-A106': ['32GB'],
  'NW-ZX300': ['64GB'],
  'NW-ZX505': ['16GB'],
  'NW-ZX507': ['16GB'],
  'NW-WM1A': ['128GB'],
  'NW-WM1Z': ['256GB'],
  'NW-WM1AM2': ['128GB'],
  'NW-WM1ZM2': ['256GB'],
  'NW-WS413': ['4GB'],
  'NW-WS414': ['8GB'],
  'NW-WS623': ['4GB'],
  'NW-WS625': ['16GB'],
  'NW-E394': ['8GB'],
  'NW-E395': ['16GB'],
};

const NO_STORAGE_OPTION = '—';

/** Storage options for the given relic model. Returns ["—"] when model has no storage variants or is unknown. */
export function getRelicStorageOptions(modelName: string): string[] {
  const trimmed = modelName.trim();
  if (!trimmed) return [NO_STORAGE_OPTION];
  const options = RELIC_STORAGE_BY_MODEL[trimmed];
  if (options && options.length > 0) return options;
  return [NO_STORAGE_OPTION];
}

export { NO_STORAGE_OPTION };
