import test from 'node:test';
import assert from 'node:assert/strict';
import {getShareLines,PUBLIC_APP_URL,shareCaption,validShareLines} from '../src/lib/share-lines';
import {requireShareLines} from '../server/share-prompt';
import {sampleReading} from '../src/lib/sample-reading';

const lines=()=>[
 {theme:'Ideas',text:'This palm has a writers room for every unfinished idea.',intro:'A line from my palm reading about the ideas still pacing backstage.'},
 {theme:'Planning',text:'The reading found a launch committee still debating the launch committee.',intro:'My AI palmist roasted me 🤡 for holding another planning meeting.'},
 {theme:'Rest',text:'This palm scheduled spontaneity and then requested a postponement.',intro:'My AI palmist roasted me 😭 for putting rest on the calendar.'},
];
test('sharing uses this report’s generated captions and never unrelated report prose',()=>{
 const content={...JSON.parse(sampleReading.readingText),shareLines:lines(),openingHook:'Private report detail'};
 assert.deepEqual(getShareLines(content,true),lines());
 assert.match(shareCaption(lines()[0].text,true,content),/ideas still pacing backstage/);
 assert.match(shareCaption(lines()[0].text,true,content),new RegExp(PUBLIC_APP_URL.replaceAll('.','\\.')));
 assert.doesNotMatch(shareCaption(lines()[0].text,true,content),/Private report detail/);
 assert.throws(()=>shareCaption(content.openingHook,true,content));
 const other={...content,shareLines:lines().map(l=>({...l,text:l.text+' Again.'}))};
 assert.notDeepEqual(getShareLines(content,false),getShareLines(other,false));
 assert.throws(()=>shareCaption(lines()[0].text,false,other));
});
test('saved captions without generated intros remain available alongside the excerpt picker',()=>{
 const oldLines=lines().map(({theme,text})=>({theme,text}));
 const content={...JSON.parse(sampleReading.readingText),shareLines:oldLines};
 for(const roast of [false,true]){
  assert.deepEqual(getShareLines(content,roast).map(({theme,text})=>({theme,text})),oldLines);
  assert.ok(shareCaption(oldLines[0].text,roast,content).includes(oldLines[0].text));
 }
 // New AI responses must still provide their generated introductions.
 assert.throws(()=>requireShareLines(oldLines));
 assert.deepEqual(getShareLines({...content,shareLines:lines().map(l=>({...l,intro:'Visit https://example.com'}))},false),[]);
});
test('old and malformed reports do not silently receive template captions',()=>{
 assert.deepEqual(getShareLines(null,false),[]);
 assert.deepEqual(getShareLines(JSON.parse(sampleReading.readingText),false),[]);
 for(const value of [undefined,[],lines().slice(0,2),[lines()[0],lines()[0],lines()[0]],lines().map(l=>({...l,text:'private@example.com'})),lines().map(l=>({...l,intro:'Visit https://example.com'})),lines().map(l=>({...l,text:'x'.repeat(241)}))]){
  assert.equal(validShareLines(value),false);
  assert.throws(()=>requireShareLines(value));
 }
 assert.deepEqual(requireShareLines(lines()),lines());
});
