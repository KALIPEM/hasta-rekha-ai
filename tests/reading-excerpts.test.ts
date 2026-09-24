import test from 'node:test';
import assert from 'node:assert/strict';
import {readingExcerpts, excerptCaption} from '../src/lib/reading-excerpts';
import {PUBLIC_APP_URL} from '../src/lib/share-lines';
import {sampleReading} from '../src/lib/sample-reading';
import {deliverShare} from '../src/lib/share-delivery';

test('excerpts preserve full prose while excluding report metadata and observations', () => {
  const content = JSON.parse(sampleReading.readingText);
  content.aspects[0].detailedInterpretation = 'Dr. Example has a plan. It has two sentences! 💀';
  content.aspects[0].palmEvidence = 'PRIVATE OBSERVATION';
  content.lifeAreas = [{title:'Life', summary:'One finding', insights:['First insight','Second insight','Third insight'], watchOutFor:'A watch-out', nextStep:'An action', basis:'PRIVATE BASIS'}];
  const groups = readingExcerpts(content);
  const all = groups.flatMap(g => g.excerpts);
  assert.ok(all.some(e => e.text === content.aspects[0].detailedInterpretation));
  assert.ok(all.some(e => e.text === 'Third insight'));
  assert.ok(!JSON.stringify(groups).includes('PRIVATE'));
  assert.equal(new Set(all.map(e => e.id)).size, all.length);
  const text = excerptCaption(groups, all[0].id, {mode:'roast'});
  assert.ok(text.includes(all[0].text));
  assert.ok(text.includes(PUBLIC_APP_URL));
  assert.match(text, /My AI palmist roasted me/);
  assert.ok(!text.includes('PRIVATE'));
  assert.match(excerptCaption(groups, all[0].id, {mainFocus:'Couple compatibility'}), /our Hasta Rekha couple reading/);
  assert.match(excerptCaption(groups, all[0].id, {isSample:true}), /sample reading/);
  assert.throws(() => excerptCaption(groups, 'not-in-this-report', {}));
});

test('legacy Markdown remains shareable without requiring generated captions', () => {
  const groups = readingExcerpts(null, '# Old report\n\nAn intact paragraph. Another sentence.\n\n## Love\n\nA second passage.');
  assert.equal(groups[0].title, 'Old report');
  assert.equal(groups[0].excerpts[0].text, 'An intact paragraph. Another sentence.');
  assert.equal(groups[1].title, 'Love');
  assert.deepEqual(readingExcerpts(null, '{"private":"unsupported report"}'), []);
  assert.deepEqual(readingExcerpts(null, ''), []);
  const old = JSON.parse(sampleReading.readingText);
  delete old.shareLines; delete old.lifeAreas;
  assert.ok(readingExcerpts(old).length > 0);
});

test('native sharing, clipboard fallback, cancel and errors preserve the exact preview', async () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const sent: unknown[] = [];
  function nav(value: unknown) {Object.defineProperty(globalThis, 'navigator', {configurable:true, value});}
  try {
    nav({share:async (value:unknown) => {sent.push(value);}, clipboard:{writeText:async (value:string) => {sent.push(value);}}});
    assert.equal(await deliverShare('Exact preview'), 'shared');
    assert.deepEqual(sent.pop(), {title:'Hasta Rekha', text:'Exact preview'});
    assert.equal(await deliverShare('Copy preview', true), 'copied');
    assert.equal(sent.pop(), 'Copy preview');
    nav({clipboard:{writeText:async (value:string) => {sent.push(value);}}});
    assert.equal(await deliverShare('Fallback preview'), 'copied');
    assert.equal(sent.pop(), 'Fallback preview');
    nav({share:async () => {throw new DOMException('Cancelled', 'AbortError');}});
    assert.equal(await deliverShare('Cancelled'), 'cancelled');
    nav({clipboard:{writeText:async () => {throw new Error('Denied');}}});
    await assert.rejects(deliverShare('Denied'));
    nav({});
    await assert.rejects(deliverShare('Unsupported'));
  } finally {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
    else Reflect.deleteProperty(globalThis, 'navigator');
  }
});
