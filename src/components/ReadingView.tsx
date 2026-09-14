import React, { useState, useEffect } from 'react';
import { Reading, ReadingContent, AspectReading, TimelineEvent, RoastReadingResponse } from '../types';
import { ArrowLeft, Check, X, Edit2, Zap, Brain, ShieldCheck, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-error';
import { ViralShareView } from './ViralShareView';
import { RoastShareView } from './RoastShareView';

interface ReadingViewProps {
  reading: Reading;
  onBack: () => void;
  onUpdateTitle?: (newTitle: string) => void;
}

const AspectCard = ({ 
  aspect, 
  delay 
}: { 
  aspect?: AspectReading, 
  delay: number 
}) => {
  if (!aspect) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.8, ease: "easeOut" }}
      className="bg-black/40 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)] relative overflow-hidden group"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-white/40 to-transparent opacity-50"></div>
      <h3 className="text-xl md:text-2xl font-serif text-white/90 mb-2 tracking-wide">{aspect.aspectName}</h3>
      <p className="text-white/80 font-medium text-base mb-4">{aspect.summary}</p>
      <p className="text-white/60 text-sm leading-relaxed mb-6 font-light">{aspect.detailedInterpretation}</p>
      
      <div className="flex flex-col gap-2 border-t border-white/5 pt-4">
        <div className="text-xs uppercase tracking-widest text-white/40 mb-2">
          <span>Structural Evidence</span>
        </div>
        <div className="bg-white/5 border border-white/10 text-white/60 px-3 py-2 rounded-md text-xs italic">
          {aspect.palmEvidence}
        </div>
      </div>
    </motion.div>
  );
};

export const ReadingView: React.FC<ReadingViewProps> = ({ reading, onBack, onUpdateTitle }) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(reading.title || "The Oracle's Verdict");
  const [isSaving, setIsSaving] = useState(false);
  const { user } = useAuth();
  const [visibleStages, setVisibleStages] = useState<number>(0);
  const [showViralShare, setShowViralShare] = useState(false);

  useEffect(() => {
    // Reveal one stage every 2.5 seconds for dramatic effect
    const interval = setInterval(() => {
      setVisibleStages(prev => {
        if (prev >= 15) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleSaveTitle = async () => {
    if (!user || !reading.id || editTitle.trim() === "") return;
    setIsSaving(true);
    try {
      const readingRef = doc(db, 'users', user.uid, 'readings', reading.id);
      await updateDoc(readingRef, { title: editTitle });
      setIsEditingTitle(false);
      if (onUpdateTitle) onUpdateTitle(editTitle);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/readings/${reading.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  let parsedData: ReadingContent | null = null;
  let isRoast = false;
  let isJson = false;
  
  try {
    const json = JSON.parse(reading.readingText);
    isJson = true;
    parsedData = json as ReadingContent;
    if (reading.mode === 'roast') {
      isRoast = true;
    } else if (reading.readingText.includes("openingPunchline")) {
       // fallback for legacy roast data
       isRoast = true;
    }
  } catch (e) {
    // not valid json
  }

  // We no longer bypass Rendering for Roast. We use the same layout for both.
  // We still offer the ViralShareView and RoastShareView behind buttons.

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="pb-24 min-h-screen bg-[#0a0a0a] text-white selection:bg-white/20 font-sans"
      >
        <div className="max-w-4xl mx-auto px-4 pt-8">
          <div className="flex justify-between items-center mb-12">
            <button 
              onClick={onBack}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm uppercase tracking-widest"
            >
              <ArrowLeft size={16} /> Dashboard
            </button>

            {parsedData && (
              <button 
                onClick={() => setShowViralShare(true)}
                className="flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white/80 py-2 px-4 rounded-full text-xs uppercase tracking-widest transition-colors shadow-sm"
              >
                <Share2 size={14} /> {isRoast ? 'Share Roast Screen' : 'Share Highlight'}
              </button>
            )}
          </div>

          {parsedData ? (
          <div className="space-y-16">
            
            {/* Header */}
            <div className="text-center group">
              {isEditingTitle ? (
                 <div className="flex justify-center items-center gap-2 mb-4 w-full">
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="bg-transparent border-b border-white/30 px-2 py-1 text-3xl font-serif text-white text-center focus:outline-none focus:border-white transition-colors"
                    disabled={isSaving}
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                  />
                  <button onClick={handleSaveTitle} disabled={isSaving} className="text-white/60 hover:text-white p-2"><Check size={20} /></button>
                  <button onClick={() => { setIsEditingTitle(false); setEditTitle(reading.title || "The Oracle's Verdict"); }} disabled={isSaving} className="text-white/60 hover:text-white p-2"><X size={20} /></button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3 cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                   <h1 className="text-4xl md:text-5xl font-serif tracking-tight text-white/90">{reading.title || "The Oracle's Verdict"}</h1>
                   <Edit2 size={16} className="text-white/30 group-hover:text-white/80 transition-colors" />
                </div>
              )}
            </div>

            {/* Stage 0: Hook & Executive Summary */}
            {visibleStages >= 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                className="text-center relative py-12"
              >
                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-px h-8 bg-gradient-to-b from-transparent to-white/20"></div>
                <h2 className="text-3xl md:text-5xl font-serif text-[var(--color-brand-light)] font-medium max-w-3xl mx-auto px-4 mb-6 leading-tight drop-shadow-md">
                  "{parsedData.majorHighlight}"
                </h2>
                <p className="text-xl md:text-2xl font-serif font-light italic text-white/70 leading-relaxed max-w-3xl mx-auto px-4 mb-10">
                  {parsedData.openingHook}
                </p>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 max-w-3xl mx-auto">
                  <h3 className="text-sm font-serif font-bold uppercase tracking-[0.2em] text-[var(--color-brand)]/80 mb-4 text-center">
                    Executive Summary
                  </h3>
                  <p className="text-base md:text-lg font-serif text-white/80 leading-relaxed text-left">
                    {parsedData.executiveSummary}
                  </p>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-px h-8 bg-gradient-to-t from-transparent to-white/20"></div>
              </motion.div>
            )}

            {/* Stages 1-N: Aspects */}
            <div className="space-y-8">
              {parsedData.aspects?.map((aspect, idx) => (
                visibleStages >= (idx + 1) && (
                  <AspectCard 
                    key={idx} 
                    aspect={aspect} 
                    delay={0}
                  />
                )
              ))}
            </div>

            {/* Post Aspects Stage: Life Timeline */}
            {visibleStages >= (parsedData.aspects?.length || 0) + 1 && parsedData.lifeTimeline?.length > 0 && (
              <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 1, ease: "easeOut" }}
                 className="relative border-l border-white/10 ml-4 md:ml-8 pl-8 py-4 space-y-12"
              >
                 <div className="absolute -left-3 top-0 bg-black px-2 text-white/40 uppercase text-xs tracking-widest rotate-[-90deg] origin-left translate-y-8">Timeline</div>
                 {parsedData.lifeTimeline?.map((item, idx) => (
                    <div key={idx} className="relative group">
                       <div className="absolute -left-[43px] top-1 w-3 h-3 rounded-full bg-white/20 border-2 border-[#0a0a0a] group-hover:bg-white group-hover:scale-150 transition-all"></div>
                       <span className="text-sm font-mono text-white/50 mb-1 block">{item.ageRange}</span>
                       <h4 className="text-xl font-serif text-white/90 mb-2">{item.phaseName}</h4>
                       <p className="text-white/70 mb-3">{item.keyEventOrShift}</p>
                       <p className="text-xs text-white/40 uppercase tracking-wider">Indicator: {item.palmEvidence}</p>
                    </div>
                 ))}
              </motion.div>
            )}

            {/* Behavioral Patterns */}
            {visibleStages >= (parsedData.aspects?.length || 0) + 2 && parsedData.behavioralPatterns?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {parsedData.behavioralPatterns?.map((pattern, idx) => (
                  <div key={idx} className="bg-white/5 border border-white/5 p-6 rounded-2xl">
                    <h4 className="font-serif text-lg text-white/80 mb-2">{pattern.pattern}</h4>
                    <p className="text-white/50 text-sm">{pattern.evidence}</p>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Recommended Actions */}
            {visibleStages >= (parsedData.aspects?.length || 0) + 3 && parsedData.recommendedActions?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 text-center"
              >
                <h3 className="text-2xl font-serif text-white mb-8 tracking-widest uppercase text-sm">Strategic Directives</h3>
                <div className="space-y-6 max-w-2xl mx-auto text-left">
                  {parsedData.recommendedActions?.map((action, idx) => (
                    <div key={idx} className="flex items-start gap-4">
                      <span className="text-white/30 font-serif text-xl border-t border-white/20 pt-1 w-6">{idx + 1}.</span>
                      <p className="text-white/80 text-lg font-light leading-relaxed border-t border-white/10 pt-1 flex-1">{action}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
            
            {visibleStages < (parsedData.aspects?.length || 0) + 3 && (
              <div className="flex justify-center py-12 opacity-50">
                <div className="w-1 h-1 bg-white rounded-full animate-ping"></div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white/5 p-8 rounded-2xl border border-white/10 font-mono text-sm text-white/60 whitespace-pre-wrap leading-loose">
            {reading.readingText}
          </div>
        )}
      </div>
    </motion.div>
    
    <AnimatePresence>
      {showViralShare && (
        isRoast ? (
          <RoastShareView 
            reading={reading} 
            onClose={() => setShowViralShare(false)} 
          />
        ) : (
          <ViralShareView 
            reading={reading} 
            onClose={() => setShowViralShare(false)} 
          />
        )
      )}
    </AnimatePresence>
    </>
  );
};
