const generatedCaptions=()=>['Planning','Imagination','Rest'].map(theme=>({theme,text:'This palm gives '+theme.toLowerCase()+' a starring role in the next chapter.',intro:'A line from our palm reading about '+theme.toLowerCase()+'.'}));
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateInput} from '../server/validation';
import {readCouple,validateHands,COUPLE_AREAS} from '../server/couple';
const photo={side:'Right',mimeType:'image/jpeg',base64:Buffer.from([255,216,255,1]).toString('base64')};
const input={readingKind:'couple',consent:true,partners:['Male partner','Female partner'].map(label=>({label,dominantHand:'Right',ageRange:'25–34',photos:[photo]}))};
const hand={imageIndex:0,isOpenPalm:true,heart:'curved',head:'straight',palmShape:'square',fingerLength:'long',venus:'uncertain',relationshipLines:'not_visible'};
const reply=(data:any,finish_reason='stop')=>new Response(JSON.stringify({choices:[{finish_reason,message:{content:JSON.stringify(data)}}]}));
const config={endpoint:'https://test.openai.azure.com',apiKey:'test',deployment:'test'};
test('couple input requires two labelled partners, consent, valid images and unique hand sides',()=>{
  assert.equal(validateInput(input).images.length,2);
  assert.equal(validateInput(input).partners[0].ageRange,'25–34');
  for(const ageRange of [undefined,'','Prefer not to say'])assert.throws(()=>validateInput({...input,partners:input.partners.map(p=>({...p,ageRange}))}));
  const withAges={...input,partners:input.partners.map((p,i)=>({...p,ageRange:i===0?'25–34':'35–44'}))};
  assert.deepEqual(validateInput(withAges).partners.map((p:any)=>p.ageRange),['25–34','35–44']);
  assert.throws(()=>validateInput({...input,partners:input.partners.map(p=>({...p,ageRange:'17'}))}));
  assert.equal(validateInput({...input,partners:input.partners.map(p=>({...p,photos:[photo,{...photo,side:'Left'}]}))}).images.length,4);
  assert.throws(()=>validateInput({...input,consent:false}));
  assert.throws(()=>validateInput({...input,partners:[input.partners[0]]}));
  assert.throws(()=>validateInput({...input,partners:input.partners.map(p=>({...p,photos:[photo,photo]}))}));
  assert.throws(()=>validateInput({...input,partners:input.partners.map(p=>({...p,photos:[{...photo,base64:'invalid'}]}))}));
});
test('couple observations reject missing, duplicate, out of range, invented and non-palm evidence',()=>{
  for(const hands of [[],[hand,hand],[{...hand,imageIndex:1}],[{...hand,isOpenPalm:false}],[{...hand,venus:'high libido'}]])assert.throws(()=>validateHands({hands},1));
});
test('couple pipeline isolates partners, preserves side labels, and supplies only observations to comparison',async()=>{
  let count=0;
  const report={shareLines:generatedCaptions(),openingHook:'A conversation for two.',majorHighlight:'Different rhythms',executiveSummary:'A symbolic reflection.',areas:Object.fromEntries(COUPLE_AREAS.map(([key])=>[key,{summary:'Explore together.',detail:'Ask each other what feels supportive.',palmEvidence:'invented'}])),actions:['Ask each other about boundaries.']};
  const result=await readCouple({...input,partners:[input.partners[0],{...input.partners[1],dominantHand:'Left'}]},config,async(_url,init)=>{
    const body=JSON.parse(init!.body as string);count++;
    assert.equal(body.max_completion_tokens,3000);assert.equal(body.store,false);
    if(count<=2){assert.equal(body.messages[1].content.length,1);assert.equal(body.temperature,0);return reply({hands:[{...hand,heart:count===1?'curved':'straight'}]});}
    assert.equal(count,3);assert.equal(typeof body.messages[1].content,'string');assert.ok(!body.messages[1].content.includes('base64'));
    const partners=JSON.parse(body.messages[1].content);assert.equal(partners[0].hands[0].role,'Dominant');assert.equal(partners[1].hands[0].role,'Non-dominant');assert.equal(partners[0].hands[0].element,'Air');
    return reply(report);
  });
  assert.deepEqual(result.shareLines,generatedCaptions());
  assert.equal(count,3);assert.equal(result.aspects.length,5);assert.match(result.aspects[0].palmEvidence,/Male partner: Right \(Dominant\): heart line curved/);assert.match(result.aspects[0].palmEvidence,/Female partner: Right \(Non-dominant\): heart line straight/);assert.match(result.aspects[3].palmEvidence,/not_visible/);assert.equal(result.overallConfidence,0);assert.equal(result.lifeTimeline.length,0);
});
test('couple truncation fails without retry or additional billed requests',async()=>{
 let calls=0;await assert.rejects(()=>readCouple(input,config,async()=>{calls++;return reply({},'length');}),/incomplete/);assert.equal(calls,1);
});
