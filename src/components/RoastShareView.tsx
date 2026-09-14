import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Reading, RoastReadingResponse } from '../types';
import { Camera, X } from 'lucide-react';

interface RoastShareViewProps {
  reading: Reading;
  onClose: () => void;
}

export const RoastShareView: React.FC<RoastShareViewProps> = ({ reading, onClose }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [showToast, setShowToast] = useState(false);

  let parsedData: RoastReadingResponse | null = null;
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
          title: 'My Palm Roast 🔥',
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
        
        {/* Subtle glassmorphism background customized for roast */}
        <div className="absolute inset-4 rounded-[40px] bg-red-950/10 backdrop-blur-3xl border border-red-500/20 shadow-[0_0_50px_rgba(220,38,38,0.15)] flex flex-col p-6 overflow-hidden">
          
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent opacity-50"></div>

          <div className="flex-1 flex flex-col gap-6 overflow-y-auto pb-10 hide-scrollbar pt-6">
            
            {/* Header */}
            <div className="text-center">
              <div className="text-xs font-serif font-bold uppercase tracking-[0.2em] text-red-400/80 mb-3 flex items-center justify-center gap-2">
                🪬 YOUR PALM ROAST
              </div>
              <h2 className="text-3xl font-serif italic leading-tight text-white/90 drop-shadow-md">
                "{parsedData.openingHook || 'Look at this hand...'}"
              </h2>
            </div>
            
            <div className="w-12 h-px bg-red-500/30 mx-auto my-2"></div>

            {/* Section 1: Let's be honest */}
            <div>
              <h3 className="text-sm font-serif font-bold uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                💀 Let's be honest
              </h3>
              <ul className="space-y-3">
                {parsedData.behavioralPatterns?.map((pattern, i) => (
                  <li key={i} className="text-base font-serif text-white/80 leading-snug flex items-start gap-2">
                    <span className="text-red-500/60 mt-1 text-xs">●</span>
                    <span>{pattern.pattern}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 2: The Annoying Part */}
            <div className="bg-red-950/20 rounded-2xl p-4 border border-red-500/10">
              <h3 className="text-xs font-serif font-bold uppercase tracking-widest text-red-300/60 mb-2">
                ⚖️ The Annoying Part
              </h3>
              <p className="text-sm font-serif text-white/70 leading-relaxed">
                {parsedData.executiveSummary}
              </p>
            </div>

            {/* Section 3: Current Phase */}
            <div className="bg-black/40 rounded-2xl p-4 border border-white/5 relative overflow-hidden">
              <h3 className="text-xs font-serif font-bold uppercase tracking-widest text-white/40 mb-2">
                🧭 Current Phase
              </h3>
              <h4 className="text-lg font-serif text-white/90 mb-1">{parsedData.lifeTimeline && parsedData.lifeTimeline[0] ? parsedData.lifeTimeline[0].phaseName : 'The Delusion Era'}</h4>
              <p className="text-sm font-serif text-white/60 leading-relaxed">
                {parsedData.lifeTimeline && parsedData.lifeTimeline[0] ? parsedData.lifeTimeline[0].keyEventOrShift : 'Keep dreaming.'}
              </p>
            </div>

            {/* Section 4: Fix This */}
            <div>
              <h3 className="text-sm font-serif font-bold uppercase tracking-widest text-white/50 mb-3 flex items-center gap-2">
                🛠️ Fix This
              </h3>
              <ul className="space-y-2">
                {parsedData.recommendedActions?.slice(0, 3).map((action, i) => (
                  <li key={i} className="text-sm text-red-200/80 leading-snug flex items-start gap-2">
                    <span className="text-red-500/60 mt-0.5">→</span>
                    <span className="font-serif">{action}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <div className="mt-auto text-center opacity-40 pt-4">
              <p className="text-xs font-serif italic text-white/70">
                {parsedData.majorHighlight || "Don't get offended. Take it up with your karma."}
              </p>
              <div className="mt-4 flex flex-col items-center gap-1 font-serif">
                <p className="text-[9px] uppercase tracking-[0.2em]">🔱 Don't get offended.</p>
                <p className="text-[9px] uppercase tracking-[0.2em]">This is literally what your palm shows.</p>
              </div>
            </div>

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
              className="w-full py-4 rounded-full bg-white text-black font-sans font-bold hover:bg-white/90 transition-transform active:scale-95 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
            >
              <Camera size={18} /> 📸 Share Roast
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
