import {apiRequest} from './gemini-utils';
export interface CreditBalance {credits:number; coupleCredits:number; pendingOrderId?:string}
export async function requireReadingCredit(kind:'individual'|'couple', onPricing:()=>void) {
  const balance:CreditBalance = await apiRequest('/api/credits');
  window.dispatchEvent(new Event('credits-changed'));
  if ((kind==='couple' ? balance.coupleCredits : balance.credits) > 0) return true;
  onPricing();
  return false;
}
