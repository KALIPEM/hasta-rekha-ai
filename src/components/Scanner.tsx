import {requireReadingCredit} from '../lib/credits';
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { ArrowLeft, ArrowRight, Camera, Check, Flame, Hand, Heart, ImagePlus, LoaderCircle, ShieldCheck, Sparkles, Sun, Upload, X } from 'lucide-react';
import { useAuth } from './AuthContext';
import { generatePalmReading, type PalmImage } from '../lib/gemini-utils';
import { saveReading } from '../lib/reading-store';
import { PalmIllustration } from './PalmIllustration';
import type { Reading } from '../types';
import type { ServiceStatus } from '../App';
import {CoupleScanner} from './CoupleScanner';
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
const focuses = ['Overall life path', 'Personality & purpose', 'Career & growth', 'Love & connection', 'Everyday balance'];
async function prepareImage(file: File): Promise<PalmImage> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image(); image.src = url; await image.decode();
    if (Math.min(image.width, image.height) < 160) throw new Error('That photo is too small. Choose a sharper photo with your whole palm visible.');
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
  return <><div className="section-width reading-mode-picker" role="group" aria-label="Choose a reading type"><button disabled={locked} aria-pressed={kind==='individual'} className={kind==='individual'?'reading-mode-option selected':'reading-mode-option'} onClick={()=>setKind('individual')}><span className="reading-mode-icon"><Hand size={22}/></span><span><strong>Individual reading</strong><small>One palm · a personal reading · ₹20</small></span><ArrowRight size={18}/></button><button disabled={locked} aria-pressed={kind==='couple'} className={kind==='couple'?'reading-mode-option selected':'reading-mode-option'} onClick={()=>setKind('couple')}><span className="reading-mode-icon"><Heart size={21}/></span><span><strong>Couple reading</strong><small>Two palms · your shared dynamic · ₹30</small></span><ArrowRight size={18}/></button></div>{kind==='couple'?<CoupleScanner {...props} prepareImage={prepareImage} onBusy={setLocked}/>:<IndividualScanner {...props} onBusy={setLocked}/>}</>;
}
function IndividualScanner({ onCancel, onScanComplete, initialRoast, status, onSample, onPricing, onBusy }: Props & {onBusy:(v:boolean)=>void}) {
  const { user } = useAuth();
  const [step, setStep] = useState(1), [files, setFiles] = useState<File[]>([]), [error, setError] = useState(''), [dragging, setDragging] = useState(false);
  const [hand, setHand] = useState('Right-handed'), [age, setAge] = useState(''), [focus, setFocus] = useState(focuses[0]), [title, setTitle] = useState('My palm reading'), [roast, setRoast] = useState(initialRoast);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(0);
  useEffect(()=>{onBusy(busy);return()=>onBusy(false);},[busy,onBusy]);
  const request = useRef<AbortController | null>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  useEffect(() => { const urls = files.map(f => URL.createObjectURL(f)); setPreviews(urls); return () => urls.forEach(url => URL.revokeObjectURL(url)); }, [files]);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => { if (!busy) return; const interval = setInterval(() => setMessage(i => (i + 1) % 3), 5500); return () => clearInterval(interval); }, [busy]);
  function addFiles(incoming: File[]) {
    if (incoming.some(f => !allowedTypes.includes(f.type))) return setError('Choose JPG, PNG, or WebP photos. Other file types are not supported.');
    if (incoming.some(f => f.size > 10 * 1024 * 1024)) return setError('Each photo must be under 10 MB.');
    if (incoming.length + files.length > 2) return setError('You can add up to two photos. Remove one to replace it.');
    setFiles([...files, ...incoming]); setError('');
  }
  function drop(e: DragEvent) { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)); }
  async function generate() {
    if (!user) { setError('Please sign in to save your reading.'); return; }
    if (!age) { setError('Select your age range.'); setStep(1); return; }
    setBusy(true); setError(''); request.current = new AbortController();
    try {
      if(status.billingConfigured && !await requireReadingCredit('individual',onPricing)) return;
      setStep(3);
      const images = await Promise.all(files.map(prepareImage));
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
  return <section className="scanner-page section-width">
    <button className="back-link" onClick={() => { request.current?.abort(); onCancel(); }}><ArrowLeft size={16}/>{busy ? 'Cancel reading' : 'Back to discover'}</button>
    <div className="scanner-heading"><div className="eyebrow">A MOMENT FOR YOU</div><h1>{step === 1 ? 'Let’s see your palm.' : step === 2 ? 'Make this reading yours.' : 'Your story is taking shape.'}</h1><p>{step === 1 ? 'A clear photo is the start of a thoughtful reading.' : step === 2 ? 'A little context helps us choose a more meaningful perspective.' : 'We’re exploring the visible lines through a Vedic lens.'}</p></div>
    <ol className="wizard-steps">{['Your photo', 'Your perspective', 'Your reading'].map((label, i) => <li key={label} className={step === i+1 ? 'current' : step > i+1 ? 'complete' : ''} aria-current={step === i+1 ? 'step' : undefined}><span>{step > i+1 ? <Check size={13}/> : i+1}</span>{label}</li>)}</ol>
    {step === 1 && <div className="scanner-grid"><div className="upload-panel">
      <div className={dragging ? 'drop-zone dragging' : 'drop-zone'} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}>
        {files.length < 2 ? <><span className="upload-icon"><Hand size={36} strokeWidth={1.2}/></span><h3>Your palm, in focus.</h3><p>Drag a photo here, or choose one below.</p><label className="button button-brand upload-label"><Upload size={16}/> Choose photos<input className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }}/></label><label className="camera-link"><Camera size={15}/> Take a photo<input className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={e => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }}/></label><small>JPG, PNG, WEBP · Up to 10 MB each · 1–2 photos</small></> : <><Check size={36}/><h3>Your photos are added.</h3><p>Ready for a new perspective?</p></>}
      </div>
      {files.length > 0 && <div className="photo-previews">{files.map((file, i) => <div key={`${file.name}-${file.lastModified}-${i}`} className="photo-preview"><img src={previews[i]} alt={`Selected palm photo ${i+1}`}/><span>{file.name}</span><button className="icon-button" aria-label={`Remove photo ${i+1}`} onClick={() => { setFiles(files.filter((_, n) => n !== i)); setError(''); }}><X size={15}/></button></div>)}</div>}
      {error && <p className="form-error" role="alert">{error}</p>}
      <label className="field">Your age range (required)<select required value={age} onChange={e => setAge(e.target.value)}><option value="" disabled>Select your age range</option>{['18–24', '25–34', '35–44', '45–54', '55–64', '65+'].map(a => <option key={a}>{a}</option>)}</select></label><div className="upload-footer"><span><ShieldCheck size={15}/> Photos aren’t saved with your report.</span><button className="button button-dark" disabled={!files.length || !age} onClick={() => { setStep(2); setError(''); }}>Continue <ArrowRight size={16}/></button></div>
    </div><aside className="photo-tips"><PalmIllustration/><h3>Frame your palm like this.</h3><p className="photo-guide-intro">Keep the marked lines, the thumb base and the outer palm edge visible in one clear photo.</p><ul><li><Sun size={18}/> Use soft, natural light with no flash glare.</li><li><Hand size={18}/> Open your hand and relax your fingers.</li><li><ImagePlus size={18}/> Include your palm, fingers, wrist and pinky-side edge.</li><li><Check size={18}/> Keep the heart and head lines sharp and in focus.</li></ul></aside></div>}
    {step === 2 && <div className="perspective-panel">
      <form onSubmit={e => { e.preventDefault(); generate(); }}>
        <div className="form-grid"><label className="field">Name your reading<input maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="My palm reading"/></label></div>
        <fieldset className="choice-field"><legend>Which hand do you use most?</legend><div className="hand-options">{['Right-handed', 'Left-handed', 'Ambidextrous'].map(h => <label key={h} className={hand === h ? 'radio-card selected' : 'radio-card'}><input type="radio" name="hand" value={h} checked={hand === h} onChange={() => setHand(h)}/>{h}</label>)}</div></fieldset>
        <fieldset className="choice-field"><legend>What would you like to explore?</legend><div className="focus-options">{focuses.map(f => <label key={f} className={focus === f ? 'radio-card selected' : 'radio-card'}><input type="radio" name="focus" value={f} checked={focus === f} onChange={() => setFocus(f)}/>{f}</label>)}</div></fieldset>
        <label className={roast ? 'roast-toggle enabled' : 'roast-toggle'}><Flame size={25}/><span><strong>Bring the cosmic heat?</strong><small>Sharp Gen Z banter, blunt callouts and zero sugarcoating. Comedy, not a verdict.</small></span><input type="checkbox" checked={roast} onChange={e => setRoast(e.target.checked)}/></label>
        <p className="form-disclaimer">By requesting a reading, you agree to send these photos to our server and Microsoft Azure OpenAI for processing. Readings are for entertainment and reflection.</p>
        {!status.aiConfigured && <div className="notice">The reading service isn’t connected yet. You can explore a complete sample while it’s being set up. <button type="button" className="inline-link" onClick={onSample}>View the sample <ArrowRight size={14}/></button></div>}
        {error && <div className="form-error" role="alert">{error}{error.toLowerCase().includes('credit') && <button type="button" className="inline-link" onClick={onPricing}>Get more readings <ArrowRight size={14}/></button>}</div>}
        <div className="form-actions"><button type="button" className="back-link" onClick={() => { setStep(1); setError(''); }}><ArrowLeft size={16}/> Your photos</button><button className="button button-brand" disabled={!status.aiConfigured || busy}>{roast ? 'Read & roast my palm' : 'Reveal my reading'} <Sparkles size={16}/></button></div>
      </form>
    </div>}
    {step === 3 && <div className="processing-panel" role="status" aria-live="polite"><PalmIllustration small/><LoaderCircle className="spinner" size={28}/><h3>{['Looking at your palm’s visible features…', 'Exploring traditional interpretations…', 'Putting your reflections together…'][message]}</h3><p>This can take a minute. No need to keep your hand still.</p></div>}
  </section>;
}
