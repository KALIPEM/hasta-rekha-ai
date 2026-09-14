import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { signOut } from '../lib/firebase';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-error';
import { Reading } from '../types';
import { LogOut, Plus, Hand, BookOpen, Sparkles, MoreVertical, Edit2, Trash2, Check, X, AlertTriangle } from 'lucide-react';
import { Scanner } from './Scanner';
import { ReadingView } from './ReadingView';
import { PricingModal } from './PricingModal';
import { doc, updateDoc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [view, setView] = useState<'list' | 'scanner' | 'reading'>('list');
  const [selectedReading, setSelectedReading] = useState<Reading | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [showPricing, setShowPricing] = useState(false);

  const [editingReadingId, setEditingReadingId] = useState<string | null>(null);
  const [editTitleValue, setEditTitleValue] = useState<string>('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [readingToDelete, setReadingToDelete] = useState<Reading | null>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setMenuOpenId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const verifySessionAndCredits = async () => {
      let currentCredits = 0;
      
      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          currentCredits = userDoc.data().credits || 0;
        } else {
          // Initialize user document so it shows up in Firebase Console
          try {
            await setDoc(userDocRef, { credits: 0.5 });
            currentCredits = 0.5;
          } catch (initErr) {
            console.error("Failed to initialize user document", initErr);
          }
        }
      } catch (error: any) {
        console.error("Error reading user doc", error);
        if (error?.message?.includes('offline') || (error as any)?.code === 'unavailable') {
          window.dispatchEvent(new CustomEvent('app-offline-error'));
        }
      }
      
      setCredits(currentCredits);
    };

    verifySessionAndCredits();

    // Listen to user doc changes for future credit updates
    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            setCredits(docSnap.data().credits || 0);
        } else {
            setCredits(0.5);
        }
    }, (error: any) => {
       console.error("Error listening to user doc", error);
       if (error?.message?.includes('offline') || (error as any)?.code === 'unavailable') {
         window.dispatchEvent(new CustomEvent('app-offline-error'));
       }
    });

    const readingsRef = collection(db, 'users', user.uid, 'readings');
    const q = query(readingsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribeReadings = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const d = doc.data();
          return { 
            id: doc.id, 
            ...d,
            createdAt: d.createdAt?.toMillis ? d.createdAt.toMillis() : d.createdAt
          } as Reading;
        });
        setReadings(data);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/readings`);
        setLoading(false);
      }
    );
    
    return () => {
      unsubscribeReadings();
      unsubscribeUser();
    };
  }, [user]);

  const handleFinishScan = (reading: Reading) => {
    setSelectedReading(reading);
    setView('reading');
  };

  const getPreviewText = (text: string) => {
    const withoutHeaders = text.replace(/#/g, '').trim();
    return withoutHeaders.replace(/\n\n/g, ' ').substring(0, 150) + '...';
  };

  const handleEditClick = (e: React.MouseEvent, reading: Reading) => {
    e.stopPropagation();
    setEditingReadingId(reading.id);
    setEditTitleValue(reading.title || '');
    setMenuOpenId(null);
  };

  const handleSaveTitle = async (e: React.MouseEvent, reading: Reading) => {
    e.stopPropagation();
    if (!user) return;
    try {
      if (editTitleValue.trim() !== '' && editTitleValue.trim() !== reading.title) {
        const readingRef = doc(db, 'users', user.uid, 'readings', reading.id);
        await updateDoc(readingRef, { title: editTitleValue.trim() });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/readings/${reading.id}`);
    }
    setEditingReadingId(null);
  };

  const handleDeleteClick = (e: React.MouseEvent, reading: Reading) => {
    e.stopPropagation();
    setMenuOpenId(null);
    setReadingToDelete(reading);
  };

  const confirmDelete = async () => {
    if (!user || !readingToDelete) return;
    try {
      const readingRef = doc(db, 'users', user.uid, 'readings', readingToDelete.id!);
      await deleteDoc(readingRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/readings/${readingToDelete.id}`);
    }
    setReadingToDelete(null);
  };

  const toggleMenu = (e: React.MouseEvent, readingId: string) => {
    e.stopPropagation();
    setMenuOpenId(menuOpenId === readingId ? null : readingId);
  };

  return (
    <div className="min-h-screen bg-[var(--color-paper)] relative">
      <header className="bg-[var(--color-surface)]/80 backdrop-blur-md border-b border-[var(--color-brand)]/20 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('list')}>
            <Hand className="text-[var(--color-brand)]" size={24} />
            <span className="font-serif font-semibold text-xl text-[var(--color-brand)]">Vedic Palmistry</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-[var(--color-surface)] border border-[var(--color-brand)]/20 rounded-full p-1 shadow-sm">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[var(--color-brand)]/10 rounded-full">
                <Sparkles size={14} className="text-[var(--color-brand)]" />
                <span className="text-[var(--color-brand-light)] font-medium text-sm">
                  {credits !== null ? credits : '...'} <span className="hidden sm:inline">Readings</span>
                </span>
              </div>
              <button 
                onClick={() => setShowPricing(true)}
                className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink)] hover:text-[var(--color-brand-light)] transition-colors"
                id="header-topup-btn"
              >
                Top Up
              </button>
            </div>
            {view === 'list' && (
              <button
                onClick={() => {
                  if (credits !== null && credits > 0) {
                    setView('scanner');
                  } else {
                    setShowPricing(true);
                  }
                }}
                className="hidden sm:flex items-center gap-2 bg-[var(--color-brand)] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[var(--color-brand-light)] transition-colors"
                id="header-new-reading-btn"
              >
                <Plus size={16} /> New Reading
              </button>
            )}
            <button 
              onClick={signOut}
              className="hidden sm:block text-[var(--color-ink-light)] hover:text-red-500 transition-colors p-2"
              title="Sign Out"
              id="header-signout-btn"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {view === 'scanner' && (
          <Scanner onCancel={() => setView('list')} onScanComplete={handleFinishScan} />
        )}

        {view === 'reading' && selectedReading && (
          <ReadingView 
            reading={selectedReading} 
            onBack={() => setView('list')}
            onUpdateTitle={(newTitle) => setSelectedReading({ ...selectedReading, title: newTitle })}
          />
        )}

        {view === 'list' && (
          <div className="animate-in fade-in duration-500">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h1 className="text-3xl font-serif font-semibold text-[var(--color-ink)] mb-2">Your Spiritual Path</h1>
                <p className="text-[var(--color-ink-light)]">Revisit your past deciphered secrets of Samudrik Shastra.</p>
              </div>
              <button
                onClick={() => {
                  if (credits !== null && credits > 0) {
                    setView('scanner');
                  } else {
                    setShowPricing(true);
                  }
                }}
                className="sm:hidden bg-[var(--color-brand)] text-white p-3 rounded-full shadow-lg hover:bg-[var(--color-brand-light)] transition-colors"
                id="mobile-new-reading-btn"
              >
                <Plus size={24} />
              </button>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {[1, 2, 3].map(i => (
                   <div key={i} className="h-48 rounded-[24px] bg-[var(--color-surface)] animate-pulse border border-[var(--color-brand)]/10"></div>
                 ))}
              </div>
            ) : readings.length === 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="text-center py-16 px-6 bg-[var(--color-surface)]/50 rounded-[32px] border border-[var(--color-brand)]/10 flex flex-col justify-center h-full">
                  <BookOpen size={40} className="mx-auto text-[var(--color-brand)]/40 mb-4" />
                  <h3 className="text-xl font-serif text-[var(--color-ink)] mb-3">No readings yet</h3>
                  <p className="text-[var(--color-ink-light)] mb-8 max-w-xs mx-auto">
                    Begin your journey by uploading a clear photo of your palm. The ancient wisdom awaits.
                  </p>
                  <button
                    onClick={() => {
                      if (credits !== null && credits > 0) {
                        setView('scanner');
                      } else {
                        setShowPricing(true);
                      }
                    }}
                    className="bg-[var(--color-brand)] hover:bg-[var(--color-brand-light)] text-white py-3 px-8 rounded-full font-medium transition-all shadow-md mx-auto"
                    id="empty-state-new-reading-btn"
                  >
                    Start Reading
                  </button>
                </div>

                <div className="bg-[var(--color-brand)]/5 rounded-[32px] p-8 border border-[var(--color-brand)]/10 h-full">
                  <h3 className="text-xl font-serif font-semibold text-[var(--color-brand)] mb-3">About Samudrik Shastra</h3>
                  <p className="text-[var(--color-ink-light)] text-sm mb-4 leading-relaxed">
                    Originating millennia ago in ancient India, Samudrik Shastra is the profound Vedic science of body features, analyzing the aura and physical traits to divine human destiny. Palmistry (Hast Samudrikam) is its most renowned branch.
                  </p>
                  <p className="text-[var(--color-ink-light)] text-sm leading-relaxed">
                    Sages believed that the lines of the hands represent cosmic energies—reflecting past karmas and illuminating potential futures. A clear mind and a clear image will yield the deepest insights.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-8">
                {/* Information Section */}
                <div className="bg-[var(--color-brand)]/5 rounded-[24px] p-6 border border-[var(--color-brand)]/10">
                  <h3 className="text-lg font-serif font-semibold text-[var(--color-brand)] mb-2">Samudrik Shastra</h3>
                  <p className="text-[var(--color-ink-light)] text-sm leading-relaxed">
                    The hand acts as a mirror to the soul. In Vedic tradition, the left hand reflects your accumulated karma from past lives, while your right hand illustrates the actions of your present incarnation. Look to both for a complete picture.
                  </p>
                </div>

                <div className="flex items-center">
                  <h2 className="text-2xl font-serif text-[var(--color-ink)] mr-4">Your Readings</h2>
                  <div className="h-px bg-gradient-to-r from-[var(--color-brand)]/30 to-transparent flex-1"></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {readings.map((reading) => (
                  <div 
                    key={reading.id}
                    onClick={() => {
                      if (editingReadingId === reading.id) return;
                      setSelectedReading(reading);
                      setView('reading');
                    }}
                    className="relative bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] rounded-[24px] p-6 shadow-sm hover:shadow-md hover:shadow-[var(--color-brand)]/10 transition-all cursor-pointer border border-[var(--color-brand)]/10 flex flex-col h-[200px]"
                    id={`reading-card-${reading.id}`}
                  >
                    <div className="text-xs font-medium uppercase tracking-wider text-[var(--color-brand)]/70 mb-3 flex items-start gap-2 justify-between">
                      {editingReadingId === reading.id ? (
                        <div className="flex-1 flex items-center bg-white border border-[var(--color-brand)]/30 rounded px-2 py-1 mr-2 relative z-10" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editTitleValue}
                            onChange={(e) => setEditTitleValue(e.target.value)}
                            className="bg-transparent border-none outline-none w-full text-[var(--color-brand-light)] font-bold font-sans"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveTitle(e as any, reading);
                              if (e.key === 'Escape') setEditingReadingId(null);
                            }}
                          />
                          <button onClick={(e) => handleSaveTitle(e, reading)} className="text-[var(--color-brand)] hover:opacity-70 p-1">
                            <Check size={14} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setEditingReadingId(null); }} className="text-gray-400 hover:opacity-70 p-1">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="truncate flex-1 font-bold text-[var(--color-brand-light)] mt-1">{reading.title || "Spiritual Reading"}</span>
                      )}
                      
                      <div className="flex items-start gap-2 shrink-0">
                        <span className="mt-1">{new Date(reading.createdAt || Date.now()).toLocaleDateString(undefined, { 
                          year: 'numeric', month: 'short', day: 'numeric' 
                        })}</span>
                        
                        <div className="relative">
                          <button 
                            onClick={(e) => toggleMenu(e, reading.id)}
                            className="p-1 hover:bg-[var(--color-brand)]/10 rounded-full transition-colors text-[var(--color-brand)]/70 hover:text-[var(--color-brand)]"
                          >
                            <MoreVertical size={16} />
                          </button>
                          
                          {menuOpenId === reading.id && (
                            <div className="absolute right-0 top-full mt-1 w-36 bg-[var(--color-surface)] rounded-xl shadow-lg border border-white/10 py-1 z-20 popup-menu" onClick={e => e.stopPropagation()}>
                              <button 
                                onClick={(e) => handleEditClick(e, reading)}
                                className="w-full text-left px-4 py-2 text-sm text-[var(--color-ink)] hover:bg-white/5 flex items-center gap-2 transition-colors"
                              >
                                <Edit2 size={14} /> Edit Name
                              </button>
                              <button 
                                onClick={(e) => handleDeleteClick(e, reading)}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="font-serif text-[var(--color-ink)] text-lg line-clamp-4 leading-relaxed opacity-90 break-words mb-auto">
                      {getPreviewText(reading.readingText)}
                    </div>
                    <div className="text-[var(--color-brand)] text-sm font-medium mt-4 flex items-center gap-1 group-hover:gap-2 transition-all">
                      Read full insight &rarr;
                    </div>
                  </div>
                ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {showPricing && user && (
        <PricingModal 
          onClose={() => setShowPricing(false)} 
          userId={user.uid} 
          onSuccess={async (plan) => {
             let creditsToAdd = 0;
             if (plan === 'mystic') creditsToAdd = 5;
             if (plan === 'deepdive') creditsToAdd = 1;

             if (creditsToAdd > 0) {
                try {
                  const userDocRef = doc(db, 'users', user.uid);
                  const userDoc = await getDoc(userDocRef);
                  const currentCredits = userDoc.exists() ? Number(userDoc.data().credits || 0) : 0.5;
                  const newCredits = currentCredits + creditsToAdd;
                  
                  if (userDoc.exists()) {
                     await updateDoc(userDocRef, { credits: newCredits });
                  } else {
                     await setDoc(userDocRef, { credits: newCredits });
                  }
                  // Local state is updated by onSnapshot listener automatically
                } catch (firestoreError) {
                  handleFirestoreError(firestoreError, OperationType.WRITE, `users/${user.uid}`);
                }
             }
          }}
        />
      )}

      {readingToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--color-surface)] border border-white/10 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-serif text-white mb-2">Delete Reading?</h3>
              <p className="text-white/60 mb-8 max-w-[280px]">
                Are you sure you want to delete this reading? This action is permanent and cannot be undone.
              </p>
              
              <div className="w-full flex gap-3">
                <button
                  onClick={() => setReadingToDelete(null)}
                  className="flex-1 py-3 px-4 rounded-xl border border-white/10 text-white/80 hover:bg-white/5 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-500/90 hover:bg-red-500 text-white transition-colors font-medium text-sm shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
