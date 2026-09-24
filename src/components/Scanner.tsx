import {requireReadingCredit} from '../lib/credits';
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Check, Flame, Hand, Heart, ImagePlus, LoaderCircle, ShieldCheck, Sparkles, Sun, Upload, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { generatePalmReading, type PalmImage } from '../lib/gemini-utils';
import { saveReading } from '../lib/reading-store';
import { PalmIllustration } from './PalmIllustration';
import { Modal } from './Modal';
import type { Reading } from '../types';
import type { ServiceStatus } from '../App';
import {CoupleScanner} from './CoupleScanner';
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
const focuses = ['Overall life path', 'Personality & purpose', 'Career & growth', 'Love & connection', 'Everyday balance'];
async function prepareImage(file: File): Promise<PalmImage> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    if (Math.min(image.width, image.height) < 256) throw new Error('That photo is too small. Choose a sharper photo with your whole palm visible.');
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Your browser could not prepare the image.');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return { base64: canvas.toDataURL('image/jpeg', .88).split(',')[1], mimeType: 'image/jpeg' };
  } finally { URL.revokeObjectURL(url); }
}
interface Props { onCancel: () => void; onScanComplete: (r: Reading) => void; initialRoast: boolean; status: ServiceStatus; onSample: () => void; onPricing: () => void }
export function Scanner(props:Props) {
  const [kind,setKind]=useState<'individual'|'couple'>('individual');
  const [locked,setLocked]=useState(false);
  return <><div className="section-width reading-mode-picker" role="group" aria-label="Choose a reading type"><button disabled={locked} aria-pressed={kind==='individual'} className={kind==='individual'?'reading-mode-option selected':'reading-mode-option'} onClick={()=>setKind('individual')}><span className="reading-mode-icon"><Hand size={22}/></span><span><strong>Individual reading</strong><small>One or both palms · a personal reading · ₹20</small></span><ArrowRight size={18}/></button><button disabled={locked} aria-pressed={kind==='couple'} className={kind==='couple'?'reading-mode-option selected':'reading-mode-option'} onClick={()=>setKind('couple')}><span className="reading-mode-icon"><Heart size={21}/></span><span><strong>Couple reading</strong><small>Two palms · your shared dynamic · ₹30</small></span><ArrowRight size={18}/></button></div>{kind==='couple'?<CoupleScanner {...props} prepareImage={prepareImage} onBusy={setLocked}/>:<IndividualScanner {...props} onBusy={setLocked}/>}</>;
}
function IndividualScanner({ onCancel, onScanComplete, initialRoast, status, onSample, onPricing, onBusy }: Props & {onBusy:(v:boolean)=>void}) {
  const { user } = useAuth();
  const [step, setStep] = useState(1), [files, setFiles] = useState<Partial<Record<'Left'|'Right',File>>>({}), [error, setError] = useState(''), [dragging, setDragging] = useState<string | null>(null);
  const [hand, setHand] = useState('Right-handed'), [age, setAge] = useState(''), [focus, setFocus] = useState(focuses[0]), [title, setTitle] = useState('My palm reading'), [roast, setRoast] = useState(initialRoast);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(0), [showRoastWarning,setShowRoastWarning]=useState(false);
  useEffect(()=>{onBusy(busy);return()=>onBusy(false);},[busy,onBusy]);
  const request = useRef<AbortController | null>(null);
  const sides = ['Left','Right'] as const;
  const count = Object.keys(files).length;
  const [previews, setPreviews] = useState<Partial<Record<'Left'|'Right',string>>>({});
  useEffect(() => { const urls = Object.fromEntries(Object.entries(files).map(([side,file])=>[side,URL.createObjectURL(file)])); setPreviews(urls); return () => Object.values(urls).forEach(url => URL.revokeObjectURL(url)); }, [files]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (!busy) return; const interval = setInterval(() => setMessage(i => (i + 1) % 3), 5500); return () => clearInterval(interval); }, [busy]);
  function addFile(side:'Left'|'Right', incoming:File[]) {
    if (!incoming.length) return;
    if (incoming.length !== 1) return setError('Choose one photo for each hand field.');
    const file=incoming[0];
    if (!allowedTypes.includes(file.type)) return setError('Choose JPG, PNG, or WebP photos.');
    if (file.size > 10 * 1024 * 1024) return setError('Each photo must be under 10 MB.');
    setFiles(old=>({...old,[side]:file})); setError('');
  }
  async function generate() {
    if (!user) { setError('Please sign in to save your reading.'); return; }
    if (!count) { setError('Add a photo of either palm.'); setStep(1); return; }
    if (!age) { setError('Select your age range.'); setStep(1); return; }
    setBusy(true); setError(''); request.current = new AbortController();
    try {
      if(status.billingConfigured && !await requireReadingCredit('individual',onPricing)) return;
      setStep(3);
      const images = await Promise.all(sides.filter(side=>files[side]).map(async side=>({...await prepareImage(files[side]!),side})));
      const generated = await generatePalmReading(images, hand, age, focus, roast, request.current.signal, title);
      if (request.current.signal.aborted) return;
      const result: Reading = { id: generated.savedReadingId || crypto.randomUUID(), userId: user.id, title: title.trim() || 'My palm reading', readingText: generated.readingText, createdAt: Date.now(), mode: roast ? 'roast' : 'standard', mainFocus: focus };
      let saved: Reading;
      try { saved = generated.savedReadingId ? result : await saveReading(result); }
      catch { saved = { ...result, storageWarning: 'Your reading is ready, but we could not save it. Download a copy before leaving this page.' }; }
      onScanComplete(saved);
    } catch (e: any) { if (e.name !== 'AbortError') { setError(e.message || 'We could not read that photo. Try again with a clearer image.'); setStep(2); } }
    finally { setBusy(false); }
  }
  function requestReading() {
    if (roast) { setShowRoastWarning(true); return; }
    void generate();
  }
  return <section className="scanner-page section-width">
    <button className="back-link" onClick={() => { request.current?.abort(); onCancel(); }}><ArrowLeft size={16}/>{busy ? 'Cancel reading' : 'Back to discover'}</button>
    <div className="scanner-heading"><div className="eyebrow">A MOMENT FOR YOU</div><h1>{step === 1 ? 'Let’s see your palm.' : step === 2 ? 'Make this reading yours.' : 'Your story is taking shape.'}</h1><p>{step === 1 ? 'We recommend one clear photo of each palm for more context. The second photo is optional; one palm is enough to continue.' : step === 2 ? 'A little context helps us choose a more meaningful perspective.' : 'We’re exploring the visible lines through a Vedic lens.'}</p></div>
    <ol className="wizard-steps">{['Your photo', 'Your perspective', 'Your reading'].map((label, i) => <li key={label} className={step === i+1 ? 'current' : step > i+1 ? 'complete' : ''} aria-current={step === i+1 ? 'step' : undefined}><span>{step > i+1 ? <Check size={13}/> : i+1}</span>{label}</li>)}</ol>
    {step === 1 && <div className="scanner-grid"><div className="upload-panel">
      <div className="couple-photo-grid individual-photo-grid">{sides.map(side=><div key={side} className={dragging===side?'couple-photo individual-photo dragging':'couple-photo individual-photo'} onDragOver={e=>{e.preventDefault();setDragging(side);}} onDragLeave={()=>setDragging(null)} onDrop={e=>{e.preventDefault();setDragging(null);addFile(side,Array.from(e.dataTransfer.files));}}>
        <span className="field-label">{side} palm</span><p>Choose or take one clear photo.</p>
        <div className="couple-photo-actions"><label className="couple-upload-button"><Upload size={15}/>{files[side]?'Replace':'Choose'}<input aria-label={side+' palm photo'} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{addFile(side,Array.from(e.target.files||[]));e.target.value='';}}/></label><label className="couple-camera-button"><Camera size={15}/> Camera<input aria-label={'Take '+side.toLowerCase()+' palm photo'} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e=>{addFile(side,Array.from(e.target.files||[]));e.target.value='';}}/></label></div>
        {files[side]&&<div className="photo-preview"><img src={previews[side]} alt={side+' palm preview'}/><span>{files[side]!.name}</span><button type="button" className="icon-button" aria-label={'Remove '+side.toLowerCase()+' palm photo'} onClick={()=>{setFiles(old=>{const next={...old};delete next[side];return next;});setError('');}}><X size={15}/></button></div>}
      </div>)}</div><p className="photo-guide-intro">Add either hand to continue. Both are recommended, but the second photo is optional. JPG, PNG or WebP · up to 10 MB each.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <label className="field">Your age range (required)<select required value={age} onChange={e => setAge(e.target.value)}><option value="" disabled>Select your age range</option>{['18–24', '25–34', '35–44', '45–54', '55–64', '65+'].map(a => <option key={a}>{a}</option>)}</select></label><div className="upload-footer"><span><ShieldCheck size={15}/> Photos aren’t saved with your report.</span><button className="button button-dark" disabled={!count || !age} onClick={() => { setStep(2); setError(''); }}>Continue <ArrowRight size={16}/></button></div>
    </div><aside className="photo-tips"><PalmIllustration/><h3>Frame your palm like this.</h3><p className="photo-guide-intro">Keep the marked lines, the thumb base and the outer palm edge visible in one clear photo.</p><ul><li><Sun size={18}/> Use soft, natural light with no flash glare.</li><li><Hand size={18}/> Open your hand and relax your fingers.</li><li><ImagePlus size={18}/> Include your palm, fingers, wrist and pinky-side edge.</li><li><Check size={18}/> Keep the heart and head lines sharp and in focus.</li></ul></aside></div>}
    {step === 2 && <div className="perspective-panel">
      <form onSubmit={e => { e.preventDefault(); requestReading(); }}>
        <div className="form-grid"><label className="field">Name your reading<input maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="My palm reading"/></label></div>
        <fieldset className="choice-field"><legend>Which hand do you use most?</legend><div className="hand-options">{['Right-handed', 'Left-handed', 'Ambidextrous'].map(h => <label key={h} className={hand === h ? 'radio-card selected' : 'radio-card'}><input type="radio" name="hand" value={h} checked={hand === h} onChange={() => setHand(h)}/>{h}</label>)}</div></fieldset>
        <fieldset className="choice-field"><legend>What would you like to explore?</legend><div className="focus-options">{focuses.map(f => <label key={f} className={focus === f ? 'radio-card selected' : 'radio-card'}><input type="radio" name="focus" value={f} checked={focus === f} onChange={() => setFocus(f)}/>{f}</label>)}</div></fieldset>
        <label className={roast ? 'roast-toggle enabled' : 'roast-toggle'}><Flame size={25}/><span><strong>Roast mode</strong><small>Blunt, funny and unfiltered.</small></span><input type="checkbox" checked={roast} onChange={e => setRoast(e.target.checked)}/></label>
        <p className="form-disclaimer">By requesting a reading, you agree to send these photos to our server and Microsoft Azure OpenAI for processing. Readings are for entertainment and reflection.</p>
        {!status.aiConfigured && <div className="notice">The reading service isn’t connected yet. You can explore a complete sample while it’s being set up. <button type="button" className="inline-link" onClick={onSample}>View the sample <ArrowRight size={14}/></button></div>}
        {error && <div className="form-error" role="alert">{error}{error.toLowerCase().includes('credit') && <button type="button" className="inline-link" onClick={onPricing}>Get more readings <ArrowRight size={14}/></button>}</div>}
        <div className="form-actions"><button type="button" className="back-link" onClick={() => { setStep(1); setError(''); }}><ArrowLeft size={16}/> Your photos</button><button className="button button-brand" disabled={!status.aiConfigured || busy}>{roast ? 'Read & roast my palm' : 'Reveal my reading'} <Sparkles size={16}/></button></div>
      </form>
      {showRoastWarning && <Modal title="Roast mode warning" onClose={() => setShowRoastWarning(false)}><div className="roast-warning-symbol" aria-hidden="true">☠</div><div className="eyebrow">ROAST MODE WARNING</div><h2>Before we turn up the heat.</h2><p className="muted">This reading may contain swear words, blunt mockery and offensive humour. It is written to be funny, but it may not be for everyone.</p><div className="form-actions"><button type="button" className="button button-outline" onClick={() => setShowRoastWarning(false)}>Go back</button><button type="button" className="button button-brand" onClick={() => { setShowRoastWarning(false); void generate(); }}><Flame size={16}/> I understand — roast my palm</button></div></Modal>}
    </div>}
    {step === 3 && <div className="processing-panel" role="status" aria-live="polite"><PalmIllustration small/><LoaderCircle className="spinner" size={28}/><h3>{['Looking at your palm’s visible features…', 'Exploring traditional interpretations…', 'Putting your reflections together…'][message]}</h3><p>This can take a minute. No need to keep your hand still.</p></div>}
  </section>;
}
