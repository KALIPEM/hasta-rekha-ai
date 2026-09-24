import {useState} from 'react';
import {Copy, Share2} from 'lucide-react';
import {Modal} from './Modal';
import {excerptCaption, type ExcerptGroup} from '../lib/reading-excerpts';
import {deliverShare} from '../lib/share-delivery';
import type {Reading} from '../types';

export function ExcerptPicker({groups, reading, onClose}: {groups: ExcerptGroup[]; reading: Reading; onClose: () => void}) {
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');
  const [selected, setSelected] = useState('');
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const group = groups.find(g => g.id === groupId);
  const caption = selected ? excerptCaption(groups, selected, reading) : '';
  async function share(copy: boolean) {
    setBusy(true); setNotice('');
    try {
      const result = await deliverShare(caption, copy);
      if (result === 'copied') setNotice('Caption and link copied.');
    } catch { setNotice('Could not share. Try Copy caption instead.'); }
    finally { setBusy(false); }
  }
  return <Modal title="Choose from my reading" onClose={onClose}>
    <div className="excerpt-picker">
      <div className="eyebrow">SHARE YOUR READING</div>
      <h2>{preview ? 'Your share preview.' : 'Pick the part you love.'}</h2>
      {preview ? <>
        <p>This is the complete caption that will be shared. Check that you’re comfortable making this passage public.</p>
        <blockquote className="excerpt-preview">{caption}</blockquote>
        <div className="excerpt-actions"><button className="button button-outline" disabled={busy} onClick={() => {setPreview(false); setNotice('');}}>Change excerpt</button><button className="button button-brand" disabled={busy} onClick={() => void share(false)}><Share2 size={16}/> Share</button><button className="button button-outline" disabled={busy} onClick={() => void share(true)}><Copy size={16}/> Copy caption</button></div>
      </> : <>
        <p>Choose a section, then select one complete passage.</p>
        <label className="field">Report section<select value={groupId} onChange={e => {setGroupId(e.target.value); setSelected('');}}>{groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}</select></label>
        <fieldset className="excerpt-options"><legend>Choose a passage</legend>{group?.excerpts.map(e => <label key={e.id} className={selected === e.id ? 'excerpt-option selected' : 'excerpt-option'}><input type="radio" name="report-excerpt" value={e.id} checked={selected === e.id} onChange={() => setSelected(e.id)}/><span>{e.text}</span></label>)}</fieldset>
        <button className="button button-brand" disabled={!selected} onClick={() => setPreview(true)}>Preview sharing <Share2 size={16}/></button>
      </>}
      {notice && <p role="status">{notice}</p>}
    </div>
  </Modal>;
}
