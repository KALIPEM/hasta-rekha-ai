import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Reading, ReadingContent } from '../types';
import { Camera, X } from 'lucide-react';

interface ViralShareViewProps {
  reading: Reading;
  onClose: () => void;
}

export const ViralShareView: React.FC<ViralShareViewProps> = ({ reading, onClose }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [showToast, setShowToast] = useState(false);

  let parsedData: ReadingContent | null = null;
  try {
    parsedData = JSON.parse(reading.readingText);
  } catch (e) {
    // Should only be used with valid JSON readings
  }

  const handleShare = async () => {
    setIsLocked(true);
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Vedic Palm Analysis',
          url: window.location.href,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
      setIsLocked(false);
    } else {
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        setIsLocked(false);
      }, 3000);
    }
  };

  if (!parsedData) return null;

  // 1. Data Mapping (The "Public Identity" Filter)
  const hook = parsedData.openingHook;
  
  // Use major highlight as the core advantage
  const advantage = parsedData.majorHighlight || "Hidden potential awaits extraction.";

  // Find the current era (simplest approach: just take the first timeline event for now)
  const currentEra = parsedData.lifeTimeline && parsedData.lifeTimeline.length > 0 
    ? parsedData.lifeTimeline[0] 
    : { phaseName: "The Awakening", ageRange: "Present", keyEventOrShift: "An era of transformation." };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col justify-center items-center text-white font-serif overflow-hidden">
      
      {/* Action Buttons (Hidden when locked) */}
      <AnimatePresence>
        {!isLocked && (
          <motion.button 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute top-6 left-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-20"
          >
            <X size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* The Frame: perfect vertical card */}
      <div className="w-full max-w-sm h-full max-h-[850px] relative flex flex-col p-6 sm:p-8">
        
        {/* Subtle glassmorphism background */}
        <div className="absolute inset-4 rounded-[40px] bg-white/[0.03] backdrop-blur-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col p-6 overflow-hidden">
          
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-50"></div>

          <div className="flex-1 flex flex-col justify-center gap-10">
            
            {/* The Hook */}
            <div className="text-center">
              <h2 className="text-2xl font-light italic leading-relaxed text-white/90 drop-shadow-md">
                "{hook}"
              </h2>
            </div>
            
            <div className="w-12 h-px bg-white/20 mx-auto"></div>

            {/* Dharmic Advantage */}
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-3 text-center">
                <span className="inline-block" style={{ textShadow: '0 -1px 1px rgba(0,0,0,0.8), 0 1px 1px rgba(255,255,255,0.2)' }}>⚡ Latent Advantage</span>
              </div>
              <p className="text-lg text-white/80 leading-relaxed text-center font-light">
                {advantage}
              </p>
            </div>

            {/* Current Era */}
            <div className="bg-white/5 rounded-2xl p-5 border border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
              <div className="text-xs uppercase tracking-[0.2em] text-white/40 mb-2" style={{ textShadow: '0 -1px 1px rgba(0,0,0,0.8), 0 1px 1px rgba(255,255,255,0.2)' }}>
                🧭 Current Era • {currentEra.ageRange}
              </div>
              <h3 className="text-xl text-white/90 mb-1">{currentEra.phaseName}</h3>
              <p className="text-sm font-sans font-light text-white/60 leading-relaxed">
                {currentEra.keyEventOrShift}
              </p>
            </div>

          </div>

          {/* Branding Footer */}
          <div className="mt-8 text-center opacity-40">
            <p className="text-[10px] uppercase tracking-[0.3em] font-sans">Decoded via Vedic</p>
            <p className="text-[10px] uppercase tracking-[0.3em] font-sans">Hasta Samudrika Shastra</p>
          </div>

        </div>
      </div>

      {/* Share Button (Hidden when locked) */}
      <AnimatePresence>
        {!isLocked && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-xs px-6"
          >
            <button 
              onClick={handleShare}
              className="w-full py-4 rounded-full bg-white text-black font-sans font-medium hover:bg-white/90 transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              <Camera size={18} /> 📸 Share Insight
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-md border border-white/30 text-white font-sans text-sm px-6 py-3 rounded-full whitespace-nowrap z-50"
          >
            UI locked for screenshot. Take your screenshot now.
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
