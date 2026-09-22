import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Download, Edit3, Eye, Flame, Share2, Sparkles, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { parseReadingContent } from '../lib/reading-content';
import { renameReading } from '../lib/reading-store';
import { PalmIllustration } from './PalmIllustration';
import type { Reading, ReadingContent } from '../types';
import {getShareLines,shareCaption} from '../lib/share-lines';
interface Props { reading: Reading; onBack: () => void; onStart: () => void; onUpdateTitle: (s: string) => void }
export function ReadingView({ reading, onBack, onStart, onUpdateTitle }: Props) {
  const [editing, setEditing] = useState(false), [title, setTitle] = useState(reading.title || 'My palm reading'), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  let content: ReadingContent | null = null; try { content = parseReadingContent(reading.readingText); } catch {}
  async function rename() {
    if (!title.trim()) return;
    setBusy(true); setNotice('');
    try { await renameReading(reading, title.trim()); onUpdateTitle(title.trim()); setEditing(false); }
    catch (e: any) { setNotice(e.message || 'Your new title could not be saved. Please try again.'); }
    finally { setBusy(false); }
  }
  const shareLines=getShareLines(content,reading.mode==='roast');
  async function share(line:string,copy=false) {
    try {
      const text=shareCaption(line,reading.mode==='roast',content);
      if (!copy && navigator.share) await navigator.share({ title: 'Hasta Rekha', text });
      else if (navigator.clipboard) { await navigator.clipboard.writeText(text); setNotice('Your caption is copied. Paste it into your social post or story.'); }
      else setNotice('Sharing isn’t supported in this browser. Download your report instead.');
    } catch (e: any) { if (e.name !== 'AbortError') setNotice('We couldn’t share this time. You can download a copy instead.'); }
  }
  function download() {
    const text = content ? [
      '# ' + (reading.title || 'My palm reading'), '', reading.isSample ? 'ILLUSTRATIVE SAMPLE — NO PHOTO ANALYZED' : 'VEDIC-INSPIRED PALM REFLECTION', '',
      content.majorHighlight, content.openingHook, '', content.executiveSummary, '',
      ...content.aspects.flatMap(a => ['## ' + a.aspectName, a.summary, '', a.detailedInterpretation, '', 'Visible feature / traditional association: ' + a.palmEvidence, '']),
      ...(content.lifeAreas ?? []).flatMap(a=>['## '+a.title,a.summary,'',...a.questions.flatMap(q=>['### '+q.question,q.answer,'']),'Watch out for: '+a.watchOutFor,'Try this: '+a.nextStep,'Reading basis: '+a.basis,'']),
      '## Past, present & future', ...content.lifeTimeline.flatMap(t => [t.ageRange + ': ' + t.phaseName, t.keyEventOrShift, t.palmEvidence, '']),
      '## Patterns to reflect on', ...content.behavioralPatterns.flatMap(p => [p.pattern, p.evidence, '']),
      '## Small steps to try', ...content.recommendedActions.map(a => '- ' + a), '',
      '## Thoughts worth sharing', ...shareLines.map(line=>line.text), '',
      '## Image notes', content.imageQualityCheck.clarity, content.imageQualityCheck.confidenceImpact, content.imageQualityCheck.notes, '',
      'Hasta Rekha'
    ].join('\n') : reading.readingText;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'hasta-rekha-reading.md'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <article className="report-page section-width">
    <div className="report-toolbar"><button className="back-link" onClick={onBack}><ArrowLeft size={16}/>{reading.isSample ? 'Back to discover' : 'My readings'}</button><div><a className="button button-outline button-small" href="#share-lines"><Share2 size={15}/><span>Share a line</span></a><button className="button button-outline button-small" aria-label="Download report" onClick={download}><Download size={15}/><span>Download</span></button></div></div>
    {reading.isSample && <div className="sample-notice"><Eye size={18}/><span>You’re exploring an illustrative sample. No photo has been analyzed.</span><button className="inline-link" onClick={onStart}>Get your own reading <ArrowRight size={14}/></button></div>}
    {reading.storageWarning && <p className="notice" role="alert">{reading.storageWarning}</p>}
    {notice && <p className="notice" role="status">{notice}</p>}
    <header className="report-heading"><div className="eyebrow">{reading.mode === 'roast' ? <Flame size={15}/> : <Sparkles size={15}/>} {reading.mode === 'roast' ? 'YOUR COSMIC COMEDY' : reading.mainFocus === 'Couple compatibility' ? 'YOUR COUPLE READING' : 'YOUR PALM READING'}</div>
      {editing ? <form className="title-editor" onSubmit={e => { e.preventDefault(); rename(); }}><input autoFocus aria-label="Reading title" maxLength={100} required value={title} onChange={e => setTitle(e.target.value)}/><button className="icon-button" disabled={busy} aria-label="Save title"><Check size={18}/></button><button className="icon-button" type="button" disabled={busy} aria-label="Cancel title change" onClick={() => { setEditing(false); setTitle(reading.title || 'My palm reading'); }}><X size={18}/></button></form> : <div className="report-title"><h1>{reading.title || 'My palm reading'}</h1>{!reading.isSample && !reading.storageWarning && <button className="icon-button" aria-label="Rename reading" onClick={() => setEditing(true)}><Edit3 size={17}/></button>}</div>}
      {!reading.isSample && <p>{new Date(reading.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })} · {reading.mainFocus || 'Overall life path'}</p>}
      {!reading.isSample && <p className="reading-attribution">AI-generated palm reading based on traditional palmistry.</p>}
    </header>
    {content ? <>
      <section className="report-summary"><div><span className="eyebrow">THE THREAD THROUGH YOUR STORY</span><h2>{content.majorHighlight}</h2><p className="report-hook">{content.openingHook}</p><p>{content.executiveSummary}</p></div><PalmIllustration small/></section>
      <nav className="report-jump-links" aria-label="Reading sections"><a href="#your-perspectives">Your perspectives</a>{!!content.lifeAreas?.length && <a href="#life-questions">Love, money & life</a>}{content.lifeTimeline.length > 0 && <a href="#reflection-timeline">Past, present & future</a>}<a href="#small-steps">Small steps</a></nav>
      {!!content.lifeAreas?.length && <section id="life-questions" className="report-section life-questions"><div className="eyebrow">THE QUESTIONS YOU BRING TO A READING</div><h2>Love, money & the life around you.</h2><p className="muted">Explore each area for a deeper perspective, something to watch for, and a next step.</p>{content.lifeAreas.map(area=><details className="life-area" key={area.id}><summary><span>{area.title}</span><span aria-hidden="true">+</span></summary><p className="aspect-summary">{area.summary}</p>{area.questions.map(q=><div className="life-question" key={q.question}><h3>{q.question}</h3><p>{q.answer}</p></div>)}<div className="life-takeaways"><div><h4>Watch out for</h4><p>{area.watchOutFor}</p></div><div><h4>Try this</h4><p>{area.nextStep}</p></div></div><details className="life-basis"><summary>About this topic</summary><p>{area.basis}</p></details></details>)}</section>}
      <section id="your-perspectives" className="report-section"><div className="eyebrow">DIFFERENT LINES, DIFFERENT LENSES</div><h2>Your perspectives.</h2><div className="aspect-grid">{content.aspects.map((a, i) => <section className="aspect-card" key={i}><span className="aspect-number">0{i+1}</span><h3>{a.aspectName}</h3><p className="aspect-summary">{a.summary}</p><p>{a.detailedInterpretation}</p><div className="palm-evidence"><Eye size={16}/><div><span>VISIBLE FEATURE & TRADITIONAL ASSOCIATION</span><p>{a.palmEvidence}</p></div></div></section>)}</div></section>
      {content.lifeTimeline.length > 0 && <section id="reflection-timeline" className="report-section"><div className="eyebrow">THE PATTERN OF YOUR PATH</div><h2>Your past, present & future.</h2><p className="muted">The thread behind you, the choice in front of you, and the road taking shape.</p><div className="reflection-timeline">{content.lifeTimeline.map((t, i) => <div key={i}><span className="timeline-dot"/><span className="eyebrow">{t.ageRange}</span><h3>{t.phaseName}</h3><p>{t.keyEventOrShift}</p><small>{t.palmEvidence}</small></div>)}</div></section>}
      {content.behavioralPatterns.length > 0 && <section className="report-section"><div className="eyebrow">NOTICE WHAT RESONATES</div><h2>Patterns to sit with.</h2><div className="patterns-grid">{content.behavioralPatterns.map((p, i) => <div key={i}><Sparkles size={20}/><h3>{p.pattern}</h3><p>{p.evidence}</p></div>)}</div></section>}
      <section id="small-steps" className="actions-section"><div><div className="eyebrow">TAKE A LITTLE WISDOM WITH YOU</div><h2>Small steps.<br/>Your own pace.</h2></div><ol>{content.recommendedActions.map((a, i) => <li key={i}><span>{i+1}</span>{a}</li>)}</ol></section>
      <details className="image-notes"><summary>About this photo & interpretation</summary><p><strong>{content.imageQualityCheck.clarity}</strong> · {content.imageQualityCheck.notes}</p><p>{content.imageQualityCheck.confidenceImpact}</p><p>This reading is based on features visible in the photos you supplied.</p></details>
    </> : <section className="legacy-reading markdown-body"><ReactMarkdown>{reading.readingText}</ReactMarkdown></section>}
    <section id="share-lines" className="report-section"><div className="eyebrow">A LITTLE SOMETHING FOR THE GROUP CHAT</div><h2>{reading.mode==='roast'?'Take the joke with you.':'A thought worth sharing.'}</h2><p className="muted">Written with this reading, for sharing on its own. Review your caption before posting; only the selected text is shared.</p>{!shareLines.length && <p className="notice">This saved report has no generated captions. New readings include their own shareable lines.</p>}<div className="share-lines-grid">{shareLines.map(line=><section className="share-line-card" key={line.text}><span className="eyebrow">{line.theme}</span><blockquote>{line.text}</blockquote><small>{reading.mode==='roast'?'From your palm roast':'From your palm reading'}</small><div><button className="button button-brand button-small" onClick={()=>void share(line.text)}><Share2 size={15}/> Share this line</button><button className="button button-outline button-small" onClick={()=>void share(line.text,true)}>Copy caption</button></div></section>)}</div><p className="muted">Sharing opens your device’s share options, or copies the caption if sharing isn’t supported. You choose where to post.</p></section>
    <div className="report-end"><span>✧</span><p>Your story is still yours to write.</p><button className="button button-brand" onClick={onStart}>Begin another reading <ArrowRight size={16}/></button></div>
  </article>;
}
