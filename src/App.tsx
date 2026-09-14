/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { LandingPage } from './components/LandingPage';
import { OfflineNotice } from './components/OfflineNotice';

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const AppContent = () => {
  const { user, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-paper)]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-[var(--color-brand)]/20 mb-4"></div>
          <p className="text-[var(--color-brand)] font-serif italic text-lg">Consulting the stars...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showLogin) {
      return <AuthScreen onBack={() => setShowLogin(false)} />;
    }
    return <LandingPage onLoginClick={() => setShowLogin(true)} />;
  }

  return <Dashboard />;
};

export default function App() {
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [customKey, setCustomKey] = useState('');

  React.useEffect(() => {
    async function checkKey() {
      if (process.env.GEMINI_API_KEY2) {
        setHasKey(true);
        return;
      }
      const storedKey = localStorage.getItem('EXTERNAL_GEMINI_API_KEY');
      if (storedKey) {
        setHasKey(true);
        return;
      }
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    }
    checkKey();
  }, []);

  if (!hasKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-paper)] p-4">
         <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center max-w-md text-center w-full">
            <h2 className="text-2xl font-serif text-gray-900 mb-4">API Key Required</h2>
            <p className="text-gray-600 mb-6">To use this app, please provide a Gemini API key.</p>
            
            <input 
              type="password"
              placeholder="Paste Gemini API Key here"
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg mb-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]"
            />
            
            <button 
              onClick={() => {
                if (customKey.trim()) {
                  localStorage.setItem('EXTERNAL_GEMINI_API_KEY', customKey.trim());
                  setHasKey(true);
                  window.location.reload();
                }
              }}
              className="bg-[var(--color-brand)] text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity w-full mb-4"
            >
              Save API Key
            </button>

            {window.aistudio && (
              <>
                <div className="text-sm text-gray-400 mb-4">OR</div>
                <button 
                  onClick={async () => {
                    await window.aistudio?.openSelectKey();
                    setHasKey(true);
                  }}
                  className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-medium hover:bg-gray-200 transition-colors w-full"
                >
                  Link GCP Project via AI Studio
                </button>
              </>
            )}
         </div>
      </div>
    );
  }

  return (
    <>
      <OfflineNotice />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </>
  );
}
