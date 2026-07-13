import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import NavBar from './components/NavBar';
import Footer from './components/Footer';
import Landing from './pages/Landing';
import Book from './pages/Book';
import { EmailNotificationBanner } from './components/EmailNotificationBanner';

export default function App() {
  // Sync router with browser path natively
  const [currentRoute, setCurrentRoute] = useState<string>('/');

  useEffect(() => {
    // Parse initial path on first render
    const path = window.location.pathname;
    if (path === '/book') {
      setCurrentRoute('/book');
    } else {
      setCurrentRoute('/');
    }

    // Popstate listener to handle browser back/forward buttons
    const handlePopState = () => {
      const activePath = window.location.pathname;
      if (activePath === '/book') {
        setCurrentRoute('/book');
      } else {
        setCurrentRoute('/');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const setRoute = (route: string) => {
    // Scroll to top immediately when route changes
    window.scrollTo({ top: 0 });
    
    // Push path history
    window.history.pushState(null, '', route);
    setCurrentRoute(route);
  };

  return (
    <div className="flex flex-col min-h-screen bg-cyber-dark text-gray-100 selection:bg-cyber-purple selection:text-white">
      {/* Sticky Header Navigation */}
      <NavBar currentRoute={currentRoute} setRoute={setRoute} />

      {/* Main Page Area with Route Transitions */}
      <main className="flex-grow">
        <AnimatePresence mode="wait">
          {currentRoute === '/book' ? (
            <motion.div
              key="book-page"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            >
              <Book setRoute={setRoute} />
            </motion.div>
          ) : (
            <motion.div
              key="landing-page"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
            >
              <Landing setRoute={setRoute} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Brand Footer */}
      <Footer currentRoute={currentRoute} setRoute={setRoute} />

      {/* Simulated Email Notification Delivery Banner & Logs Panel */}
      <EmailNotificationBanner />
    </div>
  );
}

