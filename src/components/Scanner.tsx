import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-error';
import { generatePalmReading, PalmImage } from '../lib/gemini-utils';
import { Reading } from '../types';
import { X, Hand, HandHeart, Briefcase, Brain, Compass, Sparkles, Camera, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ScannerProps {
  onCancel: () => void;
  onScanComplete: (reading: Reading) => void;
}

export const Scanner: React.FC<ScannerProps> = ({ onCancel, onScanComplete }) => {
  const { user } = useAuth();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const [dominantHand, setDominantHand] = useState('Right-handed');
  const [ageRange, setAgeRange] = useState('');
  const [mainFocus, setMainFocus] = useState('Overall life path');
  const [readingName, setReadingName] = useState('My Spiritual Path');
  const [isRoastMode, setIsRoastMode] = useState(false);
  const [showRoastWarning, setShowRoastWarning] = useState(false);

  const [loadingText, setLoadingText] = useState("Analyzing life patterns...");

  const loadingMessages = [
    "Analyzing life patterns...",
    "Mapping karmic tendencies...",
    "Cross-validating signals...",
    "Extracting behavioral patterns...",
    "Synthesizing sacred geometry..."
  ];

  useEffect(() => {
    let interval: any;
    if (step === 3 && isProcessing) {
      let i = 0;
      interval = setInterval(() => {
        i = (i + 1) % loadingMessages.length;
        setLoadingText(loadingMessages[i]);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [step, isProcessing]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      addImageFiles(newFiles);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
      addImageFiles(newFiles);
    }
  };

  const addImageFiles = (files: File[]) => {
    if (imageFiles.length + files.length > 2) {
      setError('Limit: 2 palm images.');
      return;
    }
    setImageFiles(prev => [...prev, ...files]);
    setError('');
  };

  const processReading = async () => {
    if (imageFiles.length === 0 || !user) return;
    
    setStep(3); // Enter Loading Ritual
    setIsProcessing(true);
    setError('');

    try {
      const palmImages: PalmImage[] = [];
      const compressedImages: string[] = [];
      
      const compressImage = async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
           const img = new Image();
           img.onload = () => {
              const canvas = document.createElement('canvas');
              let width = img.width;
              let height = img.height;
              const max = 600;
              if (width > height) {
                if (width > max) {
                   height *= max / width;
                   width = max;
                }
              } else {
                if (height > max) {
                   width *= max / height;
                   height = max;
                }
              }
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx?.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.7));
           };
           img.onerror = reject;
           img.src = URL.createObjectURL(file);
        });
      };

      for (const file of imageFiles) {
        // Just read the file as base64 without compression so details are not lost
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remove data URI prefix
          };
          reader.onerror = error => reject(error);
        });
        
        palmImages.push({
          base64: base64Data,
          mimeType: file.type || 'image/jpeg'
        });
      }
      
      const readingText = await generatePalmReading(palmImages, dominantHand, ageRange, mainFocus, isRoastMode);
      
      for (const file of imageFiles) {
        try {
          const compressed = await compressImage(file);
          compressedImages.push(compressed);
        } catch (e) {
          console.error("Failed to compress image", e);
        }
      }

      if (!readingText || readingText === "{}" || readingText.length < 10) {
        throw new Error('Analysis failed. Please try again with a clearer image.');
      }

      const readingsRef = collection(db, 'users', user.uid, 'readings');
      
      try {
        const docRef = await addDoc(readingsRef, {
          userId: user.uid,
          title: readingName,
          readingText: readingText,
          images: compressedImages,
          createdAt: serverTimestamp(),
          mode: isRoastMode ? 'roast' : 'standard'
        });

        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
           const currentCredits = userDoc.data().credits || 0;
           if (currentCredits > 0) {
             await updateDoc(userDocRef, { credits: Math.max(0, currentCredits - 1) });
           }
        }
        
        onScanComplete({
          id: docRef.id,
          userId: user.uid,
          title: readingName,
          readingText,
          images: compressedImages,
          createdAt: Date.now(),
          mode: isRoastMode ? 'roast' : 'standard'
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/readings`);
      }

    } catch (err: any) {
      console.error(err);
      
      let errorMessage = err.message || 'An error occurred during analysis.';
      if (errorMessage.includes("503") || errorMessage.includes("UNAVAILABLE")) {
        errorMessage = "Our AI palmologist is experiencing high demands. Please try again in a few moments.";
      }
      
      setError(errorMessage);
      setStep(1); // Go back to scanner on error
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[var(--color-paper)] overflow-y-auto w-full h-full">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--color-brand)]/5 blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--color-brand-light)]/5 blur-[120px] mix-blend-screen"></div>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 min-h-screen flex flex-col pt-24 pb-32">
        {step !== 3 && (
          <button 
            onClick={onCancel}
            className="absolute top-8 right-8 p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-[var(--color-ink)] backdrop-blur-md border border-white/10"
          >
            <X size={24} />
          </button>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5 }}
              className="flex-1 flex flex-col items-center justify-center w-full max-w-xl mx-auto"
            >
              <h2 className="text-4xl md:text-5xl font-serif text-white mb-4 text-center tracking-tight">Upload Your Palms</h2>
              <p className="text-[var(--color-ink-light)] text-center mb-12 text-lg">Clear images of your left and right hands.</p>
              
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="w-full relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-brand-light)] rounded-[40px] opacity-20 blur-xl group-hover:opacity-40 transition-opacity duration-500 pointer-events-none"></div>
                <div className="relative bg-[var(--color-surface)] border border-[var(--color-brand)]/30 rounded-[40px] p-12 text-center overflow-hidden hover:border-[var(--color-brand)]/60 transition-colors shadow-2xl">
                  
                  {imageFiles.length < 2 && (
                    <div className="flex flex-col items-center justify-center py-6 px-4 border-2 border-dashed border-[var(--color-brand)]/30 rounded-3xl bg-[var(--color-surface-hover)] hover:bg-[var(--color-brand)]/5 hover:border-[var(--color-brand)] transition-all relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-brand)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative mb-4">
                        <div className="absolute inset-0 bg-[var(--color-brand)]/20 blur-xl rounded-full scale-150 relative z-0"></div>
                        <div className="bg-[var(--color-surface)] border border-[var(--color-brand)]/20 p-4 rounded-2xl relative z-10 shadow-[0_0_20px_rgba(124,92,255,0.15)] group-hover:scale-105 transition-transform">
                          <Hand className="text-[var(--color-brand-light)] drop-shadow-[0_0_10px_rgba(0,212,255,0.8)]" size={32} />
                        </div>
                      </div>
                      <span className="block text-xl text-white font-medium mb-1 relative z-20">Upload your palms</span>
                      <span className="text-[var(--color-ink-light)] text-sm mb-6 pb-2 border-b border-white/5 w-full max-w-[200px] text-center relative z-20">{imageFiles.length}/2 Images uploaded</span>
                      
                      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm relative z-20">
                        <label className="flex-1 cursor-pointer bg-[var(--color-brand)] hover:bg-[var(--color-brand-light)] text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors font-medium shadow-lg drop-shadow-[0_4px_10px_rgba(124,92,255,0.2)]">
                          <Camera size={18} />
                          Take Photo
                          <input type="file" className="hidden" accept="image/jpeg, image/png, image/webp" capture="environment" onChange={handleFileSelect} />
                        </label>
                        
                        <label className="flex-1 cursor-pointer bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors font-medium border border-white/10">
                          <Upload size={18} />
                          Browse Files
                          <input type="file" className="hidden" accept="image/jpeg, image/png, image/webp" onChange={handleFileSelect} />
                        </label>
                      </div>
                    </div>
                  )}

                  {imageFiles.length > 0 && (
                    <div className="mt-8 flex gap-4 justify-center">
                      {imageFiles.map((file, i) => (
                        <motion.div 
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          key={i} 
                          className="relative w-32 h-40 rounded-2xl overflow-hidden border border-white/20 shadow-lg"
                        >
                          <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Palm" />
                          <button onClick={(e) => { e.preventDefault(); setImageFiles(fs => fs.filter((_, idx)=>idx!==i)); }} className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-red-500 transition-colors">
                            <X size={14}/>
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {imageFiles.length > 0 && (
                    <div className="mt-6 flex flex-col items-center justify-center gap-4">
                      <div className="w-full max-w-[200px]">
                         <label className="text-white/60 text-xs font-medium uppercase tracking-widest mb-1 block text-center">Your Age</label>
                         <input 
                           type="number" 
                           placeholder="e.g. 28" 
                           value={ageRange} 
                           onChange={(e) => setAgeRange(e.target.value)}
                           className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white transition-colors text-center shadow-inner"
                         />
                      </div>
                      <label className="flex items-center cursor-pointer gap-3 p-3 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                        <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                          Roast Mode: {isRoastMode ? <span className="text-red-400 font-bold">On 🔥</span> : <span className="text-[var(--color-brand-light)]">Off</span>}
                        </span>
                        <div className="relative inline-block w-12 h-6 align-middle select-none transition duration-200 ease-in">
                          <input 
                            type="checkbox" 
                            name="toggle" 
                            checked={isRoastMode}
                            onChange={() => setIsRoastMode(!isRoastMode)}
                            className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 border-transparent appearance-none cursor-pointer transition-transform duration-200 ease-in-out z-10"
                            style={{ transform: isRoastMode ? 'translateX(100%)' : 'translateX(0)' }}
                          />
                          <div className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in ${isRoastMode ? 'bg-red-500' : 'bg-gray-600'}`}></div>
                        </div>
                      </label>
                    </div>
                  )}

                  {error && <p className="text-red-400 mt-4 text-sm bg-red-900/20 py-2 rounded-lg">{error}</p>}
                </div>
              </div>

              {imageFiles.length > 0 && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => {
                    if (!ageRange) {
                      setError("Please enter your age.");
                      return;
                    }
                    if (isRoastMode) {
                      setShowRoastWarning(true);
                    } else {
                      processReading();
                    }
                  }}
                  className="mt-10 flex items-center justify-center gap-2 bg-white text-black px-12 py-4 rounded-full font-semibold text-lg hover:bg-[var(--color-brand)] hover:text-white transition-all hover:shadow-[0_0_30px_rgba(124,92,255,0.4)]"
                >
                  <Sparkles size={18} /> Analyze Patterns
                </motion.button>
              )}
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center min-h-[60vh] relative"
            >
              <div className="relative w-64 h-64 flex items-center justify-center">
                {/* Rotating Sacred Geometry */}
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-2 border-[var(--color-brand-light)]/20 rounded-full border-dashed"
                ></motion.div>
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-4 border border-[var(--color-brand)]/40 rounded-full"
                ></motion.div>
                <motion.div 
                  animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-gradient-to-t from-[var(--color-brand)]/20 to-transparent rounded-full mix-blend-screen blur-xl"
                ></motion.div>
                
                {/* Center Core */}
                <div className="relative z-10 w-24 h-24 bg-[var(--color-surface)] border border-[var(--color-brand-light)]/50 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(0,212,255,0.4)] backdrop-blur-md">
                  <Hand className="text-white drop-shadow-md" size={36} strokeWidth={1} />
                </div>
              </div>

              <motion.div 
                key={loadingText}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-12 h-8"
              >
                <p className="text-[var(--color-brand-light)] font-serif text-xl tracking-wide text-center">{loadingText}</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showRoastWarning && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-[var(--color-surface)] border border-red-500/30 w-full max-w-md rounded-[32px] p-8 shadow-[0_0_50px_rgba(239,68,68,0.15)] text-center relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
                  😈🔥
                </div>
                <h3 className="text-2xl font-serif font-medium text-white mb-4">Roast Mode Warning</h3>
                <p className="text-[var(--color-ink-light)] mb-8 leading-relaxed">
                  Roast mode contains sarcastic, brutal, and rhetorical interpretations of your palm. It is meant for entertainment and might be offensive. Continue at your own risk.
                </p>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      setShowRoastWarning(false);
                      processReading();
                    }}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium transition-all"
                  >
                    Yes, I'm sure. Roast me!
                  </button>
                  <button 
                    onClick={() => {
                      setShowRoastWarning(false);
                      setIsRoastMode(false);
                    }}
                    className="w-full py-4 rounded-xl border border-white/10 hover:bg-white/5 text-white transition-colors"
                  >
                    No, turn off roast mode
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
