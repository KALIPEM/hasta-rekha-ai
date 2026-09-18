import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,Heart,LoaderCircle,X} from 'lucide-react';
import {useAuth} from './AuthContext';
import {apiRequest,type PalmImage} from '../lib/gemini-utils';
import {parseReadingContent} from '../lib/reading-content';
import {saveReading} from '../lib/reading-store';
import type {Reading} from '../types';
import type {ServiceStatus} from '../App';

function PhotoPreview({file}:{file:File}){
  const [url,setUrl]=useState('');
  useEffect(()=>{const value=URL.createObjectURL(file);setUrl(value);return()=>URL.revokeObjectURL(value);},[file]);
  return <img src={url} alt="Selected partner palm"/>;
}
export function CoupleScanner({onCancel,onScanComplete,status,prepareImage,onBusy,onPricing}:{onCancel:()=>void;onScanComplete:(r:Reading)=>void;status:ServiceStatus;prepareImage:(f:File)=>Promise<PalmImage>;onBusy:(v:boolean)=>void;onPricing:()=>void}){
  const {user}=useAuth();
  const [partners,setPartners]=useState([{label:'Male partner',dominantHand:'Right',ageRange:'',right:null as File|null,left:null as File|null},{label:'Female partner',dominantHand:'Right',ageRange:'',right:null as File|null,left:null as File|null}]);
  const [title,setTitle]=useState('Our couple reading'),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const request=useRef<AbortController|null>(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  useEffect(()=>{onBusy(busy);return()=>onBusy(false);},[busy,onBusy]);
  function photo(index:number,side:'right'|'left',file:File|null){
    if(file&&(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024)){setError('Choose JPG, PNG or WebP photos under 10 MB each.');return;}
    setPartners(old=>old.map((p,i)=>i===index?{...p,[side]:file}:p));setError('');
  }
  async function generate(){
    if(!user){setError('Please sign in to save your couple reading.');return;}
    if(!consent||partners.some(p=>(!p.right&&!p.left)||!p.ageRange)){setError('Add a palm and select an age range for each partner, then confirm their permission.');return;}
    setBusy(true);setError('');const controller=new AbortController();request.current=controller;
    try{
      const prepared=await Promise.all(partners.map(async p=>({label:p.label,dominantHand:p.dominantHand,ageRange:p.ageRange,photos:await Promise.all((['right','left'] as const).filter(side=>p[side]).map(async side=>({...await prepareImage(p[side]!),side:side==='right'?'Right':'Left'})))})));
      const result=await apiRequest('/api/palm-reading',{readingKind:'couple',partners:prepared,consent,title},controller.signal);
      if(controller.signal.aborted)return;
      const reading:Reading={id:result.savedReadingId||crypto.randomUUID(),userId:user.id,title:title.trim()||'Our couple reading',readingText:JSON.stringify(parseReadingContent(result.content)),mode:'standard',mainFocus:'Couple compatibility',createdAt:Date.now()};
      let saved=reading;
      try{if(!result.savedReadingId)saved=await saveReading(reading);}catch{saved={...reading,storageWarning:'Your couple reading is ready, but saving failed. Download it before leaving.'};}
      onScanComplete(saved);
    }catch(e:any){if(e.name!=='AbortError')setError(e.message||'The couple reading could not be completed.');}finally{setBusy(false);}
  }
  return <section className="scanner-page section-width"><button className="back-link" onClick={()=>{request.current?.abort();onCancel();}}><ArrowLeft size={16}/>{busy?'Cancel reading':'Back to discover'}</button><div className="scanner-heading"><div className="eyebrow">TWO PALMS, A SHARED CONVERSATION</div><h1>Your connection, together.</h1><p>A Vedic-inspired couple reading of emotional expression, communication, commitment and everyday togetherness.</p></div>
    <form onSubmit={e=>{e.preventDefault();void generate();}}><fieldset disabled={busy} className="couple-fields"><label className="field">Name your reading<input maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/></label><div className="couple-upload-grid">{partners.map((partner,index)=><section className="couple-partner" key={partner.label}><h2>{partner.label}</h2><label className="field">Age range (required)<select required aria-label={`${partner.label} age range`} value={partner.ageRange} onChange={e=>setPartners(old=>old.map((p,i)=>i===index?{...p,ageRange:e.target.value}:p))}><option value="" disabled>Select age range</option>{['18–24','25–34','35–44','45–54','55–64','65+'].map(a=><option key={a}>{a}</option>)}</select></label><label className="field">Which hand does this partner use most?<select value={partner.dominantHand} onChange={e=>setPartners(old=>old.map((p,i)=>i===index?{...p,dominantHand:e.target.value}:p))}>{['Right','Left','Unknown / ambidextrous'].map(h=><option key={h}>{h}</option>)}</select></label><p>Add at least one hand. Both hands allow a traditional dominant/non-dominant comparison.</p>{(['right','left'] as const).map(side=><div className="couple-photo" key={side}><label className="field">{side==='right'?'Right':'Left'} palm<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{photo(index,side,e.target.files?.[0]||null);e.target.value='';}}/></label>{partner[side]&&<div className="photo-preview"><PhotoPreview file={partner[side]!}/><span>{partner[side]!.name}</span><button type="button" className="icon-button" aria-label={`Remove ${partner.label} ${side} photo`} onClick={()=>photo(index,side,null)}><X size={16}/></button></div>}</div>)}</section>)}</div>
    <p className="notice">Use natural light and include the whole palm, fingers and wrist. Side-edge relationship lines and mount firmness may not be visible in an open-palm photo; the report will say when they cannot be assessed.</p><label className="couple-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Both partners are adults and agree to send their photos to this app and Microsoft Azure OpenAI for this reading.</label><p className="form-disclaimer">Traditional symbolism for entertainment and conversation. This does not measure compatibility or determine whether you should marry. Photos are not saved with the report.</p>{!status.aiConfigured&&<p className="notice">The reading service is not connected yet.</p>}<button className="button button-brand" disabled={!consent||partners.some(p=>(!p.right&&!p.left)||!p.ageRange)||!status.aiConfigured||busy}><Heart size={18}/> Explore our connection</button></fieldset>{error&&<div className="form-error" role="alert">{error}{error.toLowerCase().includes('credit')&&<button type="button" className="inline-link" onClick={onPricing}>View reading options</button>}</div>}{busy&&<p role="status"><LoaderCircle className="spinner" size={20}/> Reading each partner’s palms, then bringing your reflections together. This may take a few minutes.</p>}</form></section>;
}
