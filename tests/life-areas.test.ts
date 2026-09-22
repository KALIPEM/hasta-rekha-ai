import test from 'node:test';
import assert from 'node:assert/strict';
import {LIFE_TOPICS,parseLifeAreas,generateLifeAreas} from '../server/life-areas';
import {parseReadingContent} from '../src/lib/reading-content';
import {sampleReading} from '../src/lib/sample-reading';
const fixture=()=>Object.fromEntries(LIFE_TOPICS.map(t=>[t.id,{summary:'Overview',insightOne:'First reading insight',insightTwo:'Second reading insight',watchOutFor:'A conditional watch-out',nextStep:'A practical step',basis:'Invented authority'}]));
test('seven sections retain their fixed topic lens and direct reading insights',()=>{
 const result=parseLifeAreas(fixture());
 assert.equal(result.length,7);
 assert.equal(result.reduce((n,a)=>n+a.insights.length,0),14);
 assert.match(result.find(a=>a.id==='money')!.basis,/Fate-line/);
 assert.ok(result.every(a=>a.basis!=='Invented authority'));
 const incomplete=fixture();delete incomplete.romance.insightOne;
 assert.throws(()=>parseLifeAreas(incomplete));
 const old=JSON.parse(sampleReading.readingText);assert.doesNotThrow(()=>parseReadingContent(old));
 assert.doesNotThrow(()=>parseReadingContent({...old,lifeAreas:result}));
 assert.throws(()=>parseReadingContent({...old,lifeAreas:[{id:'broken'}]}));
});
test('deep sections fail on truncated responses without retrying or raising output spend limits',async()=>{
 let calls=0;
 await assert.rejects(generateLifeAreas(JSON.parse(sampleReading.readingText),{endpoint:'https://test.openai.azure.com',apiKey:'test',deployment:'test'},async(_url,init)=>{
  calls++;const request=JSON.parse(init?.body as string);
  assert.equal(request.max_completion_tokens,3000);
  assert.ok(!JSON.stringify(request.messages).includes('image_url'));
  return new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{}'}}]}));
 }),/incomplete/);
 assert.equal(calls,1);
});
