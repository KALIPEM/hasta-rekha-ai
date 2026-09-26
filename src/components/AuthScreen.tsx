import { useEffect, useState } from 'react';
import { ArrowRight, Hand } from 'lucide-react';
import { supabase } from '../lib/supabase-client';
import { useAuth } from './AuthContext';
import { Modal } from './Modal';
export function AuthScreen({onBack}: {onBack: () => void}) {
  const {user} = useAuth();
  const [signup, setSignup] = useState(false), [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  useEffect(() => {if (user) onBack();}, [user, onBack]);
  async function submit() {
    if (!supabase) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = signup ? await supabase.auth.signUp({email, password, options: {emailRedirectTo: window.location.origin}}) : await supabase.auth.signInWithPassword({email, password});
      if (result.error) throw result.error;
      if (signup && !result.data.session) setNotice('Check your email to confirm your account, then return here to sign in.');
    } catch (e: any) {setError(e.message || 'We could not sign you in. Please try again.');}
    finally {setBusy(false);}
  }
  async function continueWithGoogle() {
    if (!supabase || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const {error: oauthError} = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {redirectTo: window.location.origin},
      });
      if (oauthError) throw oauthError;
    } catch (e: any) {
      setBusy(false);
      const message = String(e?.message || '');
      setError(/provider|not enabled|unsupported/i.test(message)
        ? 'Google sign-in is not enabled for this Supabase project yet.'
        : message || 'We could not start Google sign-in. Please try again.');
    }
  }
  return <Modal title="Sign in to Hasta Rekha" onClose={onBack}><span className="modal-emblem"><Hand size={30} strokeWidth={1.3}/></span><div className="eyebrow">YOUR OWN LITTLE LIBRARY</div><h2>{signup ? 'Begin your story.' : 'Welcome back.'}</h2><p className="muted">Sign in to keep your readings together across devices.</p>
    {!supabase ? <><div className="notice">Account sign-in is temporarily unavailable. Please try again later.</div><button className="button button-brand full-width" onClick={onBack}>Continue exploring <ArrowRight size={16}/></button></> : <>
      <button type="button" disabled={busy} className="button google-button full-width" onClick={() => void continueWithGoogle()}><span className="google-mark" aria-hidden="true">G</span>{busy ? 'Opening Google…' : 'Continue with Google'}</button><div className="form-divider" aria-hidden="true"><span>or use email</span></div>
      <form onSubmit={e => {e.preventDefault(); submit();}}><label className="field">Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}/></label><label className="field">Password<input type="password" autoComplete={signup ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={e => setPassword(e.target.value)}/></label>{error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}<button disabled={busy} className="button button-brand full-width">{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}<ArrowRight size={16}/></button></form>
      <button className="text-button auth-toggle" onClick={() => {setSignup(!signup); setError(''); setNotice('');}}>{signup ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
    </>}
  </Modal>;
}
