/**
 * Storage options per Laptop model when they differ from the default set.
 * Used for vintage/special models like iBook G3.
 */
export const LAPTOP_STORAGE_BY_MODEL: Record<string, string[]> = {
  'iBook G3 (Original "Clamshell")': ['3.2GB', '6GB'],
  'iBook G3 12"': ['10GB', '15GB', '20GB', '30GB'],
  'iBook G3 14"': ['20GB', '30GB'],
};

const DEFAULT_LAPTOP_STORAGE = ['128GB', '256GB', '512GB', '1TB', '2TB', '4TB'] as const;

/** Storage options for the given laptop model. Returns default set when model has no custom storage. */
export function getLaptopStorageOptions(modelName: string): string[] {
  const trimmed = modelName.trim();
  if (!trimmed) return [...DEFAULT_LAPTOP_STORAGE];
  const options = LAPTOP_STORAGE_BY_MODEL[trimmed];
  if (options && options.length > 0) return options;
  return [...DEFAULT_LAPTOP_STORAGE];
}

export { DEFAULT_LAPTOP_STORAGE };
