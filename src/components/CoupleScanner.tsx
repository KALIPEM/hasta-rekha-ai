import {requireReadingCredit} from '../lib/credits';
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,Camera,Check,Heart,LoaderCircle,Sparkles,Upload,X} from 'lucide-react';
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
      if(status.billingConfigured && !await requireReadingCredit('couple',onPricing)) return;
      const prepared=await Promise.all(partners.map(async p=>({label:p.label,dominantHand:p.dominantHand,ageRange:p.ageRange,photos:await Promise.all((['right','left'] as const).filter(side=>p[side]).map(async side=>({...await prepareImage(p[side]!),side:side==='right'?'Right':'Left'})))})));
      const result=await apiRequest('/api/palm-reading',{readingKind:'couple',partners:prepared,consent,title},controller.signal);
      if(controller.signal.aborted)return;
      const reading:Reading={id:result.savedReadingId||crypto.randomUUID(),userId:user.id,title:title.trim()||'Our couple reading',readingText:JSON.stringify(parseReadingContent(result.content)),mode:'standard',mainFocus:'Couple compatibility',createdAt:Date.now()};
      let saved=reading;
      try{if(!result.savedReadingId)saved=await saveReading(reading);}catch{saved={...reading,storageWarning:'Your couple reading is ready, but saving failed. Download it before leaving.'};}
      onScanComplete(saved);
    }catch(e:any){if(e.name!=='AbortError')setError(e.message||'The couple reading could not be completed.');}finally{setBusy(false);}
  }
  return <section className="scanner-page section-width couple-scanner-page"><button className="back-link" onClick={()=>{request.current?.abort();onCancel();}}><ArrowLeft size={16}/>{busy?'Cancel reading':'Back to discover'}</button><div className="scanner-heading"><div className="eyebrow"><Heart size={14}/> TWO PALMS, A SHARED CONVERSATION</div><h1>Your connection, together.</h1><p>Start with one clear palm photo for each of you. Add both hands when you can for a fuller comparison.</p></div>
    <div className="couple-flow"><span><Check size={14}/> Two partners</span><span><Sparkles size={14}/> One shared reading</span><span>₹30 · one couple credit</span></div>
    <section className="couple-photo-guide" aria-labelledby="couple-photo-guide-title"><div><span className="eyebrow">PHOTO GUIDE</span><h2 id="couple-photo-guide-title">Frame the same four areas for both palms.</h2><p>Natural light and an uncropped, open hand give the couple comparison the clearest starting point.</p></div><ol><li><span>01</span><div><strong>Upper palm</strong><small>Keep the line beneath the fingers sharp and unobstructed.</small></div></li><li><span>02</span><div><strong>Centre of the palm</strong><small>Include the main horizontal lines without glare or shadows.</small></div></li><li><span>03</span><div><strong>Thumb base</strong><small>Show the full fleshy area beside the thumb, not just the centre.</small></div></li><li><span>04</span><div><strong>Pinky-side edge</strong><small>Leave this outer edge in frame when possible; do not crop it tightly.</small></div></li></ol></section>
    <form onSubmit={e=>{e.preventDefault();void generate();}}><fieldset disabled={busy} className="couple-fields"><label className="field couple-title-field">Name your reading<input maxLength={100} value={title} onChange={e=>setTitle(e.target.value)}/></label><div className="couple-upload-grid">{partners.map((partner,index)=><section className="couple-partner" key={partner.label}><header><span className="partner-number">0{index+1}</span><div><span className="eyebrow">PARTNER {index+1}</span><h2>{partner.label}</h2></div></header><div className="couple-inputs"><label className="field">Age range (required)<select required aria-label={`${partner.label} age range`} value={partner.ageRange} onChange={e=>setPartners(old=>old.map((p,i)=>i===index?{...p,ageRange:e.target.value}:p))}><option value="" disabled>Select age range</option>{['18–24','25–34','35–44','45–54','55–64','65+'].map(a=><option key={a}>{a}</option>)}</select></label><label className="field">Most-used hand<select value={partner.dominantHand} onChange={e=>setPartners(old=>old.map((p,i)=>i===index?{...p,dominantHand:e.target.value}:p))}>{['Right','Left','Unknown / ambidextrous'].map(h=><option key={h}>{h}</option>)}</select></label></div><p className="couple-partner-note">One palm is required. Adding both hands gives the reading more to compare.</p><div className="couple-photo-grid">{(['right','left'] as const).map(side=><div className="couple-photo" key={side}><span className="field-label">{side==='right'?'Right':'Left'} palm</span><div className="couple-photo-actions"><label className="couple-upload-button"><Upload size={15}/>{partner[side]?'Replace':'Choose'}<input className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{photo(index,side,e.target.files?.[0]||null);e.target.value='';}}/></label><label className="couple-camera-button" title="Take a palm photo"><Camera size={15}/><span>Camera</span><input className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>{photo(index,side,e.target.files?.[0]||null);e.target.value='';}}/></label></div>{partner[side]&&<div className="photo-preview"><PhotoPreview file={partner[side]!}/><span>{partner[side]!.name}</span><button type="button" className="icon-button" aria-label={`Remove ${partner.label} ${side} photo`} onClick={()=>photo(index,side,null)}><X size={16}/></button></div>}</div>)}</div></section>)}</div>
    <p className="notice">Use natural light and include the whole palm, fingers and wrist. Side-edge relationship lines and mount firmness may not be visible in an open-palm photo; the report will say when they cannot be assessed.</p><label className="couple-consent"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> Both partners are adults and agree to send their photos to this app and Microsoft Azure OpenAI for this reading.</label><p className="form-disclaimer">Traditional symbolism for entertainment and conversation. This does not measure compatibility or determine whether you should marry. Photos are not saved with the report.</p>{!status.aiConfigured&&<p className="notice">The reading service is not connected yet.</p>}<button className="button button-brand couple-submit" disabled={!consent||partners.some(p=>(!p.right&&!p.left)||!p.ageRange)||!status.aiConfigured||busy}><Heart size={18}/> Explore our connection</button></fieldset>{error&&<div className="form-error" role="alert">{error}{error.toLowerCase().includes('credit')&&<button type="button" className="inline-link" onClick={onPricing}>View reading options</button>}</div>}{busy&&<p role="status"><LoaderCircle className="spinner" size={20}/> Reading each partner’s palms, then bringing your reflections together. This may take a few minutes.</p>}</form></section>;
}
