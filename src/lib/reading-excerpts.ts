import type {Reading, ReadingContent} from '../types';
import {PUBLIC_APP_URL} from './share-lines';

export interface ExcerptGroup {id: string; title: string; excerpts: {id: string; text: string}[]}

// Extract only user-facing prose. Never include report metadata, photos or evidence.
export function readingExcerpts(content: ReadingContent | null, legacyText = ''): ExcerptGroup[] {
  const groups: ExcerptGroup[] = [];
  function add(title: string, values: unknown[]) {
    const id = `section-${groups.length}`;
    const texts = values.flatMap(value => typeof value === 'string' ? value.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean) : []);
    const unique = [...new Set(texts)];
    if (unique.length) groups.push({id, title, excerpts: unique.map((text, i) => ({id: `${id}-${i}`, text}))});
  }
  if (content) {
    add('Reading highlights', [content.majorHighlight, content.openingHook, content.executiveSummary]);
    content.aspects.forEach(a => add(a.aspectName, [a.summary, a.detailedInterpretation]));
    content.lifeAreas?.forEach(a => add(a.title, [a.summary, ...a.insights, a.watchOutFor, a.nextStep]));
    content.lifeTimeline.forEach(t => add(`${t.ageRange}: ${t.phaseName}`, [t.keyEventOrShift]));
    content.behavioralPatterns.forEach(p => add(p.pattern, [p.evidence]));
    add('Small steps', content.recommendedActions);
  } else {
    // Only use actual legacy Markdown, never expose an unsupported JSON report.
    const trimmed = legacyText.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[') || /^```(?:json)?/i.test(trimmed)) return [];
    let heading = 'Saved reading';
    let paragraphs: string[] = [];
    for (const part of trimmed.split(/(^#{1,6} .+$)/m)) {
      if (/^#{1,6} /m.test(part)) { add(heading, paragraphs); paragraphs = []; heading = part.replace(/^#{1,6}\s+/, '').trim(); }
      else paragraphs.push(part);
    }
    add(heading, paragraphs);
  }
  return groups;
}

export function excerptCaption(groups: ExcerptGroup[], selectedId: string, reading: Pick<Reading, 'mode' | 'mainFocus' | 'isSample'>) {
  const excerpt = groups.flatMap(g => g.excerpts).find(e => e.id === selectedId);
  if (!excerpt) throw new Error('Choose an excerpt from this reading.');
  const intro = reading.isSample ? 'From a Hasta Rekha sample reading:'
    : reading.mode === 'roast' ? 'My AI palmist roasted me 💀🔥 — a passage from my Hasta Rekha reading:'
    : reading.mainFocus === 'Couple compatibility' ? 'A passage from our Hasta Rekha couple reading:'
    : 'A passage from my Hasta Rekha palm reading:';
  return `${intro}\n\n“${excerpt.text}”\n\nGet your own reading: ${PUBLIC_APP_URL}\n#HastaRekha`;
}
