import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase-client';
const AuthContext = createContext<{user: User | null; loading: boolean}>({user: null, loading: false});
export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null), [loading, setLoading] = useState(Boolean(supabase));
  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getSession().then(({data}) => { if (active) { setUser(data.session?.user || null); setLoading(false); } }).catch(() => { if (active) setLoading(false); });
    const {data} = supabase.auth.onAuthStateChange((_, session) => { setUser(session?.user || null); setLoading(false); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);
  return <AuthContext.Provider value={{user, loading}}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
