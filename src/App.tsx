import { useEffect, useState } from 'react';
import { ArrowRight, Hand, Menu, Sparkles, X, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { Scanner } from './components/Scanner';
import { ReadingView } from './components/ReadingView';
import { AuthScreen } from './components/AuthScreen';
import { PricingModal } from './components/PricingModal';
import { sampleReading } from './lib/sample-reading';
import { apiRequest } from './lib/gemini-utils';
import { supabase } from './lib/supabase-client';
import type { Reading } from './types';
export interface ServiceStatus { aiConfigured: boolean; billingConfigured: boolean }
function AppContent() {
  const { user } = useAuth();
  const [view, setView] = useState<'home' | 'history' | 'scan' | 'reading'>('home');
  const [reading, setReading] = useState<Reading>(sampleReading);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingView, setPendingView] = useState<'scan' | 'history' | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [roast, setRoast] = useState(false);
  const [status, setStatus] = useState<ServiceStatus>({ aiConfigured: false, billingConfigured: false });
  useEffect(() => { apiRequest('/api/config').then(setStatus).catch(() => {}); }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); setMenuOpen(false); }, [view]);
  useEffect(() => { if (user && pendingView) { setView(pendingView); setPendingView(null); setAuthOpen(false); } }, [user, pendingView]);
  useEffect(() => { if (!user && (view === 'scan' || view === 'history' || view === 'reading' && !reading.isSample)) { setView('home'); setReading(sampleReading); } }, [user, view, reading.isSample]);
  function start(roastMode = false) { setRoast(roastMode); if (!user) { setPendingView('scan'); setAuthOpen(true); } else setView('scan'); }
  function history() { if (!user) { setPendingView('history'); setAuthOpen(true); } else setView('history'); }
  function openReading(r: Reading) { setReading(r); setView('reading'); }
  function learn() { setView('home'); setMenuOpen(false); requestAnimationFrame(() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })); }
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <div className="header-inner">
        <button className="wordmark" onClick={() => setView('home')} aria-label="Hasta Rekha home"><span className="brand-symbol"><Hand size={25} strokeWidth={1.3}/><Sparkles size={10}/></span><span>hasta rekha<span className="brand-subtitle">THE WISDOM WITHIN</span></span></button>
        <nav className={menuOpen ? 'nav-links is-open' : 'nav-links'} aria-label="Main navigation">
          <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>Discover</button>
          <button onClick={learn}>How it works</button><button onClick={()=>setPricingOpen(true)}>Pricing</button>
          <button className={view === 'history' ? 'active' : ''} onClick={history}>My readings</button>
        </nav>
        <div className="header-actions">
          {user ? <button className="text-button sign-in" onClick={() => supabase?.auth.signOut()} aria-label="Sign out"><LogOut size={16}/><span>Sign out</span></button> : <button className="text-button sign-in" onClick={() => setAuthOpen(true)}>Sign in</button>}
          <button className="button button-dark header-cta" onClick={() => start()}>Read my palm <ArrowRight size={15}/></button>
          <button className="icon-button mobile-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button>
        </div>
      </div>
    </header>
    <main id="main">
      {view === 'home' && <LandingPage onStart={start} onSample={() => openReading(sampleReading)} onPricing={() => setPricingOpen(true)}/>}
      {view === 'history' && user && <Dashboard onStart={() => start()} onOpen={openReading} onSample={() => openReading(sampleReading)}/>}
      {view === 'scan' && user && <Scanner key={String(roast)} onCancel={() => setView('home')} onScanComplete={openReading} initialRoast={roast} status={status} onSample={() => openReading(sampleReading)} onPricing={() => setPricingOpen(true)}/>}
      {view === 'reading' && <ReadingView key={reading.id} reading={reading} onBack={() => setView(reading.isSample ? 'home' : 'history')} onStart={() => start()} onUpdateTitle={title => setReading({ ...reading, title })}/>}
    </main>
    <footer className="site-footer"><div className="footer-inner"><button className="footer-brand" onClick={() => setView('home')}>hasta rekha <span>✧</span></button><p>A moment of curiosity. A little more self-discovery.</p><span className="footer-note">For reflection & entertainment.</span></div></footer>
    {authOpen && <AuthScreen onBack={() => { setAuthOpen(false); if (!user) setPendingView(null); }}/>}
    {pricingOpen && <PricingModal onClose={() => setPricingOpen(false)} status={status} onSignIn={() => { setPricingOpen(false); setAuthOpen(true); }} onStart={() => { setPricingOpen(false); start(); }}/>}
  </div>;
}
export default function App() { return <AuthProvider><AppContent/></AuthProvider>; }
