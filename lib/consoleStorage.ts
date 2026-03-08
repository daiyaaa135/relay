/**
 * Storage options per Console model (key is display model: MODEL or "MODEL VARIANT" from data/console.csv).
 * Used for the Console storage dropdown; models not listed or with empty storage get "—".
 */
export const CONSOLE_STORAGE_BY_MODEL: Record<string, string[]> = {
  // Nintendo
  'Switch': ['32GB'],
  'Switch 2': ['256GB'],
  'Switch - OLED': ['64GB'],
  'Switch Lite': ['32GB'],
  'Wii': [],
  'Original 3DS XL': ['4GB'],
  'New 3DS XL': ['4GB'],
  // Steam Deck
  'Deck': ['64GB', '256GB', '512GB'],
  'Deck OLED Edition': ['512GB', '1TB'],
  'Deck OLED Limited Edition': ['1TB'],
  'Deck OLED Limited Edition White': ['1TB'],
  // Analogue 3D – no storage
  '3D': [],
  // Xbox
  'Series X (2020)': ['1TB'],
  'Series S (2020)': ['512GB'],
  'One S (2016)': ['500GB', '1TB', '2TB'],
  'One X (2017)': ['1TB'],
  'One (2013)': ['500GB'],
  // PlayStation
  '5 Standard Edition (2020)': ['825GB'],
  '5 Slim Standard Edition (2023)': ['1TB'],
  '5 Slim Digital Edition (2023)': ['1TB'],
  '5 Digital Edition (2020)': ['825GB'],
  '4 Pro': ['1TB'],
  '4 Slim': ['500GB', '1TB'],
  '4': ['500GB', '1TB'],
  // Asus ROG Ally (display model = "Ally VARIANT")
  'Ally Ally X': ['1TB'],
  'Ally Handheld Console (original)': ['512GB'],
  // Lenovo Legion Go (display model = "Go VARIANT")
  'Go 512GB': ['512GB'],
  'Go 1TB': ['1TB'],
  'Go S 16GB': ['512GB'],
  'Go S 1TB Glacier White': ['1TB'],
  'Go S Z1 Extreme': ['512GB'],
  'Go 2 Z2 Extreme': ['1TB'],
  // Arcade1Up
  'Counter-Cade': [],
  'Deluxe Street Fighter 2 Champion Edition': [],
};

const NO_STORAGE_OPTION = '—';

/** Storage options for the given console model. Returns ["—"] when model has no storage variants or is unknown. */
export function getConsoleStorageOptions(modelName: string): string[] {
  const trimmed = modelName.trim();
  if (!trimmed) return [NO_STORAGE_OPTION];
  const options = CONSOLE_STORAGE_BY_MODEL[trimmed];
  if (options && options.length > 0) return options;
  return [NO_STORAGE_OPTION];
}

export { NO_STORAGE_OPTION as CONSOLE_NO_STORAGE_OPTION };
