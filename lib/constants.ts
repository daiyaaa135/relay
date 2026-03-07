import { Gadget, Transaction, Message } from './types';

/** Background hex colors for condition badges (glass-card style). */
export const CONDITION_BG: Record<string, string> = {
  New: '#00C896',
  Mint: '#00C2D4',
  Good: '#3B82F6',
  Fair: '#F5A623',
  Poor: '#EF4444',
};
/** Text color for condition badge (all white). */
export const CONDITION_TEXT: Record<string, string> = {
  New: '#FFFFFF',
  Mint: '#FFFFFF',
  Good: '#FFFFFF',
  Fair: '#FFFFFF',
  Poor: '#FFFFFF',
};
/** Normalize display condition (e.g. "Like New" -> "New") for color lookup. */
export function conditionForColor(condition: string): string {
  const c = (condition || '').trim();
  if (/^new$/i.test(c) || /like new/i.test(c)) return 'New';
  if (/^mint$/i.test(c) || /excellent/i.test(c)) return 'Mint';
  if (/^good$/i.test(c)) return 'Good';
  if (/^fair$/i.test(c)) return 'Fair';
  if (/^poor$/i.test(c)) return 'Poor';
  return c in CONDITION_BG ? c : 'Good';
}

export const MOCK_GADGETS: Gadget[] = [
  {
    id: '1',
    name: 'Sony WH-1000XM5',
    brand: 'Sony',
    category: 'Audio',
    credits: 1200,
    condition: 'Like New',
    specs: 'Noise Cancelling • 30h Battery',
    image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&q=80&w=600'
    ],
    seller: 'Alex Chen',
    sellerRating: 4.8,
    location: { city: 'Brooklyn', state: 'NY', distance: 2.4 },
    isMemberListing: true
  },
  {
    id: '2',
    name: 'iPhone 15 Pro Max',
    brand: 'Apple',
    category: 'Phones',
    credits: 2100,
    condition: 'Excellent',
    specs: '256GB • Natural Titanium',
    image: 'https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&q=80&w=600',
    images: [
      'https://images.unsplash.com/photo-1696446701796-da61225697cc?auto=format&fit=crop&q=80&w=600',
      'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600'
    ],
    seller: 'Sarah J.',
    sellerRating: 4.9,
    location: { city: 'Austin', state: 'TX', distance: 12.8 },
    isMemberListing: true
  },
  {
    id: '4',
    name: 'Keychron Q1 Pro',
    brand: 'Keychron',
    category: 'Gaming Consoles',
    credits: 450,
    condition: 'Good',
    specs: 'Gateron Brown • RGB',
    image: 'https://images.unsplash.com/photo-1595225405013-98973e04a11b?auto=format&fit=crop&q=80&w=600',
    seller: 'Mechanical Mike',
    sellerRating: 5.0,
    location: { city: 'Chicago', state: 'IL', distance: 1.1 },
    isMemberListing: true
  },
  {
    id: '5',
    name: 'Apple Watch Ultra',
    brand: 'Apple',
    category: 'Wearables',
    credits: 900,
    condition: 'Excellent',
    specs: 'Ocean Band • GPS + Cellular',
    image: 'https://images.unsplash.com/photo-1664144841993-4f82d27bd351?auto=format&fit=crop&q=80&w=600',
    seller: 'Tech Fan',
    sellerRating: 4.6,
    location: { city: 'Miami', state: 'FL', distance: 8.9 },
    isMemberListing: false
  }
];

export const BRANDS_BY_CATEGORY: Record<string, string[]> = {
  'Phones': ['Apple', 'Samsung', 'Google', 'OnePlus', 'Motorola', 'LG', 'Nokia', 'T-Mobile', 'Sony', 'Xiaomi', 'Nothing'],
  'Laptops': ['Apple', 'Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'Microsoft', 'Razer'],
  'Tablets': [], // Populated from data/tablet.csv
  'Headphones': [], // Populated from data/headphones.csv
  'Speaker': [], // Populated from data/speaker.csv
  'Console': [], // Populated from data/console.csv
  'Video Games': ['Nintendo', 'Atari', 'Neo Geo', 'PlayStation', 'Sega', 'Xbox'],
  'MP3': [], // Populated from data/relics.csv (e.g. iPod Touch, iPod Nano, iPod Classic)
  'Gaming Handhelds': [], // Populated from data/gaming-handhelds.csv
};

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: 't1', title: 'Listed iPhone 14', date: 'Oct 24', amount: 850, type: 'credit', status: 'Completed' },
  { id: 't2', title: 'iPad Air Swap', date: 'Oct 22', amount: 550, type: 'debit', status: 'Completed' },
  { id: 't3', title: 'Monthly Fee', date: 'Oct 01', amount: 10, type: 'debit', status: 'Automatic' },
  { id: 't4', title: 'Referral Bonus', date: 'Sep 28', amount: 25, type: 'credit', status: 'System' }
];

export const MOCK_MESSAGES: Message[] = [
  { id: 'm1', sender: 'Elena Vance', lastMessage: 'Is the camera still available for swap?', time: '2m ago', unread: true, avatar: '/avatars/avatar1.png' },
  { id: 'm2', sender: 'Alex Chen', lastMessage: 'Perfect, I will see you at the Ace Hotel lobby.', time: '1h ago', unread: false, avatar: '/avatars/avatar2.png' },
  { id: 'm3', sender: 'Sarah J.', lastMessage: 'Sent the credits over!', time: 'Yesterday', unread: false, avatar: '/avatars/avatar3.png' }
];

export const PRICING_PLANS = [
  {
    id: 'relay-plus',
    name: 'Rellaey+',
    price: '$5.99',
    annualPrice: '$49',
    interval: 'mo',
    description: 'The ultimate tech rotation experience.',
    features: [
      { text: 'All Guest features', included: true },
      { text: 'Unlimited gadget listings', included: true },
      { text: 'Earn credits automatically', included: true },
      { text: 'Spend credits on swaps', included: true },
      { text: 'Rellaey+ credit dashboard', included: true },
      { text: 'Priority customer support', included: true },
      { text: 'Early access to drops', included: true }
    ],
    popular: true
  },
  {
    id: 'guest',
    name: 'Guest',
    price: '$0',
    interval: 'forever',
    description: '',
    features: [
      { text: 'Browse limited listing', included: true },
      { text: 'Advanced search & filters', included: true },
      { text: 'View full listing details', included: true },
      { text: 'List your own gadgets', included: false },
      { text: 'Earn & spend credits', included: false },
      { text: 'Rellaey+ dashboard access', included: false }
    ],
    popular: false
  }
];

export const MOCK_ORDERS = [
  { id: 'ord-101', item: 'Sony WH-1000XM5', status: 'In Transit', type: 'incoming', date: 'Oct 28', credits: 1200, img: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?auto=format&fit=crop&q=80&w=400' },
  { id: 'ord-102', item: 'iPhone 13 Mini', status: 'Pending Verification', type: 'outgoing', date: 'Oct 27', credits: 850, img: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?auto=format&fit=crop&q=80&w=400' },
  { id: 'ord-103', item: 'Mechanical Keyboard', status: 'Delivered', type: 'incoming', date: 'Oct 20', credits: 350, img: 'https://images.unsplash.com/photo-1595225405013-98973e04a11b?auto=format&fit=crop&q=80&w=400' }
];
