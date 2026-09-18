import {useEffect,useState} from 'react';
import {ArrowRight, Check, Sparkles} from 'lucide-react';
import {Modal} from './Modal';
import {useAuth} from './AuthContext';
import {apiRequest} from '../lib/gemini-utils';
import type {ServiceStatus} from '../App';
let checkoutScript: Promise<void> | undefined;
function loadCheckout() {
  if ((window as any).Razorpay) return Promise.resolve();
  if (!checkoutScript) checkoutScript = new Promise<void>((resolve,reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => {checkoutScript = undefined; script.remove(); reject(new Error('Checkout could not load. Check your connection and try again.'));};
    document.body.appendChild(script);
  });
  return checkoutScript;
}
interface Props {onClose:()=>void; status:ServiceStatus; onSignIn:()=>void; onStart:()=>void}
export function PricingModal({onClose,status,onSignIn,onStart}:Props) {
  const {user} = useAuth();
  const [busy,setBusy] = useState(''), [error,setError] = useState(''), [balance,setBalance] = useState<number|null>(null), [success,setSuccess] = useState(false);

  const [pending,setPending] = useState('');
  const [coupleBalance,setCoupleBalance]=useState(0);
  useEffect(() => {if(user && status.billingConfigured) apiRequest('/api/credits').then(d=>{setBalance(d.credits);setCoupleBalance(d.coupleCredits||0);setPending(d.pendingOrderId||'');}).catch(()=>setError('Your balance is unavailable. Please try again.'));},[user?.id,status.billingConfigured]);
  function completed(data:any) {setSuccess(true);void apiRequest('/api/credits').then(d=>{setBalance(d.credits);setCoupleBalance(d.coupleCredits||0);}).catch(()=>setError('Payment confirmed; refresh to see your balance.'));setBalance(data.credits);setPending('');setBusy('');setError('');}
  async function checkPayment() {
    setBusy('check');setError('');
    try {const data=await apiRequest('/api/check-payment',{orderId:pending});if(data.success)completed(data);else setError('No completed payment yet. If you paid, wait a moment and check again.');}
    catch(e:any){setError(e.message);}finally{setBusy('');}
  }
  async function checkout(plan:string) {
    if(!user){onSignIn();return;}
    setBusy(plan);setError('');
    try {
      await loadCheckout();
      const data=await apiRequest('/api/create-order',{plan});
      setPending(data.orderId);
      const popup=new (window as any).Razorpay({
        key:data.keyId,amount:data.amount,currency:data.currency,order_id:data.orderId,name:'Hasta Rekha',
        description:data.name,prefill:{email:user.email},theme:{color:'#9b5038'},
        handler:async(response:any)=>{try{completed(await apiRequest('/api/verify-payment',response));}catch(e:any){setError(e.message);setBusy('');}},
        modal:{ondismiss:()=>setBusy('')},
      });
      popup.on('payment.failed',()=>{setError('Payment did not complete. You can try again or check your payment status.');setBusy('');});
      popup.open();
    }catch(e:any){setError(e.message);setBusy('');}
  }
  return <Modal title="Reading options" onClose={()=>{if(!busy)onClose();}}><span className="modal-emblem"><Sparkles size={29}/></span><div className="eyebrow">A LITTLE MORE DISCOVERY</div><h2>{success?'Your readings await.':'Choose your next chapter.'}</h2><p className="muted">{success?'Your payment is confirmed and your credits are ready.':'One for yourself, or a little curiosity to share.'}</p>
    {success ? <button className="button button-brand full-width" onClick={onStart}>Begin a reading <ArrowRight size={16}/></button> : <>
    <div className="pricing-plans">{[{id:'deepdive',title:'Individual reading',price:20,count:'1 individual credit'},{id:'couple',title:'Couple reading',price:30,count:'1 couple credit · two partners'},{id:'mystic',title:'Family pack',price:80,count:'5 credits for 5 individuals'}].map(p=><div key={p.id} className={p.id==='mystic'?'price-card featured':'price-card'}><div className="eyebrow">{p.id==='mystic'?'FAMILY PACK':p.id==='couple'?'COUPLE':'INDIVIDUAL'}</div><h3>{p.title}</h3><div className="price">₹{p.price}</div><p>{p.count} · one-time purchase</p><ul><li><Check size={13}/>Personalized Vedic reflections</li><li><Check size={13}/>{p.id==='couple'?'A shared compatibility reflection':'Standard or roast · one report per credit'}</li><li><Check size={13}/>Saved reports & downloads</li></ul><button className="button button-brand" disabled={!!busy||!status.billingConfigured||!status.aiConfigured} onClick={()=>checkout(p.id)}>{busy===p.id?'Opening checkout…':user?'Choose this pack':'Sign in to purchase'}<ArrowRight size={15}/></button></div>)}</div>
    {!status.billingConfigured && <div className="notice">Purchases aren’t available on this installation yet. The sample reading is always free.</div>}
    {status.billingConfigured&&!status.aiConfigured && <div className="notice">Purchases will open when the reading service is connected.</div>}
    {balance!==null&&<p className="credit-balance">Your balance: {balance} individual credit{balance===1?'':'s'} · {coupleBalance} couple credit{coupleBalance===1?'':'s'}</p>}
    {pending&&<button className="text-button" disabled={!!busy} onClick={checkPayment}>{busy==='check'?'Checking…':'Check payment for your last order'}</button>}
    </>}
    {error&&<p className="form-error" role="alert">{error}</p>}
  </Modal>;
}
