import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Gamepad2, 
  CircleDot, 
  Grid, 
  Milestone, 
  Trophy, 
  Crosshair, 
  Swords, 
  Compass, 
  Users, 
  MapPin, 
  Clock, 
  Phone,
  Mail,
  CalendarCheck,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Star,
  Zap,
  Info,
  Pause,
  Play,
  SlidersHorizontal,
  ArrowRightLeft,
  Image as ImageIcon,
  User,
  Monitor,
  Crown,
  Plus,
  MessageSquare
} from 'lucide-react';
import { STATIONS, GAME_GENRES, PRICING_TIERS, GALLERY_ITEMS, SAMPLE_REVIEWS, VENUE_INFO } from '../data';
import { ExpandableGallery } from '../components/ExpandableGallery';

// Dynamic Icon Mapper to keep imports safe and prevent runtime failures
const ICON_COMPONENTS: Record<string, React.ComponentType<any>> = {
  Gamepad2,
  CircleDot,
  Grid,
  Milestone,
  Trophy,
  Crosshair,
  Swords,
  Compass,
  Users,
  MapPin,
  Clock,
  Phone,
  Mail,
};

interface LandingProps {
  setRoute: (route: string) => void;
}

export default function Landing({ setRoute }: LandingProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  const CAROUSEL_GAMES = [
    {
      id: 'game-fc24',
      title: 'EA Sports FC 24',
      genre: 'Sports & Football',
      imageUrl: 'https://images.unsplash.com/photo-1601887389937-0b02c26b6c3c?auto=format&fit=crop&w=600&q=80',
      platform: 'PS5 • DualSense',
      description: "The next chapter in EA's legendary football series. Experience ultimate gameplay realism powered by HyperMotionV, play local 1v1 or 2v2 Couch Co-op matches with friends, and dominate the pitch with precision controller rumble feedback.",
      tags: ['Local Versus', 'Couch Co-op', '4K 120Hz', 'DualSense Haptics'],
      players: '1 - 4 Players (Local Co-op)'
    },
    {
      id: 'game-gt7',
      title: 'Forza Horizon 5',
      genre: 'Racing Simulation',
      imageUrl: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=600&q=80',
      platform: 'PS5 • Racing Wheel',
      description: 'Hop into the driver\'s seat and explore the vibrant, ever-evolving open-world landscapes of Mexico. Fully optimized with ultra-realistic force feedback on our premium Racing Wheel setups, stunning high-contrast HDR, and realistic engine audio.',
      tags: ['Wheel Support', 'High-Contrast HDR', 'Cinematic Audio', 'Split Screen'],
      players: '1 - 2 Players (Local Split-Screen)'
    },
    {
      id: 'game-tekken8',
      title: 'Tekken 8',
      genre: 'Fighting & Brawler',
      imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
      platform: 'PS5 • Arcade Stick',
      description: 'Master the combat and punch your way to victory in the latest entry of the storied 3D fighting game franchise. Featuring high-intensity brawls with zero input latency, native support for Arcade Fight Sticks, and satisfying impact mechanics.',
      tags: ['Ultra Low Latency', 'Arcade Sticks', '1v1 Local Versus', 'Cinematic Combos'],
      players: '1 - 2 Players'
    },
    {
      id: 'game-cod',
      title: 'Call of Duty: MW3',
      genre: 'Shooter & Battle Royale',
      imageUrl: 'https://images.unsplash.com/photo-1553481187-be93c21490a9?auto=format&fit=crop&w=600&q=80',
      platform: 'PS5 • Multiplayer',
      description: 'Lock and load with state-of-the-art combat gear. Immerse yourself in classic multiplayer matches and high-stakes battlegrounds with silky smooth 120Hz refresh rates, spatial 3D audio headsets, and ultra-crisp gun handling.',
      tags: ['120FPS Mode', '3D Spatial Audio', 'Local Co-op Campaign', 'Tactical Response'],
      players: '1 - 2 Players (Split-screen) / Online'
    },
    {
      id: 'game-eldenring',
      title: 'Elden Ring',
      genre: 'Open World RPG',
      imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
      platform: 'PS5 • Solo Campaign',
      description: 'Journey across the legendary Lands Between to restore the Elden Ring. Perfect for a deep single-player campaign, featuring magnificent art direction, breathtaking open-world scope, and unforgiving boss fights optimized for stunning 4K clarity.',
      tags: ['Cinematic Solo', 'Ultra HD Graphics', 'Action RPG', 'Immersive World'],
      players: '1 Player'
    },
    {
      id: 'game-spiderman2',
      title: "Marvel's Spider-Man 2",
      genre: 'Action Adventure',
      imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
      platform: 'PS5 • 4K OLED',
      description: 'Swing through an expanded Marvel\'s New York as both Peter Parker and Miles Morales. Experience incredible near-instant character switching, beautiful ray-traced reflections on 55" OLED screens, and immersive haptics that let you feel every web swing.',
      tags: ['Ray Tracing', 'DualSense Haptics', 'Insta-Load SSD', 'Cinematic Story'],
      players: '1 Player'
    },
    {
      id: 'game-gtav',
      title: 'Grand Theft Auto V',
      genre: 'Action & Open World',
      imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
      platform: 'PS5 • Online Match',
      description: 'Experience Los Santos like never before with spectacular next-gen enhancements. Race, scheme, and play through the blockbuster story campaign or drop into the online world to coordinate massive heists with local crew members.',
      tags: ['4K HDR Resolution', 'GTA Online Supported', 'Heist Co-op', 'Expanded Sandbox'],
      players: '1 Player (Campaign) / Online Co-op'
    },
    {
      id: 'game-mk1',
      title: 'Mortal Kombat 1',
      genre: 'Fighting & Versus',
      imageUrl: 'https://images.unsplash.com/photo-1612287230202-1bf1d85d1bdf?auto=format&fit=crop&w=600&q=80',
      platform: 'PS5 • Local Versus',
      description: 'A reborn Mortal Kombat universe created by the Fire God Liu Kang. Featuring a spectacular new fighting system, bone-shattering Kameo fighters, gorgeous and gory fatalities, and classic arcade controls perfect for settling rivalries.',
      tags: ['Local Versus', 'Kameo System', 'Bone-Crushing Haptics', 'Fast Frame-Rate'],
      players: '1 - 2 Players'
    },
    {
      id: 'game-gowr',
      title: 'God of War Ragnarök',
      genre: 'Action & Cinematic',
      imageUrl: 'https://images.unsplash.com/photo-1551103782-8ab07afd45c1?auto=format&fit=crop&w=600&q=80',
      platform: 'PS5 • 3D Audio',
      description: 'Embark on an epic, cinematic Norse adventure as Kratos and Atreus struggle with holding on and letting go. Lose yourself in stunning audio soundscapes with professional 3D wireless headsets and feel every swing of the Leviathan Axe.',
      tags: ['3D Audio Headsets', 'Award-Winning Story', 'Leviathan Axe Haptics', '4K HDR'],
      players: '1 Player'
    },
    {
      id: 'game-horizon',
      title: 'Horizon Forbidden West',
      genre: 'Adventure RPG',
      imageUrl: 'https://images.unsplash.com/photo-1627856013091-fed6e4e30025?auto=format&fit=crop&w=600&q=80',
      platform: 'PS5 • HDR Gaming',
      description: 'Journey to the far-future, post-apocalyptic Forbidden West. Discover stunning new tribes, battle colossal robotic machines, and experience incredible foliage detail and vivid color contrast optimized specifically for our high-end OLED displays.',
      tags: ['OLED Optimized', 'HDR Enabled', 'Cinematic Journey', 'Next-Gen Visuals'],
      players: '1 Player'
    }
  ];

  const [activeGameId, setActiveGameId] = useState(CAROUSEL_GAMES[0].id);

  // SEAMLESS INFINITE RIBBON STATES & PHYSICS ENGINE:
  const N_GAMES = CAROUSEL_GAMES.length;
  const duplicatedGames = React.useMemo(() => {
    return [...CAROUSEL_GAMES, ...CAROUSEL_GAMES, ...CAROUSEL_GAMES];
  }, []);

  const [scrollSpeed] = useState(0.8); // Smooth pixels per frame
  const [direction] = useState<'ltr' | 'rtl'>('ltr');
  const [overlap] = useState(-65); // Overlapping card density
  const [neighborPush] = useState(95); // Dynamic neighbor shift force on hover
  const [isAutoScrolling] = useState(true);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const cardWidth = 250; // Larger card width for premium high-fidelity look
  const stride = cardWidth + overlap; // 250 - 65 = 185px
  const baseOffset = -(N_GAMES * stride);
  const [scrollOffset, setScrollOffset] = useState(baseOffset);

  // Synchronize activeGameId when activeIndex changes
  useEffect(() => {
    const activeGame = CAROUSEL_GAMES[activeIndex % N_GAMES];
    if (activeGame) {
      setActiveGameId(activeGame.id);
    }
  }, [activeIndex, N_GAMES]);

  // Infinite seamless frame loop using requestAnimationFrame for pristine performance
  useEffect(() => {
    if (!isAutoScrolling || hoveredIndex !== null || prefersReducedMotion) return;

    let animationFrameId: number;
    
    const updateScroll = () => {
      setScrollOffset(prev => {
        let next = prev;
        if (direction === 'rtl') {
          next -= scrollSpeed;
          const maxLimit = baseOffset - (N_GAMES * stride);
          if (next <= maxLimit) {
            next += (N_GAMES * stride);
          }
        } else {
          next += scrollSpeed;
          const maxLimit = baseOffset + (N_GAMES * stride);
          if (next >= 0) {
            next -= (N_GAMES * stride);
          }
        }
        return next;
      });

      animationFrameId = requestAnimationFrame(updateScroll);
    };

    animationFrameId = requestAnimationFrame(updateScroll);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isAutoScrolling, hoveredIndex, direction, scrollSpeed, stride, N_GAMES, baseOffset, prefersReducedMotion]);

  // Ribbon Navigation controls
  const handlePrev = () => {
    setScrollOffset(prev => prev + stride);
    setActiveIndex(prev => (prev - 1 + N_GAMES) % N_GAMES);
  };

  const handleNext = () => {
    setScrollOffset(prev => prev - stride);
    setActiveIndex(prev => (prev + 1) % N_GAMES);
  };

  const resetRibbon = () => {
    setScrollOffset(baseOffset);
    setActiveIndex(0);
  };

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Safely check for prefers-reduced-motion to accommodate accessibility needs
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Animation helper configs that honor prefers-reduced-motion
  const fadeInVariant = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 25 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: 'easeOut' }
    }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.12,
        delayChildren: prefersReducedMotion ? 0 : 0.1
      }
    }
  };

  const handleScrollToSection = (e: React.MouseEvent<HTMLButtonElement>, sectionId: string) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.getBoundingClientRect().top + window.scrollY - 80; // Offset for sticky navbar
      window.scrollTo({
        top: offsetTop,
        behavior: 'smooth'
      });
    }
  };

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;

  return (
    <div className="bg-cyber-dark min-h-screen">
      
      {/* 1. HERO SECTION */}
      <section 
        id="home" 
        className="relative min-h-[calc(100vh-80px)] flex items-center justify-center overflow-hidden py-12 px-4 border-b border-cyber-purple/10"
      >
        {/* Abstract futuristic background grid overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.05),transparent_50%)] pointer-events-none" />
        
        <div className="relative mx-auto max-w-5xl text-center flex flex-col items-center">
          
          {/* Epic Main Headline */}
          <motion.h1 
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] mb-6 pt-12"
          >
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-purple via-cyber-cyan to-cyber-neon drop-shadow-sm">
              Walk In and Play.
            </span>
          </motion.h1>

          {/* Subcopy explaining 5-minute temporary hold system */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-base sm:text-xl text-gray-400 max-w-2xl leading-relaxed mb-10"
          >
            Ditch the queue. Book online. Head down, check in on arrival, and start gaming instantly.
          </motion.p>

          {/* Double Call to Actions */}
          <motion.div 
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
          >
            <button
              id="hero-primary-cta"
              onClick={() => setRoute('/book')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-cyber-purple to-cyber-cyan text-white font-display font-bold tracking-wide shadow-lg shadow-cyber-purple/20 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyber-cyan focus:ring-offset-2 focus:ring-offset-cyber-dark cursor-pointer"
            >
              <CalendarCheck className="h-5 w-5" />
              Reserve a Station Now
            </button>
            <button
              id="hero-secondary-cta"
              onClick={(e) => handleScrollToSection(e, 'stations')}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-cyber-lightgray border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 font-display font-medium tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyber-purple cursor-pointer"
            >
              Explore Stations
              <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* 2. STATIONS SECTION */}
      <section 
        id="stations" 
        className="pt-10 pb-20 md:pt-12 md:pb-24 px-4 max-w-7xl mx-auto border-b border-cyber-purple/10"
      >
        <div className="text-center mb-8 md:mb-12">
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Ready Player One?
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Explore our elite gaming zones.<br />
            Select your station, gear up, and jump into the action.
          </p>
        </div>

        {/* Stations Grid */}
        <motion.div 
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {STATIONS.map((station) => {
            const IconComponent = ICON_COMPONENTS[station.iconName] || Gamepad2;
            
            return (
              <motion.div
                key={station.id}
                variants={fadeInVariant}
                whileHover={prefersReducedMotion ? {} : { y: -6 }}
                className="group flex flex-col bg-cyber-gray border border-white/5 rounded-2xl overflow-hidden shadow-xl hover:border-cyber-purple/40 hover:shadow-cyber-purple/5 transition-all duration-300"
              >
                
                {/* Visual Image / Placeholder container */}
                <div className="relative h-36 sm:h-40 md:h-44 bg-cyber-dark border-b border-white/5 overflow-hidden">
                  {station.imageUrl ? (
                    <>
                      <img 
                        src={station.imageUrl} 
                        alt={station.name}
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-cyber-dark via-cyber-dark/30 to-transparent" />
                      
                      {/* Floating Icon Badge */}
                      <div className="absolute bottom-4 left-4 flex items-center gap-2 z-10">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyber-dark/80 backdrop-blur-md text-cyber-cyan border border-cyber-purple/30 shadow-lg">
                          <IconComponent className="h-4.5 w-4.5" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 bg-cyber-dark p-3">
                      <div className="h-full w-full border border-dashed border-white/10 rounded-xl bg-cyber-lightgray/5 flex flex-col items-center justify-center p-4 relative group/placeholder transition-colors duration-300 hover:bg-cyber-lightgray/10">
                        {/* Grid line blueprint decoration */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:14px_14px] rounded-xl pointer-events-none" />
                        
                        {/* Center Icon Block */}
                        <div className="relative flex items-center justify-center">
                          <ImageIcon className="h-10 w-10 text-gray-600 group-hover/placeholder:text-cyber-purple/60 transition-colors duration-300" />
                          <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-md bg-cyber-dark text-cyber-cyan border border-cyber-purple/20 shadow-md">
                            <IconComponent className="h-3 w-3" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col">
                  
                  {/* Name & Pricing Row */}
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-display text-xl font-bold text-white group-hover:text-cyber-cyan transition-colors">
                      {station.name}
                    </h3>
                    <div className="text-right">
                      <span className="block font-mono text-xl font-bold text-cyber-neon">
                        ₹{station.ratePerHour}
                      </span>
                      <span className="block text-[10px] uppercase font-mono tracking-wider text-gray-500">
                        per hour
                      </span>
                    </div>
                  </div>

                  {/* Bullet points (No meaningless phrases) */}
                  <ul className="space-y-2 mb-6 mt-auto">
                    {station.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-gray-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-cyber-purple shrink-0 mt-1.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Availability badge & Reserve CTA button */}
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3 mt-auto">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-wide text-cyber-cyan bg-cyber-cyan/10 px-2.5 py-1 rounded-full">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyber-cyan animate-pulse" />
                      {station.availableNow} / {station.totalSlots} AVAILABLE
                    </span>
                    <button
                      id={`book-station-${station.id}`}
                      onClick={() => setRoute('/book')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-display font-semibold text-white bg-cyber-purple/20 hover:bg-cyber-purple/80 hover:scale-[1.03] transition-all duration-200 border border-cyber-purple/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyber-purple cursor-pointer"
                    >
                      Book Now
                    </button>
                  </div>

                </div>

              </motion.div>
            );
          })}
        </motion.div>

        {/* Live PocketBase Note */}
        <div className="mt-8 flex items-center gap-2.5 justify-center bg-cyber-gray/50 border border-white/5 px-4 py-3 rounded-xl max-w-2xl mx-auto">
          <Info className="h-4.5 w-4.5 text-cyber-cyan shrink-0" />
          <p className="text-xs text-gray-500 leading-normal">
            <strong>V1 Database Note:</strong> Active rates reflect real configurations. PocketBase live binding hooks (collections: <code className="text-cyber-purple font-mono bg-cyber-lightgray px-1 rounded text-[10px]">stations</code>) are structurally implemented in comments to run automatically in production V2.
          </p>
        </div>

      </section>

      {/* 3. GAMES SECTION */}
      <section 
        id="games" 
        className="pt-10 pb-20 md:pt-12 md:pb-24 px-4 max-w-7xl mx-auto border-b border-cyber-purple/10 overflow-hidden relative"
      >
        {/* Ambient background glow from the active game accent or theme */}
        <div className="absolute inset-x-0 top-0 h-[500px] flex items-center justify-center -z-10 pointer-events-none overflow-hidden">
          <div 
            className="absolute w-[600px] h-[300px] rounded-full blur-[130px] opacity-[0.14] transition-all duration-1000 ease-out animate-pulse"
            style={{ 
              background: `radial-gradient(circle, #8b5cf6 0%, transparent 70%)`,
            }}
          />
        </div>

        <div className="text-center mb-8">
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Every title. On tap.
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base">
            Every title in the lineup runs on full premium hardware, ready when you are.
          </p>
        </div>

        {/* ==========================================
           CORE 3D INFINITE RIBBON CAROUSEL
           ========================================== */}
        <div className="relative w-full py-10 overflow-visible">
          
          {/* Mask-image edges for infinite fade */}
          <div 
            className="relative w-full overflow-visible py-16 min-h-[560px] flex items-center justify-center"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 15%, rgba(0,0,0,1) 85%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,1) 15%, rgba(0,0,0,1) 85%, transparent 100%)',
            }}
          >
            <div className="w-full flex items-center overflow-visible py-8">
              <motion.div 
                className="flex items-center gap-0 overflow-visible"
                style={{ x: scrollOffset }}
              >
                {duplicatedGames.map((game, i) => {
                  const isHovered = hoveredIndex === i;
                  const isActive = game.id === activeGameId;
                  const anyHovered = hoveredIndex !== null;

                  // Neighbor push spring math
                  let xShift = 0;
                  if (anyHovered && !isHovered) {
                    if (i < hoveredIndex!) {
                      xShift = -neighborPush;
                    } else if (i > hoveredIndex!) {
                      xShift = neighborPush;
                    }
                  }

                  return (
                    <motion.div
                      key={`${game.id}-ribbon-${i}`}
                      onMouseEnter={() => {
                        setHoveredIndex(i);
                        setActiveIndex(i);
                      }}
                      onMouseLeave={() => setHoveredIndex(null)}
                      onClick={() => {
                        setActiveIndex(i);
                      }}
                      animate={{
                        x: xShift,
                        y: isHovered ? -35 : 0,
                        scale: isHovered ? 1.15 : 0.9,
                        rotate: isHovered ? -2 : 0,
                        zIndex: isHovered ? 50 : 10 + (i % N_GAMES),
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 110,
                        damping: 14,
                      }}
                      className="relative cursor-pointer flex-shrink-0"
                      style={{
                        marginLeft: i === 0 ? "0px" : `${overlap}px`,
                        width: `${cardWidth}px`,
                        height: "380px",
                      }}
                    >
                      {/* Subtle drop shadow underneath active cards */}
                      <div className="absolute inset-4 bg-black/60 blur-lg rounded-2xl -z-10" />

                      <div 
                        className={`w-full h-full rounded-2xl overflow-hidden border transition-all duration-300 bg-cyber-dark ${
                          isHovered 
                            ? "border-cyber-purple shadow-[0_15px_35px_rgba(139,92,246,0.4)]" 
                            : isActive 
                            ? "border-cyber-purple shadow-[0_0_20px_rgba(139,92,246,0.15)]"
                            : "border-white/10"
                        }`}
                      >
                        {/* Game Image */}
                        <img
                          src={game.imageUrl}
                          alt={game.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover transition-transform duration-500"
                          loading="lazy"
                          draggable={false}
                        />

                        {/* Dim overlays on inactive items during hover */}
                        <div 
                          className={`absolute inset-0 bg-cyber-dark transition-opacity duration-300 pointer-events-none ${
                            anyHovered && !isHovered ? "opacity-60" : "opacity-15"
                          }`}
                        />

                        {/* Bottom fog gradient */}
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-cyber-dark via-cyber-dark/60 to-transparent pointer-events-none z-10" />

                        {/* Miniature display title overlay inside card */}
                        <div className="absolute bottom-4 inset-x-3 text-center pointer-events-none z-20">
                          <span className="text-[12px] font-mono tracking-wider font-semibold text-white/95 line-clamp-1">
                            {game.title}
                          </span>
                        </div>

                        {/* Spotlight badge when hovered */}
                        <AnimatePresence>
                          {isHovered && (
                            <motion.div
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute inset-x-2 bottom-3 p-2 rounded-xl bg-cyber-purple text-white flex items-center justify-between shadow-lg z-30"
                            >
                              <div className="flex flex-col text-left justify-center py-0.5">
                                <span className="text-[10px] font-display font-black tracking-widest text-white">PLAY NOW</span>
                              </div>
                              <span className="text-[10px] font-mono font-bold">→</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

              {/* 4. PRICING SECTION */}
      <section 
        id="pricing" 
        className="pt-10 pb-20 md:pt-12 md:pb-24 px-4 max-w-7xl mx-auto border-b border-cyber-purple/10"
      >
        <div className="text-center mb-8 md:mb-12">
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Passes, packs & <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyber-purple to-cyber-cyan">pricing.</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base">
            Choose the gaming setup and pricing plan that fits your grind.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRICING_TIERS.map((tier) => {
            // Pick icon and badge based on tier id
            let IconComponent = User;
            let badgeText = "";
            let cardBgAndBorder = "bg-cyber-gray/40 border-white/5 hover:border-white/10";
            let iconBgAndText = "bg-white/5 text-cyber-cyan";
            let badgeColor = "";

            if (tier.id === 'tier-midnight') {
              IconComponent = Zap;
              badgeText = "MOST POPULAR";
              cardBgAndBorder = "bg-cyber-purple/5 border-cyber-purple/60 shadow-lg shadow-cyber-purple/10";
              iconBgAndText = "bg-cyber-purple/20 text-cyber-purple";
              badgeColor = "bg-cyber-purple text-white";
            } else if (tier.id === 'tier-monthly-unlimited') {
              IconComponent = Crown;
              badgeText = "MONTHLY PASS";
              cardBgAndBorder = "bg-amber-500/5 border-amber-500/50 shadow-lg shadow-amber-500/10";
              iconBgAndText = "bg-amber-500/10 text-amber-500";
              badgeColor = "bg-amber-500 text-black";
            } else if (tier.id === 'tier-more-packs') {
              IconComponent = Plus;
              cardBgAndBorder = "bg-cyber-gray/40 border-white/5 hover:border-white/10";
              iconBgAndText = "bg-white/5 text-cyber-cyan";
            } else if (tier.id === 'tier-hourly') {
              IconComponent = User;
              cardBgAndBorder = "bg-cyber-gray/40 border-white/5 hover:border-white/10";
              iconBgAndText = "bg-white/5 text-cyber-cyan";
            }

            return (
              <div
                key={tier.id}
                className={`relative flex flex-col rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 ${cardBgAndBorder}`}
              >
                {badgeText && (
                  <span className={`absolute top-0 right-6 -translate-y-1/2 inline-flex items-center text-[9px] font-mono font-bold tracking-widest uppercase px-3 py-1 rounded-full shadow-md ${badgeColor}`}>
                    {badgeText}
                  </span>
                )}

                <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-4 ${iconBgAndText}`}>
                  <IconComponent className="h-5 w-5" />
                </div>

                <h3 className="font-display text-lg font-extrabold text-white mb-0.5">
                  {tier.name}
                </h3>
                
                <p className="text-[11px] font-mono text-gray-500 mb-4 uppercase tracking-wider">
                  {tier.id === 'tier-hourly' ? 'Console casual gaming' : tier.id === 'tier-midnight' ? 'Competitive late night' : tier.id === 'tier-monthly-unlimited' ? 'Day hours gaming package' : 'Custom packs & duration'}
                </p>

                <p className="text-xs text-gray-400 min-h-[48px] mb-6 leading-relaxed">
                  {tier.description}
                </p>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {tier.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-gray-300">
                      <span className={`mt-0.5 font-bold ${tier.id === 'tier-midnight' ? 'text-cyber-purple' : tier.id === 'tier-monthly-unlimited' ? 'text-amber-500' : 'text-cyber-cyan'}`}>✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <div className="border-t border-white/5 pt-4 mt-auto">
                  {tier.id === 'tier-more-packs' ? (
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          const contactSection = document.getElementById('footer') || document.getElementById('reservation');
                          if (contactSection) {
                            contactSection.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className="w-full py-3 px-4 rounded-xl text-xs font-display font-bold tracking-wide transition-all duration-200 bg-cyber-dark hover:bg-cyber-lightgray border border-white/10 hover:border-white/20 text-cyber-cyan hover:text-white flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>CONTACT US</span>
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono text-2xl sm:text-3xl font-black text-white">
                          ₹{tier.price.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-gray-400">
                          / {tier.period}
                        </span>
                      </div>
                      <button
                        onClick={() => setRoute('/book')}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-display font-bold tracking-wide transition-all duration-200 cursor-pointer ${
                          tier.id === 'tier-midnight'
                            ? 'bg-gradient-to-r from-cyber-purple to-cyber-cyan text-white shadow-md hover:scale-[1.02]'
                            : 'bg-cyber-lightgray border border-white/10 text-gray-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Book Slots Now
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Night pack / rates start pill */}
        <div className="mt-12 text-center">
          <span className="inline-flex items-center gap-1.5 bg-cyber-purple/10 border border-cyber-purple/30 text-cyber-cyan text-[10px] font-mono font-bold tracking-widest uppercase px-4 py-2 rounded-full">
            * NIGHT PACKS & RATES START AFTER 10:00 PM IST
          </span>
        </div>
      </section>

      {/* 5. GALLERY SECTION */}
      <section 
        id="gallery" 
        className="pt-10 pb-20 md:pt-12 md:pb-24 px-4 max-w-7xl mx-auto border-b border-cyber-purple/10"
      >
        <div className="text-center mb-8 md:mb-12">
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Venue Gallery Preview
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Honest visual previews. Real photo uploads of our newly lounge.
          </p>
        </div>

        {/* 21st Dev Expandable Interactive Gallery */}
        <ExpandableGallery items={GALLERY_ITEMS} />
      </section>

      {/* 6. LOCATION & CONTACT SECTION */}
      <section 
        id="location" 
        className="pt-10 pb-20 md:pt-12 md:pb-24 px-4 max-w-7xl mx-auto border-b border-cyber-purple/10"
      >
        <div className="text-center mb-8 md:mb-12">
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            Find the Arena
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Located conveniently on MG Road, Mangaluru, with dedicated late-night hours. Easy parking and premium lounge access.
          </p>
        </div>

        {/* Location Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Address and Info Card - 5 columns */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-cyber-gray border border-white/5 rounded-2xl p-6 sm:p-8">
            <div className="space-y-6">
              
              {/* Main Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyber-cyan/5 border border-cyber-cyan/25 text-cyber-cyan rounded-lg text-xs font-mono font-medium">
                <MapPin className="h-3 w-3" />
                MG ROAD MANGALURU
              </div>

              {/* Physical Address */}
              <div>
                <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest font-bold mb-2">
                  Cafe Venue Address
                </h3>
                <p className="text-white text-base font-sans font-medium leading-relaxed">
                  {VENUE_INFO.address}
                </p>
                <p className="text-xs text-cyber-purple font-semibold mt-1">
                  Landmark: {VENUE_INFO.landmark}
                </p>
              </div>

              {/* Cafe Daily Hours */}
              <div>
                <h3 className="text-gray-400 font-mono text-xs uppercase tracking-widest font-bold mb-3">
                  Operating Hours
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {VENUE_INFO.hours.map((h, idx) => (
                    <div key={idx} className="border-l border-cyber-cyan/30 pl-3">
                      <span className="block text-[10px] uppercase font-mono tracking-wider text-gray-500">
                        {h.days}
                      </span>
                      <span className="block text-sm text-gray-200 font-semibold mt-0.5">
                        {h.time}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Info */}
              <div className="pt-4 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] uppercase font-mono tracking-wider text-gray-500">
                    Phone Inquiries
                  </span>
                  <a 
                    id="location-phone-link"
                    href={`tel:${VENUE_INFO.phone.replace(/\s+/g, '')}`}
                    className="block text-sm text-cyber-purple font-semibold hover:underline mt-0.5"
                  >
                    {VENUE_INFO.phone}
                  </a>
                </div>
                <div>
                  <span className="block text-[10px] uppercase font-mono tracking-wider text-gray-500">
                    Email Assistance
                  </span>
                  <a 
                    id="location-email-link"
                    href={`mailto:${VENUE_INFO.email}`}
                    className="block text-sm text-cyber-purple font-semibold hover:underline mt-0.5"
                  >
                    {VENUE_INFO.email}
                  </a>
                </div>
              </div>

            </div>

            {/* Quick Action Button */}
            <div className="pt-8 mt-6 border-t border-white/5">
              <button
                id="location-get-directions"
                onClick={() => alert(`Directions query sent for: ${VENUE_INFO.address}`)}
                className="w-full flex items-center justify-center gap-2 bg-cyber-lightgray border border-white/10 hover:bg-white/5 text-sm font-display font-bold text-white py-3.5 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-cyber-purple cursor-pointer"
              >
                Copy Address / Get Directions
              </button>
            </div>

          </div>

          {/* Interactive Styled Map Embed Placeholder - 7 columns */}
          <div className="lg:col-span-7 bg-cyber-gray border border-white/5 rounded-2xl overflow-hidden min-h-[350px] relative flex flex-col">
            
            {/* Custom stylized tech grid representing map overlay */}
            <div className="flex-1 bg-cyber-lightgray flex flex-col items-center justify-center p-6 relative">
              
              {/* Circular radar style beacon representing the physical cafe */}
              <div className="relative mb-4 flex items-center justify-center h-24 w-24">
                <span className="absolute inline-flex h-16 w-16 rounded-full bg-cyber-purple/20 animate-ping opacity-75" />
                <span className="absolute inline-flex h-20 w-20 rounded-full bg-cyber-cyan/10 animate-pulse" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-cyber-dark text-cyber-purple border border-cyber-purple shadow-lg shadow-cyber-purple/20">
                  <MapPin className="h-7 w-7 text-cyber-cyan animate-bounce" />
                </div>
              </div>

              <div className="text-center z-10 max-w-md">
                <h3 className="font-display text-lg font-bold text-white mb-2">
                  Map Embed Pending Verification
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  {VENUE_INFO.mapPlaceholderText}. Standard Google Maps iframe api integration triggers automatically upon street address validation.
                </p>
                <span className="inline-block font-mono text-[10px] text-cyber-cyan bg-cyber-cyan/10 px-3 py-1 rounded-full uppercase tracking-wider font-semibold">
                  Coordinates: 12.8732° N, 74.8398° E
                </span>
              </div>

              {/* Decorative cybernetic ticks in corners */}
              <div className="absolute top-4 left-4 h-3 w-3 border-t-2 border-l-2 border-cyber-purple/30" />
              <div className="absolute top-4 right-4 h-3 w-3 border-t-2 border-r-2 border-cyber-purple/30" />
              <div className="absolute bottom-4 left-4 h-3 w-3 border-b-2 border-l-2 border-cyber-purple/30" />
              <div className="absolute bottom-4 right-4 h-3 w-3 border-b-2 border-r-2 border-cyber-purple/30" />

            </div>

          </div>

        </div>
      </section>

      {/* 7. REVIEWS SECTION */}
      <section 
        id="reviews" 
        className="pt-10 pb-20 md:pt-12 md:pb-24 px-4 max-w-7xl mx-auto border-b border-cyber-purple/10"
      >
        <div className="text-center mb-8 md:mb-12">
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-4">
            What Our Gamers Say
          </h2>
          
          {/* Strict Notice regarding simulated content */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyber-purple/10 border border-cyber-purple/20 rounded-lg text-[11px] font-mono text-cyber-purple max-w-xl mx-auto">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>CUSTOMER REVIEWS ARE CURRENTLY SIMULATED SAMPLE SAMPLES (SWAPPED ON DEPLOY)</span>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {SAMPLE_REVIEWS.map((rev) => {
            return (
              <div
                key={rev.id}
                className="flex flex-col bg-cyber-gray border border-white/5 rounded-2xl p-6 justify-between group hover:border-white/10 transition-all duration-300"
              >
                <div>
                  
                  {/* Stars Row */}
                  <div className="flex items-center gap-1 mb-4 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 ${i < rev.rating ? 'fill-current' : 'text-gray-600'}`} 
                      />
                    ))}
                  </div>

                  <p className="text-sm text-gray-300 leading-relaxed italic mb-6">
                    "{rev.text}"
                  </p>

                </div>

                {/* Author Info */}
                <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-3 mt-auto">
                  <div>
                    <h4 className="font-display font-bold text-sm text-white group-hover:text-cyber-purple transition-colors">
                      {rev.author}
                    </h4>
                    <span className="block text-[10px] font-mono text-gray-500">
                      {rev.role}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase">
                    {rev.date}
                  </span>
                </div>

              </div>
            );
          })}
        </div>

      </section>

    </div>
  );
}
