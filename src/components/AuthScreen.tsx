import React, { useState } from 'react';
import { signInWithGoogle, auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Hand, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthScreenProps {
  onBack?: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onBack }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain') {
        setError(`Domain not authorized. Please add "hasta.sadhanaboard.com" to Firebase Console -> Authentication -> Settings -> Authorized domains.`);
      } else {
        setError(err.message || 'Google Authentication failed. Please check browser settings (e.g. pop-up blockers) and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[var(--color-paper)] relative overflow-hidden">
      
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 text-[var(--color-ink-light)] hover:text-white transition-colors p-2 z-50 flex items-center gap-2 text-sm font-medium tracking-wide"
        >
          <ArrowLeft size={18} />
          Back
        </button>
      )}

      {/* Animated Canvas Background (CSS simulated particles for now) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[var(--color-brand)]/10 blur-[120px] mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[var(--color-brand-light)]/10 blur-[120px] mix-blend-screen"></div>
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] rounded-full border border-[var(--color-brand)]/5 blur-[2px] opacity-10"></div>
        
        {/* Star particles */}
        {[...Array(20)].map((_, i) => (
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-md w-full bg-[#0F1020]/40 backdrop-blur-xl p-10 rounded-[32px] shadow-[0px_0px_50px_rgba(124,92,255,0.1)] border border-[var(--color-brand)]/20 text-center relative z-10 overflow-hidden group flex flex-col gap-6"
      >
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[var(--color-brand)]/0 to-[var(--color-brand)]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="mx-auto w-24 h-24 rounded-full border border-[var(--color-brand)]/30 flex items-center justify-center relative"
        >
          <div className="absolute inset-0 rounded-full border border-[var(--color-brand-light)]/20 scale-110"></div>
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          >
            <Hand size={40} className="text-[var(--color-brand-light)] drop-shadow-[0_0_15px_rgba(0,212,255,0.8)]" strokeWidth={1} />
          </motion.div>
        </motion.div>
        
        <div>
          <h1 className="text-4xl font-semibold mb-3 text-white tracking-tight font-serif drop-shadow-md">Vedic Palmistry</h1>
          <p className="text-[var(--color-ink-light)] font-sans text-sm tracking-wide leading-relaxed">
            {isSignUp ? 
              "Create an account to gain cosmic insights and save your detailed readings." :
              "Sign in to access your cosmic profile, decode your palm lines, and save your personalized readings permanently."
            }
          </p>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleGoogleAuth}
          disabled={loading}
          className="w-full relative overflow-hidden bg-white text-gray-900 py-3.5 px-6 rounded-2xl font-medium tracking-wide transition-all shadow-lg flex justify-center items-center gap-3 border border-transparent hover:border-gray-200 hover:shadow-white/10 disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="text-base font-semibold">Connect with Google</span>
        </motion.button>

        <div className="relative flex items-center justify-center my-2">
          <div className="absolute border-t border-white/10 w-full"></div>
          <span className="bg-[#0F1020] px-3 text-xs text-[var(--color-ink-light)] relative z-10 w-auto uppercase tracking-widest">Or</span>
        </div>

        <form onSubmit={handleEmailAuth} className="flex flex-col gap-3">
          <input 
            type="email" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-black/20 border border-white/10 text-white placeholder-white/30 px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-brand)]/50 transition-colors"
            placeholder="Email Address"
            required
          />
          <input 
            type="password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-black/20 border border-white/10 text-white placeholder-white/30 px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-brand)]/50 transition-colors"
            placeholder="Password"
            required
            minLength={6}
          />
          {isSignUp && (
            <input 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl bg-black/20 border border-white/10 text-white placeholder-white/30 px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-brand)]/50 transition-colors"
              placeholder="Confirm Password"
              required
              minLength={6}
            />
          )}
          {error && <p className="text-red-400 text-xs mt-1 text-left">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 rounded-xl border border-white/20 text-white hover:bg-white hover:text-black transition-colors text-sm font-medium disabled:opacity-50 mt-2"
          >
            {loading ? (isSignUp ? 'Signing up...' : 'Logging in...') : (isSignUp ? 'Create Account' : 'Login')}
          </button>
        </form>

        <div className="mt-2">
          <button 
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-sm text-[var(--color-ink-light)] hover:text-white transition-colors"
          >
            {isSignUp ? 
              "Already have an account? Log in." : 
              "Don't have an account? Sign up."
            }
          </button>
        </div>

      </motion.div>
    </div>
  );
};


