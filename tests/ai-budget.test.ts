import test from 'node:test';
import assert from 'node:assert/strict';
import {budgetedAzureFetch,APPROVED_MODEL} from '../server/ai-budget';
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
