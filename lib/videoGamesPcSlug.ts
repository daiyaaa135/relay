/**
 * Map Video Games console display name (from our dropdown) to PriceCharting URL slug.
 * Used by /api/video-games/games to fetch game list for a console.
 */
export const CONSOLE_TO_PC_SLUG: Record<string, string> = {
  'Nintendo NES': 'nintendo-nes',
  'Super Nintendo': 'super-nintendo',
  'Nintendo 64': 'nintendo-64',
  'Gamecube': 'gamecube',
  'Wii': 'wii',
  'Wii U': 'wii-u',
  'Switch': 'nintendo-switch',
  'Switch 2': 'nintendo-switch-2',
  'GameBoy': 'gameboy',
  'GameBoy Color': 'gameboy-color',
  'GameBoy Advance': 'gameboy-advance',
  'Nintendo DS': 'nintendo-ds',
  'Nintendo 3DS': 'nintendo-3ds',
  'Virtual Boy': 'virtual-boy',
  'Atari 2600': 'atari-2600',
  'Atari 5200': 'atari-5200',
  'Atari 7800': 'atari-7800',
  'Atari 400/800': 'atari-400',
  'Atari Lynx': 'atari-lynx',
  'Atari Jaguar': 'jaguar',
  'Neo Geo MVS': 'neo-geo-mvs',
  'Neo Geo AES': 'neo-geo-aes',
  'Neo Geo CD': 'neo-geo-cd',
  'Neo Geo Pocket Color': 'neo-geo-pocket-color',
  'PlayStation': 'playstation',
  'PlayStation 2': 'playstation-2',
  'PlayStation 3': 'playstation-3',
  'PlayStation 4': 'playstation-4',
  'PlayStation 5': 'playstation-5',
  'PSP': 'psp',
  'PlayStation Vita': 'playstation-vita',
  'Sega Master System': 'sega-master-system',
  'Sega Genesis': 'sega-genesis',
  'Sega CD': 'sega-cd',
  'Sega 32X': 'sega-32x',
  'Sega Saturn': 'sega-saturn',
  'Sega Dreamcast': 'sega-dreamcast',
  'Sega Game Gear': 'sega-game-gear',
  'Sega Pico': 'sega-pico',
  'Xbox': 'xbox',
  'Xbox 360': 'xbox-360',
  'Xbox One': 'xbox-one',
  'Xbox Series X': 'xbox-series-x',
};

export function getPcSlugForConsole(consoleName: string): string | null {
  const slug = CONSOLE_TO_PC_SLUG[consoleName.trim()];
  return slug ?? null;
}
