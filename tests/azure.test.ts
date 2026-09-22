const generatedCaptions=()=>['Planning','Imagination','Rest'].map(theme=>({theme,text:'This palm gives '+theme.toLowerCase()+' a starring role in the next chapter.'}));
import test from 'node:test';
import assert from 'node:assert/strict';
import {azureConfig, readPalm, roastPalmReading} from '../server/palm';
import {sampleReading} from '../src/lib/sample-reading';
import {LIFE_TOPICS} from '../server/life-areas';

const config = {endpoint:'https://test.openai.azure.com',apiKey:'test-secret',deployment:'test-vision'};
const input = {images:[{mimeType:'image/png',base64:'test-image'}],dominantHand:'Right-handed',ageRange:'Prefer not to say',mainFocus:'Overall life path',isRoastMode:false};
const reply = (value:unknown,reason='stop') => new Response(JSON.stringify({choices:[{finish_reason:reason,message:{content:JSON.stringify(value)}}]}));
const observedLine={visibility:'visible',shape:'curved',continuity:'continuous'};
const observation={description:'A photographed open palm',isOpenPalm:true,hands:[{imageIndex:0,heart:observedLine,head:observedLine,life:observedLine,fate:observedLine}]};
const names=['Inner World','Work and Direction','Relationships','Everyday Balance'];

test('roast rewriting preserves the original observations and image quality',async()=>{
 const base=JSON.parse(sampleReading.readingText);
 const rewritten:any=structuredClone(base);
 rewritten.shareLines=generatedCaptions();
 rewritten.aspects=Object.fromEntries(['innerWorld','workDirection','relationships','everydayBalance'].map((key,i)=>[key,{summary:'A comic rewrite',detailedInterpretation:base.aspects[i].detailedInterpretation,palmEvidence:'Invented broken line'}]));
 rewritten.imageQualityCheck.notes='Changed photo assessment';
 const result=await roastPalmReading(base,config,async()=>reply(rewritten));
 assert.deepEqual(result.aspects.map(a=>a.palmEvidence),base.aspects.map((a:any)=>a.palmEvidence));
 assert.deepEqual(result.imageQualityCheck,base.imageQualityCheck);
 assert.equal(result.aspects[0].summary,'A comic rewrite');
 assert.deepEqual(result.shareLines,rewritten.shareLines);
});
test('Azure credentials require a complete trusted HTTPS resource endpoint',()=>{
  assert.equal(azureConfig({}),null);
  const env = {AZURE_OPENAI_ENDPOINT:config.endpoint+'/openai/v1/',AZURE_OPENAI_API_KEY:config.apiKey,AZURE_OPENAI_DEPLOYMENT:config.deployment};
  assert.deepEqual(azureConfig(env),config);
  for(const endpoint of ['http://test.openai.azure.com','https://test.openai.azure.com.evil.example','https://user:password@test.openai.azure.com','https://test.openai.azure.com?key=foo','https://test.openai.azure.com/arbitrary'])assert.throws(()=>azureConfig({...env,AZURE_OPENAI_ENDPOINT:endpoint}));
});
test('Azure image request uses strict structured output, server credentials and bounded output',async()=>{
  let calls=0;
  const fetcher: typeof fetch = async(url,init)=>{
    calls++;
    if(calls===3)return reply(Object.fromEntries(LIFE_TOPICS.map(t=>[t.id,{summary:'A useful finding.',insightOne:'A line-based reading of the first theme.',insightTwo:'A line-based reading of the second theme.',insightThree:'A line-based reading of the third theme.',watchOutFor:'If you are rushing, pause.',nextStep:'Write down one priority.'}])));
    assert.equal(url,config.endpoint+'/openai/v1/chat/completions');
    assert.equal((init?.headers as Record<string,string>)['api-key'],'test-secret');
    assert.equal(init?.redirect,'error');
    const request=JSON.parse(init?.body as string);
    assert.equal(request.model,config.deployment);
    assert.equal(request.max_completion_tokens,calls===1?1600:3000);
    assert.equal(request.temperature,calls===1?0:0.65);
    assert.equal(request.store,false);
    assert.equal(request.response_format.json_schema.strict,true);
    assert.equal(request.response_format.json_schema.schema.additionalProperties,false);
    if(calls===1)assert.equal(request.messages[1].content[1].image_url.url,'data:image/png;base64,test-image');
    else assert.equal(request.messages[1].content.some((item:any)=>item.type==='image_url'),false);
    const report=JSON.parse(sampleReading.readingText);
    report.shareLines=generatedCaptions();
    report.aspects.forEach((aspect:any,i:number)=>{aspect.aspectName=names[i];aspect.referenceIds=['HR5'];aspect.palmEvidence='A made-up Mercury line';});
    return calls===1?reply(observation):reply({...report,isPalm:true});
  };
  const result=await readPalm(input,config,fetcher);
  assert.equal(result.aspects.length,4);
  assert.match(result.aspects[2].palmEvidence,/heart line.*\[HR1\]/);
  assert.ok(result.aspects.every(a=>!a.palmEvidence.includes('Mercury')));
  assert.equal(calls,3);
  assert.equal(result.lifeAreas?.length,7);
  assert.deepEqual(result.shareLines,generatedCaptions());
});

test('both voices reject unrecognized aspect structure',async()=>{
  for(const isRoastMode of [false,true]) {
    let calls=0;
    await assert.rejects(readPalm({...input,isRoastMode},config,async(_url,init)=>{
      calls++;
      if(calls===1)return reply(observation);
      const prompt=JSON.parse(init?.body as string).messages[0].content;
      assert.match(prompt,/NORMAL CONSULTATION VOICE/);
      return reply({...JSON.parse(sampleReading.readingText),isPalm:true});
    }),/structure/);
    assert.equal(calls,2);
  }
});
test('Azure failure, refusal, truncation and non-palm images do not return invented readings or retry',async()=>{
  for(const response of [
    new Response('private provider failure details',{status:429}),
    new Response('private provider failure details',{status:401}),
    reply({isPalm:false}),
    reply({isPalm:true},'length'),
    new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{refusal:'Refused'}}]})),
    new Response('not json'),
  ]) {
    let calls=0;
    await assert.rejects(readPalm(input,config,async()=>{calls++;return response;}),error=>error instanceof Error&&!error.message.includes('private provider'));
    assert.equal(calls,1);
  }
});
