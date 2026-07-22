import React from 'react';
import { Gamepad2, Phone, Mail, MapPin, Instagram, Youtube, Twitter } from 'lucide-react';
import { VENUE_INFO } from '../data';

interface FooterProps {
  currentRoute: string;
  setRoute: (route: string) => void;
}

export default function Footer({ currentRoute, setRoute }: FooterProps) {
  const currentYear = new Date().getFullYear();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const sectionId = href.substring(1);

    if (currentRoute !== '/') {
      setRoute('/');
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          const offsetTop = element.offsetTop - 80;
          window.scrollTo({
            top: offsetTop,
            behavior: 'smooth',
          });
        }
      }, 100);
    } else {
      const element = document.getElementById(sectionId);
      if (element) {
        const offsetTop = element.offsetTop - 80;
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth',
        });
      }
    }
  };

  return (
    <footer id="footer-main" className="bg-cyber-dark border-t border-cyber-purple/10 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4 pb-12 border-b border-white/5">
          
          {/* Column 1: Brand Intro */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-cyber-purple to-cyber-cyan text-white shadow-md shadow-cyber-purple/10">
                <Gamepad2 className="h-4 w-4" />
              </div>
              <span className="font-display text-lg font-bold tracking-wider text-white">
                GAME<span className="text-cyber-purple">Z</span>
              </span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed font-sans">
              Mangaluru's ultimate cyber arena. Experience professional PlayStation 5 setups, premium snooker tables, and custom carrom stations with friends in a high-fidelity lounge.
            </p>
            
            {/* Social Icons */}
            <div className="flex items-center gap-3 mt-2">
              <a
                id="footer-social-instagram"
                href={`https://instagram.com/${VENUE_INFO.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyber-lightgray text-gray-400 hover:text-white hover:bg-cyber-purple/30 focus:outline-none focus:ring-2 focus:ring-cyber-purple transition-all duration-200"
                aria-label="Follow us on Instagram"
              >
                <Instagram className="h-4.5 w-4.5" />
              </a>
              <a
                id="footer-social-twitter"
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyber-lightgray text-gray-400 hover:text-white hover:bg-cyber-purple/30 focus:outline-none focus:ring-2 focus:ring-cyber-purple transition-all duration-200"
                aria-label="Follow us on Twitter"
              >
                <Twitter className="h-4.5 w-4.5" />
              </a>
              <a
                id="footer-social-youtube"
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyber-lightgray text-gray-400 hover:text-white hover:bg-cyber-purple/30 focus:outline-none focus:ring-2 focus:ring-cyber-purple transition-all duration-200"
                aria-label="Watch our tournaments on Youtube"
              >
                <Youtube className="h-4.5 w-4.5" />
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
              Quick Navigation
            </h3>
            <ul className="space-y-2.5">
              <li>
                <a
                  id="footer-link-home"
                  href="#home"
                  onClick={(e) => handleNavClick(e, '#home')}
                  className="text-sm text-gray-400 hover:text-cyber-purple transition-colors duration-200 focus:outline-none focus:underline"
                >
                  Home Lobby
                </a>
              </li>
              <li>
                <a
                  id="footer-link-stations"
                  href="#stations"
                  onClick={(e) => handleNavClick(e, '#stations')}
                  className="text-sm text-gray-400 hover:text-cyber-purple transition-colors duration-200 focus:outline-none focus:underline"
                >
                  Gaming Stations
                </a>
              </li>
              <li>
                <a
                  id="footer-link-games"
                  href="#games"
                  onClick={(e) => handleNavClick(e, '#games')}
                  className="text-sm text-gray-400 hover:text-cyber-purple transition-colors duration-200 focus:outline-none focus:underline"
                >
                  Popular Game Genres
                </a>
              </li>
              <li>
                <a
                  id="footer-link-pricing"
                  href="#pricing"
                  onClick={(e) => handleNavClick(e, '#pricing')}
                  className="text-sm text-gray-400 hover:text-cyber-purple transition-colors duration-200 focus:outline-none focus:underline"
                >
                  Hourly & Block Rates
                </a>
              </li>
              <li>
                <a
                  id="footer-link-reviews"
                  href="#reviews"
                  onClick={(e) => handleNavClick(e, '#reviews')}
                  className="text-sm text-gray-400 hover:text-cyber-purple transition-colors duration-200 focus:outline-none focus:underline"
                >
                  Reviews & Feedback
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Cafe Hours */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
              Cafe Hours
            </h3>
            <div className="space-y-3">
              {VENUE_INFO.hours.map((item, idx) => (
                <div key={idx} className="flex flex-col">
                  <span className="text-xs text-cyber-cyan font-mono font-medium">{item.days}</span>
                  <span className="text-sm text-gray-300 font-sans">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Column 4: Contact & Venue */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-white">
              Get In Touch
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <MapPin className="h-5 w-5 text-cyber-purple shrink-0 mt-0.5" />
                <span className="text-sm text-gray-400 leading-relaxed font-sans">
                  {VENUE_INFO.address}
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4.5 w-4.5 text-cyber-cyan shrink-0" />
                <a
                  id="footer-link-phone"
                  href={`tel:${VENUE_INFO.phone.replace(/\s+/g, '')}`}
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none focus:underline"
                >
                  {VENUE_INFO.phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4.5 w-4.5 text-cyber-cyan shrink-0" />
                <a
                  id="footer-link-email"
                  href={`mailto:${VENUE_INFO.email}`}
                  className="text-sm text-gray-400 hover:text-white transition-colors duration-200 focus:outline-none focus:underline"
                >
                  {VENUE_INFO.email}
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8">
          <p className="text-xs text-gray-500 font-mono">
            &copy; {currentYear} GameZ Cafe. All rights reserved. Built with precision for Mangaluru's gamers.
          </p>
          <div className="flex items-center gap-6">
            <button
              id="footer-legal-terms"
              onClick={() => alert('Terms of Service and Play Guidelines: Keep the tables tidy, respect fair play limits, and maintain positive vibes inside the arena!')}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors focus:outline-none"
            >
              Play Guidelines
            </button>
            <span className="text-gray-700">|</span>
            <span className="text-xs text-cyber-cyan font-mono">
              ₹ INR Accepted Only
            </span>
          </div>
        </div>

      </div>
    </footer>
  );
}
