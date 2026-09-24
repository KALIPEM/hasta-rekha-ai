import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createApi} from '../server/app';
import {getPlan, validateInput, verifySignature} from '../server/validation';
import {parseReadingContent} from '../src/lib/reading-content';
import {sampleReading} from '../src/lib/sample-reading';
const valid = {images:[{mimeType:'image/jpeg',base64:Buffer.from([255,216,255,224,1,2,3,4]).toString('base64')}],dominantHand:'Right-handed',ageRange:'25–34',mainFocus:'Overall life path',isRoastMode:false,title:'Test'};

test('individual uploads accept either hand alone and reject ambiguous labels',()=>{
 for(const side of ['Left','Right'])assert.equal(validateInput({...valid,images:[{...valid.images[0],side}]}).images[0].side,side);
 const pair=['Left','Right'].map(side=>({...valid.images[0],side}));
 assert.deepEqual(validateInput({...valid,images:pair}).images,pair);
 assert.equal(validateInput(valid).images.length,1);
 for(const images of [[pair[0],pair[0]],[pair[0],valid.images[0]],[{...pair[0],side:'Unknown'}]])assert.throws(()=>validateInput({...valid,images}));
});
test('server owns plan prices and rejects prototype keys',()=>{
 assert.equal(getPlan('mystic').amount,8000);assert.equal(getPlan('deepdive').credits,1);assert.equal(getPlan('deepdive').amount,2000);assert.equal(getPlan('mystic').credits,5);assert.equal(getPlan('couple').amount,3000);assert.equal(getPlan('couple').credits,1);
 for(const plan of ['toString','__proto__','free',null])assert.throws(()=>getPlan(plan));
});
test('payment signatures reject malformed values and changed payment IDs',()=>{
 const secret='test-secret',body='order_test|pay_test';
 const signature=createHmac('sha256',secret).update(body).digest('hex');
 assert.equal(verifySignature(body,signature,secret),true);
 assert.equal(verifySignature(body+'changed',signature,secret),false);
 for(const sig of [null,'',[],signature.slice(1),'x'.repeat(64)])assert.equal(verifySignature(body,sig,secret),false);
});
test('upload validation rejects spoofed mime types, missing photos, oversized data and invalid preferences',()=>{
 assert.equal(validateInput(valid).title,'Test');
 for(const body of [{...valid,images:[]},{...valid,images:[{mimeType:'image/jpeg',base64:Buffer.from('not an image').toString('base64')}]},{...valid,images:[{mimeType:'image/png',base64:'A'.repeat(7000001)}]},{...valid,dominantHand:'instructions'},{...valid,isRoastMode:'yes'},{...valid,title:'x'.repeat(101)}])assert.throws(()=>validateInput(body));
});
test('reading parser rejects broken model responses',()=>{
 assert.equal(parseReadingContent(sampleReading.readingText).aspects.length,4);
 assert.throws(()=>parseReadingContent('{}'));
 const value=JSON.parse(sampleReading.readingText);value.aspects[0].summary=null;
 assert.throws(()=>parseReadingContent(value));
});
test('API fails safely without AI or billing credentials',async()=>{
 const names=['AZURE_OPENAI_ENDPOINT','AZURE_OPENAI_API_KEY','AZURE_OPENAI_DEPLOYMENT','BILLING_ENABLED','SUPABASE_SERVICE_ROLE_KEY'];
 const previous=names.map(k=>process.env[k]);names.forEach(k=>delete process.env[k]);
 const server=createApi().listen(0,'127.0.0.1');
 await new Promise<void>(resolve=>server.on('listening',resolve));
 const addr=server.address() as {port:number},base='http://127.0.0.1:'+addr.port;
 try {
  const config=await fetch(base+'/api/config').then(r=>r.json());assert.deepEqual(config,{aiConfigured:false,billingConfigured:false});
  assert.equal((await fetch(base+'/api/credits')).status,401);
  const post=(url:string,body:unknown,headers={})=>fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
  assert.equal((await post('/api/palm-reading',valid)).status,401);
  assert.equal((await post('/api/palm-reading',{})).status,400);
  assert.equal((await post('/api/create-order',{plan:'mystic'})).status,503);
  assert.equal((await post('/api/create-order',{plan:'__proto__'})).status,400);
  assert.equal((await post('/api/palm-reading',valid,{Origin:'https://unrelated.example'})).status,403);
  assert.equal((await fetch(base+'/api/missing')).status,404);
 } finally {await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));names.forEach((k,i)=>{if(previous[i]===undefined)delete process.env[k];else process.env[k]=previous[i];});}
});
