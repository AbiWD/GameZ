import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, X, Gamepad2 } from 'lucide-react';
import { GalleryItem } from '../types';

interface ExpandableGalleryProps {
  items: GalleryItem[];
}

export const ExpandableGallery: React.FC<ExpandableGalleryProps> = ({ items }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const openImage = (index: number) => {
    setSelectedIndex(index);
  };

  const closeImage = () => {
    setSelectedIndex(null);
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex + 1) % items.length);
    }
  };

  const goToPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIndex !== null) {
      setSelectedIndex((selectedIndex - 1 + items.length) % items.length);
    }
  };

  const getFlexValue = (index: number) => {
    if (hoveredIndex === null) {
      return 1;
    }
    return hoveredIndex === index ? 2.5 : 0.7;
  };

  return (
    <div className="w-full">
      {/* Horizontal Expandable Gallery (Desktop & Tablet) */}
      <div className="hidden md:flex gap-3 h-[420px] w-full">
        {items.map((item, index) => {
          const isHovered = hoveredIndex === index;
          return (
            <motion.div
              key={item.id}
              className="relative cursor-pointer overflow-hidden rounded-2xl border border-white/5 bg-cyber-gray"
              style={{ flex: 1 }}
              animate={{ flex: getFlexValue(index) }}
              transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => openImage(index)}
            >
              {/* Image */}
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-cyber-lightgray flex items-center justify-center">
                  <Gamepad2 className="h-8 w-8 text-white/20" />
                </div>
              )}

              {/* Dynamic Gradient Shading - fades out on hover to show full image */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10"
                animate={{ opacity: isHovered ? 0.8 : 0.6 }}
                transition={{ duration: 0.3 }}
              />

              {/* Hover highlight border */}
              <motion.div
                className="absolute inset-0 border-2 border-cyber-purple/50 rounded-2xl z-20 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.3 }}
              />

              {/* Content overlays */}
              <div className="absolute inset-x-0 bottom-0 p-5 z-20 flex flex-col justify-end h-1/2 select-none">
                {/* Category tag */}
                <span className="self-start text-[9px] font-mono font-bold tracking-widest text-cyber-cyan uppercase px-2 py-0.5 rounded bg-cyber-purple/20 border border-cyber-purple/30 mb-2">
                  {item.category}
                </span>

                {/* Title */}
                <h3 className="font-display text-base font-extrabold text-white tracking-wide truncate">
                  {item.title}
                </h3>

                {/* Description (stretches or fades in on hover) */}
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ 
                    height: isHovered ? 'auto' : 0, 
                    opacity: isHovered ? 1 : 0,
                    marginTop: isHovered ? '8px' : '0px'
                  }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <p className="text-xs text-gray-300 leading-relaxed font-sans">
                    {item.description}
                  </p>
                  <span className="inline-block mt-3 text-[10px] font-mono text-cyber-cyan font-bold tracking-wider uppercase">
                    Click to preview →
                  </span>
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Grid view (Mobile screens) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:hidden">
        {items.map((item, index) => (
          <div
            key={item.id}
            onClick={() => openImage(index)}
            className="group relative h-64 rounded-2xl bg-cyber-gray border border-white/5 overflow-hidden flex flex-col justify-end p-5 hover:border-cyber-purple/30 transition-all duration-300 cursor-pointer"
          >
            {/* Image */}
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full bg-cyber-lightgray flex items-center justify-center">
                <Gamepad2 className="h-8 w-8 text-white/20" />
              </div>
            )}

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-10 pointer-events-none" />

            {/* Content */}
            <div className="relative z-20">
              <span className="inline-block font-mono text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-cyber-purple/20 border border-cyber-purple/30 text-cyber-cyan mb-2">
                {item.category}
              </span>
              <h3 className="font-display text-base font-extrabold text-white mb-1">
                {item.title}
              </h3>
              <p className="text-xs text-gray-300 leading-normal mb-1">
                {item.description}
              </p>
              <span className="inline-block mt-1 text-[9px] font-mono text-cyber-cyan font-semibold tracking-wider uppercase">
                Tap to preview →
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Expanded View Modal (Cinematic Darkroom Overlay) */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-4 sm:p-6 md:p-8"
            onClick={closeImage}
          >
            {/* Background cyber glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-cyber-purple/10 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-cyber-cyan/10 blur-[120px] pointer-events-none" />

            {/* Close Button */}
            <button
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-[110] p-3 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 shadow-lg cursor-pointer animate-none"
              onClick={closeImage}
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Carousel Content Container */}
            <div className="relative w-full max-w-6xl flex flex-col items-center justify-center flex-1 max-h-[75vh]">
              {/* Previous Button */}
              {items.length > 1 && (
                <button
                  className="absolute left-0 sm:-left-4 md:-left-12 z-[110] p-3 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 shadow-lg cursor-pointer"
                  onClick={goToPrev}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Main Image Frame */}
              <motion.div
                className="relative max-w-full max-h-full w-auto h-auto flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-cyber-dark/40"
                onClick={(e) => e.stopPropagation()}
              >
                {items[selectedIndex].imageUrl ? (
                  <motion.img
                    key={selectedIndex}
                    src={items[selectedIndex].imageUrl}
                    alt={items[selectedIndex].title}
                    className="max-w-full max-h-[60vh] object-contain rounded-2xl"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-[500px] h-[300px] max-w-full flex items-center justify-center bg-cyber-lightgray rounded-2xl">
                    <Gamepad2 className="h-12 w-12 text-white/20" />
                  </div>
                )}
              </motion.div>

              {/* Next Button */}
              {items.length > 1 && (
                <button
                  className="absolute right-0 sm:-right-4 md:-right-12 z-[110] p-3 rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 shadow-lg cursor-pointer"
                  onClick={goToNext}
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Bottom info pane */}
            <motion.div 
              key={`info-${selectedIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-6 text-center max-w-2xl px-4 select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="inline-block text-[9px] font-mono font-bold tracking-widest uppercase text-cyber-cyan px-2 py-0.5 rounded bg-cyber-purple/20 border border-cyber-purple/30 mb-2">
                {items[selectedIndex].category}
              </span>
              <h4 className="font-display text-xl sm:text-2xl font-extrabold text-white mb-2">
                {items[selectedIndex].title}
              </h4>
              <p className="text-sm text-gray-400 leading-relaxed font-sans mb-3">
                {items[selectedIndex].description}
              </p>
              
              {/* Image Counter */}
              <div className="inline-block text-xs font-mono text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                {selectedIndex + 1} / {items.length}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
