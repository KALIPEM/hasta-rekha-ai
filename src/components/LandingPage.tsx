import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Hand, X, Star, CreditCard } from 'lucide-react';

interface LandingPageProps {
  onLoginClick: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
  const [showPricing, setShowPricing] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-paper)] relative overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Top Header / Nav */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-center z-50">
        <button 
            onClick={() => setShowPricing(true)}
            className="text-[var(--color-ink-light)] hover:text-white text-sm font-medium transition-colors tracking-wide"
        >
          Pricing
        </button>
      </div>

      {/* Animated Canvas Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--color-brand)]/10 blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--color-brand-light)]/10 blur-[120px] mix-blend-screen"></div>
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full border border-[var(--color-brand)]/5 blur-[2px] opacity-10"></div>
        
        {/* Palm images */}
        <img 
          src="https://ik.imagekit.io/kalidaspem/lefthand.png" 
          alt="Left Palm" 
          className="absolute bottom-[-5%] left-[-5%] w-[30vw] min-w-[200px] max-w-[400px] opacity-60 object-contain drop-shadow-[0_0_30px_rgba(124,92,255,0.2)]"
        />
        <img 
          src="https://ik.imagekit.io/kalidaspem/righthand.png" 
          alt="Right Palm" 
          className="absolute bottom-[-5%] right-[-5%] w-[30vw] min-w-[200px] max-w-[400px] opacity-60 object-contain drop-shadow-[0_0_30px_rgba(124,92,255,0.2)]"
        />

        {/* Star particles */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 3 + 'px',
              height: Math.random() * 3 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
            }}
            animate={{
              opacity: [0.1, 0.8, 0.1],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative z-10 text-center max-w-3xl mx-auto flex flex-col items-center"
      >
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-[var(--color-brand)]/20 blur-2xl rounded-full"></div>
          <Hand size={64} className="text-[var(--color-brand-light)] drop-shadow-[0_0_20px_rgba(0,212,255,0.8)] relative z-10" strokeWidth={1} />
        </div>

        <h1 className="text-5xl md:text-7xl font-serif text-white tracking-tight mb-6 drop-shadow-lg">
          Vedic Palmistry
        </h1>
        
        <p className="text-lg md:text-xl text-[var(--color-ink-light)] font-sans max-w-xl mx-auto mb-12 leading-relaxed opacity-90">
          Curious about what your palms can actually tell you? We bring together the ancient wisdom of Samudrik Shastra and the power of advanced AI to help you uncover real, detailed insights about who you are.
        </p>

        <div className="flex flex-col items-center gap-6">
          <motion.button 
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(124,92,255,0.5)" }}
            whileTap={{ scale: 0.95 }}
            onClick={onLoginClick}
            className="relative overflow-hidden bg-gradient-to-r from-[var(--color-surface-hover)] to-[var(--color-surface)] border border-[var(--color-brand)]/50 text-white py-4 px-10 rounded-full font-medium tracking-wide transition-all shadow-xl flex justify-center items-center gap-3 group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-brand-light)] opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
            <span className="text-lg">Begin Reading</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Powered by / Associated partner */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-fit flex flex-col items-center">
        <span className="text-[10px] text-white/40 mb-1.5 uppercase tracking-[0.2em] font-sans">Powered by</span>
        <a href="https://www.sadhanaboard.com" target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 group/logo flex-row no-underline">
            <div className="relative">
                <img
                    src="https://www.sadhanaboard.com/lovable-uploads/sadhanaboard_logo.webp"
                    alt="SadhanaBoard Logo"
                    className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full cursor-pointer scale-110 shadow-lg shadow-purple-500/5 transition-transform duration-300 group-hover/logo:scale-125 relative z-10"
                    style={{
                        filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.1))'
                    }}
                />
                <div className="absolute inset-0 rounded-full animate-pulse z-0"
                    style={{
                        background: 'radial-gradient(circle, rgba(255, 215, 0, 0.05) 0%, rgba(255, 165, 0, 0.02) 60%, transparent 70%)',
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                    }}
                />
                <div
                    className="absolute inset-0 rounded-full animate-[spin_3s_linear_infinite]"
                    style={{
                        background: 'conic-gradient(from 0deg, rgba(255, 215, 0, 0.1), rgba(138, 43, 226, 0.1), rgba(255, 215, 0, 0.1))',
                        padding: '2px'
                    }}
                >
                    <div className="w-full h-full rounded-full bg-[var(--color-surface)]" />
                </div>
            </div>

            <div className="flex flex-col text-left">
                <span className="text-base sm:text-lg md:text-2xl font-bold text-yellow-300 transition-all duration-300 group-hover/logo:text-yellow-200 font-chakra leading-tight">
                    SadhanaBoard
                </span>
                <span className="text-[9px] sm:text-[10px] md:text-xs text-yellow-400/80 font-medium tracking-wider hidden xs:block sm:block transition-all duration-300 group-hover/logo:text-yellow-300 font-chakra uppercase leading-tight">
                    ✨ Your Digital Yantra
                </span>
            </div>
        </a>
      </div>

      <AnimatePresence>
        {showPricing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-black/60"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[var(--color-surface)] border border-white/10 rounded-3xl p-6 md:p-8 max-w-4xl w-full relative overflow-y-auto hide-scrollbar max-h-[90vh]"
            >
              <button 
                onClick={() => setShowPricing(false)}
                className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors text-white"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-10 mt-2">
                <h2 className="text-3xl md:text-4xl font-serif text-white mb-3">Buy Readings</h2>
                <p className="text-[var(--color-ink-light)]">Choose the depth of your spiritual analysis</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Free Plan */}
                <div className="bg-black/20 border border-white/10 rounded-2xl p-6 flex flex-col relative group hover:border-[var(--color-brand)]/30 transition-colors">
                  <div className="mb-4">
                    <h3 className="text-xl font-serif text-white mb-1">Seeker</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-semibold text-white">Free</span>
                    </div>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1 text-sm text-[var(--color-ink-light)]">
                    <li className="flex items-start gap-2">
                      <Star size={16} className="text-[var(--color-brand)] shrink-0 mt-0.5"/> 
                      <span className="leading-relaxed">One-time short analysis</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Star size={16} className="text-[var(--color-brand)] shrink-0 mt-0.5"/> 
                      <span className="leading-relaxed">Basic life patterns overview</span>
                    </li>
                  </ul>
                  <button 
                    onClick={() => { setShowPricing(false); onLoginClick(); }} 
                    className="w-full py-3 rounded-xl border border-[var(--color-brand)] text-[var(--color-brand-light)] hover:bg-[var(--color-brand)] hover:text-white transition-colors font-medium"
                  >
                    Start Free
                  </button>
                </div>

                {/* 5 Readings Plan */}
                <div className="bg-[var(--color-brand)]/10 border border-[var(--color-brand)] shadow-[0_0_20px_rgba(124,92,255,0.15)] rounded-2xl p-6 flex flex-col relative transform md:-translate-y-4">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--color-brand)] text-white text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full whitespace-nowrap">
                    Most Popular
                  </div>
                  <div className="mb-4 pt-2">
                    <h3 className="text-xl font-serif text-white mb-1">Family Pack</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-semibold text-white">₹60</span>
                      <span className="text-lg text-white/40 line-through">₹100</span>
                    </div>
                    <p className="text-[var(--color-brand-light)] text-sm mt-1">5 Detailed Readings</p>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1 text-sm text-[var(--color-ink-light)]">
                    <li className="flex items-start gap-2">
                      <Sparkles size={16} className="text-[var(--color-brand-light)] shrink-0 mt-0.5"/> 
                      <span className="leading-relaxed">Full cosmic intelligence profile</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sparkles size={16} className="text-[var(--color-brand-light)] shrink-0 mt-0.5"/> 
                      <span className="leading-relaxed">Deep pattern & trajectory decoding</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Sparkles size={16} className="text-[var(--color-brand-light)] shrink-0 mt-0.5"/> 
                      <span className="leading-relaxed">Save reading histories permanently</span>
                    </li>
                  </ul>
                  <button 
                    onClick={() => { setShowPricing(false); onLoginClick(); }} 
                    className="w-full py-3 rounded-xl bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-light)] transition-colors font-medium shadow-lg drop-shadow-[0_4px_10px_rgba(124,92,255,0.3)]"
                  >
                    Get 5 Readings
                  </button>
                </div>

                {/* 1 Reading Plan */}
                <div className="bg-black/20 border border-white/10 rounded-2xl p-6 flex flex-col hover:border-[var(--color-brand)]/30 transition-colors">
                  <div className="mb-4">
                    <h3 className="text-xl font-serif text-white mb-1">Individual Pack</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-semibold text-white">₹20</span>
                    </div>
                    <p className="text-[var(--color-ink-light)] text-sm mt-1">1 Detailed Reading</p>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1 text-sm text-[var(--color-ink-light)]">
                    <li className="flex items-start gap-2">
                      <CreditCard size={16} className="text-[var(--color-brand)] shrink-0 mt-0.5"/> 
                      <span className="leading-relaxed">One full detailed analysis</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CreditCard size={16} className="text-[var(--color-brand)] shrink-0 mt-0.5"/> 
                      <span className="leading-relaxed">Comprehensive topographic report</span>
                    </li>
                  </ul>
                  <button 
                    onClick={() => { setShowPricing(false); onLoginClick(); }} 
                    className="w-full py-3 rounded-xl border border-white/20 text-white hover:bg-white hover:text-black transition-colors font-medium"
                  >
                    Get 1 Reading
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
