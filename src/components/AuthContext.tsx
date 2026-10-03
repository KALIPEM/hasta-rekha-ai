import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase-client';
import { trackAnalyticsEvent } from '../lib/analytics';
const AuthContext = createContext<{user: User | null; loading: boolean}>({user: null, loading: false});
export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null), [loading, setLoading] = useState(Boolean(supabase));
  const ready = useRef(false);
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({data}) => { if (active) { setUser(data.session?.user || null); setLoading(false); ready.current = true; } }).catch(() => { if (active) { setLoading(false); ready.current = true; } });
    const {data} = supabase.auth.onAuthStateChange((event, session) => { setUser(session?.user || null); setLoading(false); if (ready.current && event === 'SIGNED_IN') trackAnalyticsEvent('login', {method: session?.user?.app_metadata?.provider || 'email'}); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  return <AuthContext.Provider value={{user, loading}}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
