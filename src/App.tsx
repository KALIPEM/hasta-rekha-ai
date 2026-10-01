import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Hand, Menu, Sparkles, X, LogOut } from 'lucide-react';
import { AuthProvider, useAuth } from './components/AuthContext';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { Scanner } from './components/Scanner';
import { ReadingView } from './components/ReadingView';
import { AuthScreen } from './components/AuthScreen';
import { CreditBalanceBar } from './components/CreditBalanceBar';
import { PricingModal } from './components/PricingModal';
import { sampleReading } from './lib/sample-reading';
import { apiRequest } from './lib/gemini-utils';
import { supabase } from './lib/supabase-client';
import type { Reading } from './types';
export interface ServiceStatus { aiConfigured: boolean; billingConfigured: boolean }
function AppContent() {
  const { user } = useAuth();
  const [route, setRoute] = useState<'landing' | 'app'>(() => window.location.pathname.startsWith('/app') ? 'app' : 'landing');
  const [view, setView] = useState<'home' | 'history' | 'scan' | 'reading'>(() => window.location.pathname.startsWith('/app') ? 'history' : 'home');
  const [reading, setReading] = useState<Reading>(sampleReading);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingView, setPendingView] = useState<'scan' | 'history' | 'reading' | null>(null);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [roast, setRoast] = useState(false);
  const [status, setStatus] = useState<ServiceStatus>({ aiConfigured: false, billingConfigured: false });
  useEffect(() => { apiRequest('/api/config').then(setStatus).catch(() => {}); }, []);
  useEffect(() => { const onPopState = () => { const nextRoute = window.location.pathname.startsWith('/app') ? 'app' : 'landing'; setRoute(nextRoute); setView(nextRoute === 'app' ? 'history' : 'home'); }; window.addEventListener('popstate', onPopState); return () => window.removeEventListener('popstate', onPopState); }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); setMenuOpen(false); }, [route, view]);
  useEffect(() => { if (user && pendingView) { setView(pendingView); setPendingView(null); setAuthOpen(false); } }, [user, pendingView]);
  useEffect(() => { if (!user && route === 'app' && (view === 'scan' || view === 'history' || view === 'reading' && !reading.isSample)) { setView('history'); setReading(sampleReading); } }, [user, route, view, reading.isSample]);
  function navigate(path: '/' | '/app', nextView: 'home' | 'history' | 'scan' | 'reading' = path === '/app' ? 'history' : 'home') { if (window.location.pathname !== path) window.history.pushState({}, '', path); setRoute(path === '/app' ? 'app' : 'landing'); setView(nextView); setMenuOpen(false); }
  function start(roastMode = false) { setRoast(roastMode); navigate('/app', 'scan'); if (!user) { setPendingView('scan'); setAuthOpen(true); } }
  function history() { navigate('/app', 'history'); if (!user) { setPendingView('history'); setAuthOpen(true); } }
  function openReading(r: Reading) { if (!r.isSample) window.dispatchEvent(new Event('credits-changed')); navigate('/app', 'reading'); setReading(r); }
  function showSample() { navigate('/app', 'reading'); setReading(sampleReading); if (!user) { setPendingView('reading'); setAuthOpen(true); } }
  function learn() { navigate('/'); requestAnimationFrame(() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })); }
  function openPricing() { navigate('/app'); if (!user) setAuthOpen(true); else setPricingOpen(true); }
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header">
      <div className="header-inner">
        <button className="wordmark" onClick={() => navigate('/')} aria-label="Hasta Rekha home"><span className="brand-symbol"><Hand size={25} strokeWidth={1.3}/><Sparkles size={10}/></span><span>hasta rekha<span className="brand-subtitle">THE WISDOM WITHIN</span></span></button>
        <nav className={menuOpen ? 'nav-links is-open' : 'nav-links'} aria-label="Main navigation">
          <button className={route === 'landing' ? 'active' : ''} onClick={() => navigate('/')}>Discover</button>
          <button onClick={learn}>How it works</button><button onClick={openPricing}>Pricing</button>
          <button className={view === 'history' ? 'active' : ''} onClick={history}>My readings</button>
        </nav>
        <div className="header-actions">
          {user ? <button className="text-button sign-in" onClick={() => supabase?.auth.signOut()} aria-label="Sign out"><LogOut size={16}/><span>Sign out</span></button> : <button className="text-button sign-in" onClick={() => setAuthOpen(true)}>Sign in</button>}
          <button className="button button-dark header-cta" onClick={() => start()}>Read my palm <ArrowRight size={15}/></button>
          <button className="icon-button mobile-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button>
        </div>
      </div>
      <nav className="mobile-reading-nav" aria-label="Reading shortcuts">
        <button aria-current={view === 'scan' ? 'page' : undefined} onClick={() => start()}><Hand size={17}/> New reading</button>
        <button aria-current={view === 'history' || view === 'reading' && !reading.isSample ? 'page' : undefined} onClick={() => { setMenuOpen(false); history(); }}><BookOpen size={17}/> My readings</button>
      </nav>
    </header>
    <main id="main">
      {route === 'landing' && <LandingPage onStart={start} onSample={showSample} onPricing={openPricing}/>} 
      {route === 'app' && <>
        {user && status.billingConfigured && <CreditBalanceBar key={user.id} onPricing={() => setPricingOpen(true)}/>} 
        {!user && <section className="app-gate section-width"><div className="eyebrow">YOUR READING WORKSPACE</div><h1>Sign in to see your readings.</h1><p>Your saved reports, new palm readings, credits, and follow-up questions all live here.</p><button className="button button-brand" onClick={() => setAuthOpen(true)}>Sign in to continue <ArrowRight size={16}/></button></section>}
        {view === 'history' && user && <Dashboard onStart={() => start()} onOpen={openReading} onSample={showSample}/>} 
        {view === 'scan' && user && <Scanner key={String(roast)} onCancel={() => navigate('/app')} onScanComplete={openReading} initialRoast={roast} status={status} onSample={showSample} onPricing={openPricing}/>} 
        {view === 'reading' && <ReadingView key={reading.id} reading={reading} onBack={() => navigate('/app', reading.isSample ? 'history' : 'history')} onStart={() => start()} onPricing={openPricing} onUpdateTitle={title => setReading({ ...reading, title })}/>} 
      </>}
    </main>
    <footer className="site-footer"><div className="footer-inner"><button className="footer-brand" onClick={() => navigate('/')}>hasta rekha <span>✧</span></button><p>A moment of curiosity. A little more self-discovery.</p><span className="footer-note">For reflection & entertainment.</span></div></footer>
    {authOpen && <AuthScreen onBack={() => { setAuthOpen(false); if (!user) { setPendingView(null); navigate('/app'); } }}/>} 
    {pricingOpen && <PricingModal key={user?.id || "guest"} onClose={() => setPricingOpen(false)} status={status} onSignIn={() => { setPricingOpen(false); setAuthOpen(true); }} onStart={() => { setPricingOpen(false); if(view!=='scan') start(); }}/>}
  </div>;
}
export default function App() { return <AuthProvider><AppContent/></AuthProvider>; }
