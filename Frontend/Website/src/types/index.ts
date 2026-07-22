/**
 * Types and Interfaces for GameZ Gaming Cafe
 */

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role?: string;
}

export interface Station {
  id: string;
  name: string;
  ratePerHour: number;
  iconName: string;
  description: string;
  features: string[];
  totalSlots: number;
  availableNow: number;
  imagePlaceholder: string;
  imageUrl: string;
}

export interface GameGenre {
  id: string;
  name: string;
  iconName: string;
  description: string;
  popularGames: string[];
  colorClass: string;
}

export interface PricingTier {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  isPopular?: boolean;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  description: string;
  imageUrl?: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  text: string;
  date: string;
  role: string;
  isPlaceholder?: boolean;
}

export interface Booking {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  stationId: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string;   // HH:MM AM/PM
  durationHours: number;
  totalPrice: number;
  status: 'held' | 'confirmed' | 'expired' | 'cancelled';
  holdExpiresAt: number; // timestamp
  createdAt: number; // timestamp
  verificationCode?: string;
}

export interface Slot {
  date: string;
  time: string;
  available: boolean;
  stationId: string;
}
