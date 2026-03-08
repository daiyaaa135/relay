// Central "database" mapping brand name -> logo URL.
// This is shared across categories (Phones, Laptops, Tablets, Headphones, etc).
// When a brand is missing here, the UI falls back to a generic category icon.

export const BRAND_LOGOS: Record<string, string> = {
  // Core ecosystem brands
  Apple: 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
  Samsung: '/brands/samsung-logo.png',
  Google: 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg',
  OnePlus: '/brands/oneplus-logo.png',
  Motorola: '/brands/motorola-logo.png',

  // Laptop & PC brands
  Acer: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Acer_2011.svg',
  Asus: 'https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg',
  Dell: 'https://upload.wikimedia.org/wikipedia/commons/4/48/Dell_Logo.svg',
  HP: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/HP_logo_2012.svg',
  Huawei: 'https://upload.wikimedia.org/wikipedia/commons/6/66/Huawei_Standard_logo.svg',
  Lenovo: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Lenovo_logo_2015.svg',
  Microsoft: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
  'Microsoft Surface': 'https://upload.wikimedia.org/wikipedia/commons/4/44/Microsoft_logo.svg',
  MSI: 'https://upload.wikimedia.org/wikipedia/commons/2/2c/Msi-Logo.svg',
  Razer: 'https://upload.wikimedia.org/wikipedia/en/1/1b/Razer_Serpent_logo.svg',
  Thunderobot: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Thunderobot_logo.svg',

  // Audio brands
  Beats: '/icons/speaker.png',
  Bose: '/icons/speaker.png',
  Sony: '/brand-logos/sony.svg',
  Sennheiser: 'https://upload.wikimedia.org/wikipedia/commons/7/75/Sennheiser-Logo.svg',
  JBL: '/icons/speaker.png',
  'Bowers & Wilkins': '/icons/speaker.png',
  Marshall: '/icons/speaker.png',
  Shure: 'https://upload.wikimedia.org/wikipedia/commons/0/0f/Shure_logo.svg',
  Skullcandy: 'https://upload.wikimedia.org/wikipedia/commons/6/60/Skullcandy_logo.svg',

  // Console brands
  Nintendo: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Nintendo.svg',
  'PlayStation': 'https://upload.wikimedia.org/wikipedia/commons/4/4e/PlayStation_logo.svg',
  Xbox: 'https://upload.wikimedia.org/wikipedia/commons/4/43/Xbox_one_logo.svg',

  // Speaker brands
  'Bang & Olufsen': '/icons/speaker.png',
  'Harman Kardon': '/icons/speaker.png',
  Polk: '/icons/speaker.png',
  SVS: '/icons/speaker.png',
  Sonos: '/icons/speaker.png',
  Soundcore: '/icons/speaker.png',
  TRIBIT: '/icons/speaker.png',
  Totem: '/icons/speaker.png',
  'Ultimate Ears': '/icons/speaker.png',
  Yamaha: '/icons/speaker.png',

  // Other gaming brands
  Analogue: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Analogue_logo.svg',
  Arcade1Up: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Arcade1Up_logo.svg',
  'Asus ROG': 'https://upload.wikimedia.org/wikipedia/commons/1/1c/ASUS_ROG_Logo.svg',
  'Lenovo Legion': 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Lenovo_Legion_logo.svg',
  Steam: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg',
  Sega: 'https://upload.wikimedia.org/wikipedia/commons/6/6c/SEGA_logo.svg',
};

