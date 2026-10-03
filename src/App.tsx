import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Hand, Heart, Menu, Sparkles, X, LogOut, UserCircle, Plus } from 'lucide-react';
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
import { initAnalytics, trackPageView } from './lib/analytics';
import type { Reading } from './types';
export interface ServiceStatus { aiConfigured: boolean; billingConfigured: boolean }
function AppContent() {
  const { user } = useAuth();
  const [route, setRoute] = useState<'landing' | 'app'>(() => window.location.pathname.startsWith('/app') ? 'app' : 'landing');
  const [view, setView] = useState<'home' | 'history' | 'mode' | 'scan' | 'reading'>(() => window.location.pathname.startsWith('/app') ? 'history' : 'home');
  const [reading, setReading] = useState<Reading>(sampleReading);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingView, setPendingView] = useState<'mode' | 'scan' | 'history' | 'reading' | null>(null);
  const [readingKind, setReadingKind] = useState<'individual' | 'couple'>('individual');
  const [pricingOpen, setPricingOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [roast, setRoast] = useState(false);
  const [status, setStatus] = useState<ServiceStatus>({ aiConfigured: false, billingConfigured: false });
  const initialPageViewSent = useRef(false);
  useEffect(() => { initAnalytics(import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-S150VF0HRN'); }, []);
  useEffect(() => { apiRequest('/api/config').then(setStatus).catch(() => {}); }, []);
  useEffect(() => { const onPopState = () => { const nextRoute = window.location.pathname.startsWith('/app') ? 'app' : 'landing'; setRoute(nextRoute); setView(nextRoute === 'app' ? 'history' : 'home'); }; window.addEventListener('popstate', onPopState); return () => window.removeEventListener('popstate', onPopState); }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); setMenuOpen(false); }, [route, view]);
  useEffect(() => { if (initialPageViewSent.current) trackPageView(route === 'landing' ? '/' : `/app#${view}`); else initialPageViewSent.current = true; }, [route, view]);
  useEffect(() => { if (user && pendingView) { setView(pendingView); setPendingView(null); setAuthOpen(false); } }, [user, pendingView]);
  useEffect(() => { if (!user && route === 'app' && (view === 'mode' || view === 'scan' || view === 'history' || view === 'reading' && !reading.isSample)) { setView('history'); setReading(sampleReading); } }, [user, route, view, reading.isSample]);
  function navigate(path: '/' | '/app', nextView: 'home' | 'history' | 'mode' | 'scan' | 'reading' = path === '/app' ? 'history' : 'home') { if (window.location.pathname !== path) window.history.pushState({}, '', path); setRoute(path === '/app' ? 'app' : 'landing'); setView(nextView); setMenuOpen(false); }
  function start(roastMode = false) { setRoast(roastMode); navigate('/app', 'mode'); if (!user) { setPendingView('mode'); setAuthOpen(true); } }
  function history() { navigate('/app', 'history'); if (!user) { setPendingView('history'); setAuthOpen(true); } }
  function openReading(r: Reading) { if (!r.isSample) window.dispatchEvent(new Event('credits-changed')); navigate('/app', 'reading'); setReading(r); }
  function showSample() { navigate('/app', 'reading'); setReading(sampleReading); if (!user) { setPendingView('reading'); setAuthOpen(true); } }
  function learn() { navigate('/'); requestAnimationFrame(() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })); }
  function openPricing() { setPricingOpen(true); }
  function closeAuth() { setAuthOpen(false); if (!user) { setPendingView(null); navigate('/'); } }
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    {!authOpen && route === 'landing' && <header className="site-header">
      <div className="header-inner">
        <button className="wordmark" onClick={() => navigate('/')} aria-label="Hasta Rekha home"><span className="brand-symbol"><Hand size={25} strokeWidth={1.3}/><Sparkles size={10}/></span><span>Hasta Rekha<span className="brand-subtitle">THE WISDOM WITHIN</span></span></button>
        <nav className={menuOpen ? 'nav-links is-open' : 'nav-links'} aria-label="Main navigation">
          <button className={route === 'landing' ? 'active' : ''} onClick={() => navigate('/')}>Discover</button>
          <button onClick={learn}>How it works</button><button onClick={openPricing}>Pricing</button>
        </nav>
        <div className="header-actions">
          {user ? <button className="text-button sign-in" onClick={() => supabase?.auth.signOut()} aria-label="Sign out"><LogOut size={16}/><span>Sign out</span></button> : <button className="text-button sign-in" onClick={() => setAuthOpen(true)}>Sign in</button>}
          <button className="button button-dark header-cta" onClick={() => start()}>Read my palm <ArrowRight size={15}/></button>
          <button className="icon-button mobile-menu" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X/> : <Menu/>}</button>
        </div>
      </div>
    </header>}
    {!authOpen && route === 'app' && <PortalHeader onPricing={() => setPricingOpen(true)} onSignOut={() => supabase?.auth.signOut()} />}
    <main id="main">
      {authOpen ? <AuthScreen fullPage onBack={closeAuth}/> : <>
      {route === 'landing' && <LandingPage onStart={start} onSample={showSample} onPricing={openPricing}/>} 
      {route === 'app' && <>
        {!user && <section className="app-gate section-width"><div className="eyebrow">YOUR READING WORKSPACE</div><h1>Sign in to see your readings.</h1><p>Your saved reports, new palm readings, credits, and follow-up questions all live here.</p><button className="button button-brand" onClick={() => setAuthOpen(true)}>Sign in to continue <ArrowRight size={16}/></button></section>}
        {view === 'history' && user && <Dashboard onStart={() => start()} onOpen={openReading} onSample={showSample}/>} 
        {view === 'mode' && user && <ReadingModePage onBack={() => navigate('/')} onSelect={kind => { setReadingKind(kind); setView('scan'); }}/>} 
        {view === 'scan' && user && <Scanner key={String(roast)} readingKind={readingKind} onCancel={() => navigate('/')} onScanComplete={openReading} initialRoast={roast} status={status} onSample={showSample} onPricing={openPricing}/>} 
        {view === 'reading' && <ReadingView key={reading.id} reading={reading} onBack={() => navigate('/')} onStart={() => start()} onPricing={openPricing} onUpdateTitle={title => setReading({ ...reading, title })}/>} 
      </>}
      </>}
    </main>
    {route === 'landing' && !authOpen && <footer className="site-footer"><div className="footer-inner"><button className="footer-brand" onClick={() => navigate('/')}>Hasta Rekha <span>✧</span></button><p>A moment of curiosity. A little more self-discovery.</p><span className="footer-note">For reflection & entertainment.</span></div></footer>}
    {pricingOpen && <PricingModal key={user?.id || "guest"} onClose={() => setPricingOpen(false)} status={status} onSignIn={() => { setPricingOpen(false); setAuthOpen(true); }} onStart={() => { setPricingOpen(false); if(view!=='scan') start(); }}/>} 
  </div>;
}
function PortalHeader({onPricing, onSignOut}: {onPricing: () => void; onSignOut: () => void}) {
  const {user} = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  return <header className="portal-header">
    <div className="portal-header-inner">
      <div className="portal-brand"><span className="portal-brand-mark"><Hand size={20} strokeWidth={1.4}/></span><span><strong>Hasta Rekha</strong><small>MY READINGS</small></span></div>
      <div className="portal-actions">
        <CreditBalanceBar onPricing={onPricing} compact />
        <button className="portal-add-credits" onClick={onPricing} aria-label="Buy more credits" title="Buy more credits"><Plus size={19}/></button>
        <div className="portal-profile-wrap"><button className="portal-profile" onClick={() => setProfileOpen(open => !open)} aria-label="Open profile menu" aria-expanded={profileOpen}><UserCircle size={27}/></button>{profileOpen && <div className="portal-profile-menu"><span>{user?.email || 'Your account'}</span><button onClick={onSignOut}><LogOut size={15}/> Sign out</button></div>}</div>
      </div>
    </div>
  </header>;
}
function ReadingModePage({onBack, onSelect}: {onBack: () => void; onSelect: (kind: 'individual' | 'couple') => void}) {
  return <section className="reading-mode-page section-width">
    <button className="back-link" onClick={onBack}>← Back to Hasta Rekha</button>
    <div className="eyebrow">NEW READING</div><h1>What would you like to read?</h1><p>Choose one option to continue.</p>
    <div className="reading-mode-page-grid">
      <button className="reading-mode-page-card" onClick={() => onSelect('individual')}><span className="reading-mode-icon"><Hand size={24}/></span><span><strong>Individual reading</strong><small>Read one person’s palm · ₹20 · 3 follow-up questions</small></span><ArrowRight size={19}/></button>
      <button className="reading-mode-page-card" onClick={() => onSelect('couple')}><span className="reading-mode-icon"><Heart size={23}/></span><span><strong>Match checking</strong><small>Compare two palms · ₹30 · 3 follow-up questions</small></span><ArrowRight size={19}/></button>
    </div>
  </section>;
}
export default function App() { return <AuthProvider><AppContent/></AuthProvider>; }
