import React, { useState, useEffect } from 'react';

export const OfflineNotice = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  
  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    
    // Also listen to the custom event from Firestore errors
    const handleCustomOffline = () => {
      setIsOffline(true);
      // Optional: automatically dismiss after 5s or check navigator.onLine after delay
      setTimeout(() => {
        if (navigator.onLine) setIsOffline(false);
      }, 5000);
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    window.addEventListener('app-offline-error', handleCustomOffline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('app-offline-error', handleCustomOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-10 fade-in duration-300">
      <div className="bg-red-500/90 text-white px-6 py-3 rounded-full flex items-center gap-3 shadow-2xl backdrop-blur-sm border border-red-400">
        <svg fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span className="font-medium tracking-wide">Check your internet connection</span>
      </div>
    </div>
  );
};
