import test from 'node:test';
import assert from 'node:assert/strict';
import {getShareLines,shareCaption} from '../src/lib/share-lines';
import {sampleReading} from '../src/lib/sample-reading';
test('share captions never interpolate private reading content, even when it selects a theme',()=>{
 const content=JSON.parse(sampleReading.readingText);
 content.aspects=[{summary:'Imagination: PrivateName private@example.com',detailedInterpretation:'My secret relationship story and exact savings 123456789'}];
 for(const roast of [true,false]){
  const lines=getShareLines(content,roast);assert.equal(lines.length,4);assert.equal(new Set(lines.map(l=>l.text)).size,4);
  assert.equal(lines[0].theme,'Big ideas');
  for(const line of lines){const shared=shareCaption(line.text,roast);assert.doesNotMatch(shared,/PrivateName|private@|123456789|secret/);assert.match(shared,roast?/not a fact/:/not a prediction/);}
 }
 assert.throws(()=>shareCaption(content.aspects[0].summary,true));
});
test('legacy reports have captions without regenerating or exposing their text',()=>{
 assert.equal(getShareLines(null,true).length,4);
 assert.notEqual(getShareLines(null,true)[0].text,getShareLines(null,false)[0].text);
 assert.throws(()=>shareCaption(getShareLines(null,false)[0].text,true));
});
