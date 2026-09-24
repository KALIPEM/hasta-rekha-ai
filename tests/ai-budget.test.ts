import test from 'node:test';
import assert from 'node:assert/strict';
import {budgetedAzureFetch,APPROVED_MODEL,azureRetrySeconds} from '../server/ai-budget';
import {HttpError} from '../server/validation';

test('explicit throttling retries only the same stage with one budget reservation',async()=>{
 const methods:string[]=[], waits:number[]=[], bodies:unknown[]=[];
 const db={rpc:async(name:string)=>{methods.push(name);return {data:'id',error:null};}} as any;
 const run=budgetedAzureFetch(db,async(_url,init)=>{
   bodies.push(init?.body);
   return bodies.length===1?new Response('',{status:429,headers:{'retry-after-ms':'1250'}}):new Response(JSON.stringify({model:APPROVED_MODEL,usage:{prompt_tokens:1000,completion_tokens:500}}));
 },async ms=>{waits.push(ms);});
 assert.equal((await run('https://example.test',{body:'same stage'})).status,200);
 assert.deepEqual(waits,[2000]);assert.deepEqual(bodies,['same stage','same stage']);
 assert.deepEqual(methods,['reserve_ai_request','settle_ai_request']);
});

test('persistent or long throttling is bounded and reports cooldown without settling unknown usage',async()=>{
 for(const seconds of [2,120]){
 let calls=0;const methods:string[]=[];
 const db={rpc:async(name:string)=>{methods.push(name);return {data:'id',error:null};}} as any;
 await assert.rejects(budgetedAzureFetch(db,async()=>{calls++;return new Response('',{status:429,headers:{'retry-after':String(seconds)}});},async()=>{})('https://example.test'),error=>error instanceof HttpError && error.status===429 && error.code==='AI_RATE_LIMITED' && error.retryAfterSeconds===seconds);
 assert.equal(calls,seconds===2?2:1);assert.deepEqual(methods,['reserve_ai_request']);
 }
});

test('cooldown understands dates, defaults safely and cancellation prevents retry',async()=>{
 assert.equal(azureRetrySeconds(new Response('',{headers:{'retry-after':'invalid'}})),60);
 assert.equal(azureRetrySeconds(new Response('',{headers:{'retry-after':'Thu, 01 Jan 1970 00:01:00 GMT'}}),0),60);
 const controller=new AbortController();let calls=0;
 const db={rpc:async()=>({data:'id',error:null})} as any;
 await assert.rejects(budgetedAzureFetch(db,async()=>{calls++;return new Response('',{status:429,headers:{'retry-after':'1'}});},async()=>{controller.abort();})('https://example.test',{signal:controller.signal}));
 assert.equal(calls,1);
});
test('database denial prevents any billable call',async()=>{
 let calls=0;
 const db={rpc:async()=>({error:{message:'budget exhausted'},data:null})} as any;
 await assert.rejects(budgetedAzureFetch(db,async()=>{calls++;return new Response();})('https://example.test'));
 assert.equal(calls,0);
});
test('network failure retains reservation without refund or retry',async()=>{
 const methods:string[]=[];let calls=0;
 const db={rpc:async(name:string)=>{methods.push(name);return {data:'reservation-id',error:null};}} as any;
 await assert.rejects(budgetedAzureFetch(db,async()=>{calls++;throw new Error('timeout');})('https://example.test'));
 assert.deepEqual(methods,['reserve_ai_request']);assert.equal(calls,1);
});
test('observed usage is settled once and unknown model pauses spending',async()=>{
 for(const model of [APPROVED_MODEL,'unapproved-model']){
 const methods:string[]=[];
 const db={rpc:async(name:string,args:any)=>{methods.push(name);if(name==='settle_ai_request')assert.equal(args.p_prompt_tokens,1000);return {data:'reservation-id',error:null};}} as any;
 const run=()=>budgetedAzureFetch(db,async()=>new Response(JSON.stringify({model,usage:{prompt_tokens:1000,completion_tokens:500}})))('https://example.test');
 if(model===APPROVED_MODEL){await run();assert.deepEqual(methods,['reserve_ai_request','settle_ai_request']);}
 else {await assert.rejects(run());assert.deepEqual(methods,['reserve_ai_request','pause_ai_budget']);}
 }
});
test('settlement failure does not silently return a reading',async()=>{
 const db={rpc:async(name:string)=>({data:name==='reserve_ai_request'?'id':null,error:name==='settle_ai_request'?{message:'offline'}:null})} as any;
 await assert.rejects(budgetedAzureFetch(db,async()=>new Response(JSON.stringify({model:APPROVED_MODEL,usage:{prompt_tokens:1000,completion_tokens:500}})))('https://example.test'));
});
