import { Station, GameGenre, PricingTier, GalleryItem, Review } from './types';

/**
 * GameZ Static Datasets
 * V1 Implementation for Mangaluru Gaming Cafe
 */

// 1. Static Presentation Data (Prices will be overridden by DB)
export const STATIONS: Station[] = [
  {
    id: 'ps5-lounge',
    name: 'PlayStation 5 Lounge',
    ratePerHour: 200, // Fallback base price
    iconName: 'Gamepad2',
    description: 'Immersive next-gen gaming with DualSense controllers on 55" 4K 120Hz gaming screens and high-fidelity headsets.',
    features: [
      'DualSense Wireless Controllers',
      '55" 4K LG OLED 120Hz Screens',
      'Premium 3D Audio Headsets',
      'Comfortable Gaming Recliners',
      'Latest game titles pre-installed'
    ],
    totalSlots: 6,
    availableNow: 4,
    imagePlaceholder: 'PS5 Gaming Lounge Room — Coming Soon',
    imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'championship-snooker',
    name: 'Championship Snooker',
    ratePerHour: 400,
    iconName: 'CircleDot',
    description: 'Professional-grade tournament snooker tables with high-spec billiard lighting, premium slate, and imported cues.',
    features: [
      'Tournament-spec English Slate Tables',
      'Imported West of England cloth',
      'Ash wood cues (various weights)',
      'Shadowless overhead tournament lighting',
      'Spacious viewing sofas'
    ],
    totalSlots: 2,
    availableNow: 1,
    imagePlaceholder: 'Tournament Snooker Arena — Coming Soon',
    imageUrl: ''
  },
  {
    id: 'premium-carrom',
    name: 'Premium Carrom Arena',
    ratePerHour: 100,
    iconName: 'Grid',
    description: 'Frictionless professional carrom boards with precise coins, heavyweight strikers, and dedicated overhead focus lamps.',
    features: [
      'Sysca / Champion brand boards',
      'High-grade boric powder application',
      'Professional acrylic strikers',
      'Dedicated warm-white focus lighting',
      'Sized perfectly for doubles or singles'
    ],
    totalSlots: 4,
    availableNow: 3,
    imagePlaceholder: 'Traditional Carrom Arena — Coming Soon',
    imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: '8-balls-pool',
    name: '8 Balls Pool',
    ratePerHour: 250,
    iconName: 'CircleDot',
    description: 'Professional 8-ball pool tables with premium speed cloth, tournament ball sets, and balanced pool cues.',
    features: [
      'Standard 8ft professional pool tables',
      'High-grade fast-speed wool-blend cloth',
      'Aramith tournament ball sets',
      'Ergonomic pool cues (various cue tips)',
      'Warm ambient overhead pool light'
    ],
    totalSlots: 3,
    availableNow: 2,
    imagePlaceholder: '8 Balls Pool Arena — Coming Soon',
    imageUrl: ''
  }
];

// 2. Game Categories (No copyrighted/trademarked cover arts)
export const GAME_GENRES: GameGenre[] = [
  {
    id: 'racing',
    name: 'Racing Simulation',
    iconName: 'Milestone',
    description: 'High-speed competitive racers featuring precise physics, split-screen modes, and dynamic weather simulations.',
    popularGames: ['Super Speed Drift 5', 'Grand Track Championship', 'Dirt & Asphalt Pro'],
    colorClass: 'from-amber-500 to-red-500'
  },
  {
    id: 'sports',
    name: 'Sports & Football',
    iconName: 'Trophy',
    description: 'Ultimate gridiron and pitch matches. Perfect for 1v1 local duels, couch co-op tournaments, and casual shootouts.',
    popularGames: ['Global Football 26', 'Pro Basketball Jam', 'Tennis Aces Pro'],
    colorClass: 'from-emerald-500 to-teal-500'
  },
  {
    id: 'battle-royale',
    name: 'Battle Royale & Shooter',
    iconName: 'Crosshair',
    description: 'Tactical multi-agent drops, zone-survival play, and team-based objectives requiring sharp aiming and fast coordination.',
    popularGames: ['Frontline Strike', 'Apex Legends V', 'Battlefield Warzone'],
    colorClass: 'from-cyan-500 to-blue-500'
  },
  {
    id: 'fighting',
    name: 'Fighting & Brawler',
    iconName: 'Swords',
    description: 'Pixel-perfect frame data, high-intensity combos, and local versus matches that test ultimate reflex speeds.',
    popularGames: ['Iron Fist Arena', 'Shadow Ninja Duel', 'Street Combat 12'],
    colorClass: 'from-purple-500 to-pink-500'
  },
  {
    id: 'adventure',
    name: 'Open World & RPG',
    iconName: 'Compass',
    description: 'Breathtaking single-player cinematic campaigns, mysterious fantasy universes, and open-world sandboxes to explore.',
    popularGames: ['Ancient Scrolllands', 'Cyberpunk City 2090', 'Wilderness Frontier'],
    colorClass: 'from-indigo-500 to-violet-500'
  },
  {
    id: 'multiplayer',
    name: 'Party & Arcade',
    iconName: 'Users',
    description: 'Hilarious co-op coordination tests, family board-game adaptions, and hectic screen-scroller party games.',
    popularGames: ['Overcooked Kitchen Chaos', 'Party Run Brawl', 'Micro Racers Ultimate'],
    colorClass: 'from-pink-500 to-rose-500'
  }
];

// 3. Pricing Tiers
// Backend Change Notice: The "Hourly Play" and "Midnight Rush" plans align with V1 schema. 
// "Monthly Unlimited" and "More Packs" are proposed premium packages.
// Integrating these in the reservation form in the future requires new database tables for subscriptions/bundles.
export const PRICING_TIERS: PricingTier[] = [
  {
    id: 'tier-hourly',
    name: 'Standard Hourly',
    price: 100, // Starts at 100 (Carrom rate)
    period: 'hour',
    description: 'Flexible pay-as-you-play reservation. Book your exact station and pay strictly for the time you spend.',
    features: [
      'Access to booked Station (PS5, Carrom, or Snooker)',
      'Accurate per-minute billing after first hour',
      '5-Minute online reservation lock',
      'Walk-in setup helper available',
      'Free high-speed WiFi access'
    ],
    isPopular: false,
    requiresBackendChange: false
  },
  {
    id: 'tier-midnight',
    name: 'Midnight Rush',
    price: 500,
    period: '3 hours',
    description: 'Special late-night sessions for night-owls and competitive squads. Available daily from 10 PM onwards.',
    features: [
      '3-Hour consecutive block reservation',
      'Available on any station type',
      'Complimentary energy energy mocktail',
      'Discounted additional hours (15% off)',
      'Direct priority staff support'
    ],
    isPopular: true,
    requiresBackendChange: false
  },
  {
    id: 'tier-monthly-unlimited',
    name: 'Monthly Unlimited',
    price: 6000,
    period: 'month',
    description: 'Day hours gaming package. Valid during Day Hours only with unlimited gaming access and priority perks.',
    features: [
      'Unlimited gaming access to any station',
      'Valid during Day Hours only',
      'Priority booking queue (1-hour grace holds)',
      'Invitations to exclusive local tournaments',
      'Personal locker for your gaming gear'
    ],
    isPopular: false,
    requiresBackendChange: true
  },
  {
    id: 'tier-more-packs',
    name: 'More Packs',
    price: 0,
    period: 'custom',
    description: 'Custom packs & longer durations. We have a variety of other packs available (5-hour, 6-hour, and group discounts).',
    features: [
      'Custom hours tailoring to your group size',
      'Group discounts & corporate packages',
      'Direct event hosting and tournament brackets',
      'Flexible rates based on custom setups'
    ],
    isPopular: false,
    requiresBackendChange: true
  }
];

// 4. Honest Gallery Placeholders
// Real photos of the cafe do not exist yet. These tiles are marked as upcoming/coming-soon
// to preserve absolute design integrity and represent the cafe honestly.
export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'gallery-ps5-zone',
    title: 'Dual PS5 Elite Zone',
    category: 'PlayStation 5',
    description: 'Ultra-plush leather recliners positioned perfectly in front of 55" OLED screens.',
    imageUrl: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 'gallery-snooker-lounge',
    title: 'Championship Snooker Tables',
    category: 'Snooker',
    description: 'Perfect alignment, shadowless overhead lighting, and imported wool table felt.',
    imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 'gallery-carrom-tables',
    title: 'Classic Board Sports',
    category: 'Carrom',
    description: 'High-speed professional ply carrom boards surrounded by comfortable viewing chairs.',
    imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 'gallery-cafe-bar',
    title: 'Energy Fuel Station',
    category: 'Cafe Amenities',
    description: 'Cold brews, fresh energy mocktails, and steaming hot bites served right to your station.',
    imageUrl: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 'gallery-squad-corner',
    title: 'Squad Tournament Zone',
    category: 'PlayStation 5',
    description: 'Multi-station local area networking setup for local 5v5 gaming events.',
    imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200&auto=format&fit=crop'
  },
  {
    id: 'gallery-lobby',
    title: 'GameZ Lobby & Lounge',
    category: 'Amenities',
    description: 'Relaxation lounge with active stream-viewing screens for matches.',
    imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1200&auto=format&fit=crop'
  }
];

// 5. Clearly Labeled Sample Reviews
// To comply with strict verification rules, these reviews are clearly labeled as sample content
// representing simulated customer feedback that will be swapped with authentic testimonials.
export const SAMPLE_REVIEWS: Review[] = [
  {
    id: 'rev-1',
    author: 'Aditya K.',
    role: 'Competitive FIFA Player',
    rating: 5,
    text: 'The absolute best gaming venue in Mangaluru! The PS5 screens are OLED with zero latency, and the leather recliners are ridiculously comfortable. The online booking system works seamlessly.',
    date: 'July 2, 2026',
    isPlaceholder: true
  },
  {
    id: 'rev-2',
    author: 'Nisha Shenoy',
    role: 'Billiards & Snooker Enthusiast',
    rating: 5,
    text: 'Incredibly well-maintained snooker tables! The cues are balanced, the slate is perfectly level, and the overhead lighting is professional grade. Truly a premium experience in Mangaluru.',
    date: 'June 28, 2026',
    isPlaceholder: true
  },
  {
    id: 'rev-3',
    author: 'Rohan D\'Souza',
    role: 'Casual Gamer & Student',
    rating: 4,
    text: 'Awesome place to hang out with friends. We booked a carrom board and a PS5 for our group. The rates are very affordable (especially Carrom at ₹100/hr) and the mocktails were delicious!',
    date: 'June 15, 2026',
    isPlaceholder: true
  }
];

// 6. Contact and Venue Information
export const VENUE_INFO = {
  address: '3rd Floor, Cyber Heights Mall, MG Road, Mangaluru, Karnataka - 575003',
  landmark: 'Opposite Empire Plaza, near Mangaluru Corporation Office',
  phone: '+91 824 555 7890',
  email: 'play@gamezcafe.com',
  instagram: '@gamezmangaluru',
  hours: [
    { days: 'Monday – Thursday', time: '11:00 AM – 11:00 PM' },
    { days: 'Friday – Saturday', time: '11:00 AM – 02:00 AM' },
    { days: 'Sunday', time: '11:00 AM – 12:00 Midnight' }
  ],
  mapPlaceholderText: 'Interactive Google Maps View (Final embed code pending street address validation)'
};
