export interface Gadget {
  id: string;
  name: string;
  brand: string;
  category: string;
  credits: number;
  /** Optional listing status, e.g. 'Available', 'Reserved', 'Sold' */
  status?: string | null;
  condition: 'New' | 'Mint' | 'Good' | 'Fair' | 'Poor' | string;
  specs: string;
  description?: string | null;
  color?: string | null;
  carrier?: string | null;
  verification_code?: string | null;
  image: string;
  images?: string[];
  seller: string;
  /** Seller's profile avatar URL for display on cards */
  sellerAvatarUrl?: string | null;
  /** Seller's profile (user) UUID, for creating swaps / messaging */
  sellerId?: string;
  sellerRating: number;
  /** Seller's profile created_at (ISO string) for "Joined Month Year" */
  sellerJoinedAt?: string | null;
  location?: {
    city: string;
    state: string;
    distance: number;
  };
  /** Optional coords for distance calculation when user location is known */
  latitude?: number;
  longitude?: number;
  /** Seller's 2 pickup locations; buyer chooses one when proposing times. displayName is full address when set. */
  pickupLocations?: { city: string; state: string; latitude: number; longitude: number; displayName?: string }[];
  isMemberListing?: boolean;
  /** When the listing was created (ISO string). Present when fetched for list views. */
  created_at?: string;
}

export interface Transaction {
  id: string;
  title: string;
  date: string;
  amount: number;
  type: 'credit' | 'debit';
  status: 'Completed' | 'Pending' | 'Automatic' | 'System';
}

export interface Message {
  id: string;
  sender: string;
  lastMessage: string;
  time: string;
  unread: boolean;
  avatar: string;
}
