import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Flame, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { useAuth } from './AuthContext';
import { removeReading, subscribeReadings } from '../lib/reading-store';
import { parseReadingContent } from '../lib/reading-content';
import { Modal } from './Modal';
import type { Reading } from '../types';
interface Props { onStart: () => void; onOpen: (r: Reading) => void; onSample: () => void }
export function Dashboard({ onStart, onOpen, onSample }: Props) {
  const { user } = useAuth();
  const [readings, setReadings] = useState<Reading[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [search, setSearch] = useState(''), [filter, setFilter] = useState('all');
  const [deleting, setDeleting] = useState<Reading | null>(null), [busy, setBusy] = useState(false);
  useEffect(() => { setReadings([]); setLoading(true); setError(''); return subscribeReadings(user?.id, r => { setReadings(r); setLoading(false); }, () => { setError('We couldn’t load your saved readings. Check your connection and try again.'); setLoading(false); }); }, [user?.id]);
  const filtered = useMemo(() => readings.filter(r => (filter === 'all' || (r.mode || 'standard') === filter) && (r.title || 'Palm reading').toLowerCase().includes(search.toLowerCase())), [readings, filter, search]);
  function preview(r: Reading) { try { return parseReadingContent(r.readingText).majorHighlight; } catch { return r.readingText.replace(/[#*]/g, '').slice(0, 140); } }
  async function confirmDelete() {
    if (!deleting) return; setBusy(true);
    try { await removeReading(deleting); setDeleting(null); }
    catch { setError('We couldn’t delete this reading. Please try again.'); }
    finally { setBusy(false); }
  }
  return <section className="library-page section-width">
    <div className="library-heading"><div><div className="eyebrow">MOMENTS OF SELF-DISCOVERY</div><h1>Your little library.</h1><p>Your saved readings, ready to revisit.</p></div><button className="button button-brand" onClick={onStart}><Plus size={16}/> New reading</button></div>
    <div className="library-tools"><div className="filter-tabs" aria-label="Filter readings">{[{value:'all', label:'All readings'}, {value:'standard', label:'Reflections'}, {value:'roast', label:'Roasts'}].map(f => <button key={f.value} aria-pressed={filter === f.value} className={filter === f.value ? 'selected' : ''} onClick={() => setFilter(f.value)}>{f.label}</button>)}</div><label className="search-field"><Search size={16}/><input aria-label="Search reading titles" placeholder="Find a reading…" value={search} onChange={e => setSearch(e.target.value)}/></label></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading ? <div className="empty-library" role="status">Opening your library…</div> : filtered.length ? <div className="readings-grid">{filtered.map(r => <article className="reading-card" key={r.id}><button className="reading-card-main" onClick={() => onOpen(r)}><span className="reading-card-meta">{r.mode === 'roast' ? <Flame size={18}/> : <Sparkles size={18}/>}<time dateTime={new Date(r.createdAt).toISOString()}>{new Date(r.createdAt).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}</time></span><h3>{r.title || 'My palm reading'}</h3><p>{preview(r)}</p><span className="inline-link">Revisit your reading <ArrowRight size={15}/></span></button><div className="reading-card-bottom"><span>{r.mode === 'roast' ? 'Cosmic roast' : 'Vedic reflection'}</span><button className="icon-button" aria-label={`Delete ${r.title || 'reading'}`} onClick={() => setDeleting(r)}><Trash2 size={15}/></button></div></article>)}</div> : <div className="empty-library"><span className="modal-emblem"><BookOpen size={32} strokeWidth={1.3}/></span><h2>{readings.length ? 'No matching readings.' : 'Every story starts somewhere.'}</h2><p>{readings.length ? 'Try another title or choose a different filter.' : 'Your first reading is a photo and a little curiosity away.'}</p><button className="button button-brand" onClick={readings.length ? () => { setSearch(''); setFilter('all'); } : onStart}>{readings.length ? 'Show all readings' : 'Begin my first reading'}<ArrowRight size={16}/></button>{!readings.length && <button className="sample-link" onClick={onSample}>Or explore a sample first</button>}</div>}
    {deleting && <Modal title="Delete this reading?" onClose={() => { if (!busy) setDeleting(null); }}><div className="eyebrow">YOUR LIBRARY</div><h2>Let this reading go?</h2><p className="muted">“{deleting.title || 'My palm reading'}” will be removed from your account. This can’t be undone.</p><div className="form-actions"><button disabled={busy} className="button button-outline" onClick={() => setDeleting(null)}>Keep it</button><button disabled={busy} className="button button-brand" onClick={confirmDelete}>{busy ? 'Removing…' : 'Delete reading'}</button></div></Modal>}
  </section>;
}
