import {useEffect,useState} from 'react';
import {useAuth} from './AuthContext';
import {apiRequest} from '../lib/gemini-utils';
import type {CreditBalance} from '../lib/credits';
export function CreditBalanceBar({onPricing}:{onPricing:()=>void}) {
  const {user}=useAuth();
  const [balance,setBalance]=useState<CreditBalance|null>(null);
  const [error,setError]=useState(false),[version,setVersion]=useState(0);
  useEffect(()=>{
    const refresh=()=>setVersion(v=>v+1);
    window.addEventListener('credits-changed',refresh);
    window.addEventListener('focus',refresh);
    return()=>{window.removeEventListener('credits-changed',refresh);window.removeEventListener('focus',refresh);};
  },[]);
  useEffect(()=>{
    let active=true;setError(false);setBalance(null);
    if(user) void apiRequest('/api/credits').then(data=>{if(active)setBalance(data);}).catch(()=>{if(active)setError(true);});
    return()=>{active=false;};
  },[user?.id,version]);
  if(!user)return null;
  return <aside className="credits-bar section-width" aria-label="Reading credits">
    <div aria-live="polite"><strong>Your credits</strong><span>{error?'Balance unavailable':balance?`${balance.credits} individual · ${balance.coupleCredits} couple`:'Loading balance…'}</span>{balance&&balance.credits===0&&balance.coupleCredits===0&&<small>Purchase a pack before generating a reading.</small>}</div>
    <div><button className="button button-outline" onClick={onPricing}>{balance?.pendingOrderId?'Credits & check payment':'Buy credits & purchases'}</button><button className="text-button" onClick={()=>setVersion(v=>v+1)}>Refresh balance</button></div>
  </aside>;
}
