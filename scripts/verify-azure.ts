import dotenv from 'dotenv';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {azureConfig} from '../server/palm';
import {budgetedAzureFetch} from '../server/ai-budget';
import {validatePhotoQuality} from '../server/photo-quality';
dotenv.config({path:'.env.local',quiet:true});
const db=createClient(process.env.SUPABASE_URL!,process.env.SUPABASE_SERVICE_ROLE_KEY!,{auth:{persistSession:false}});
const before=await db.from('ai_budget').select('limit_microusd,spent_microusd,reserved_microusd,enabled').single();
if(before.error) throw new Error('Budget connection failed: '+before.error.message);
console.log('Budget before',before.data);
if(!before.data.enabled || before.data.limit_microusd!==190000000) throw new Error('Budget is not ready');
if(before.data.spent_microusd+before.data.reserved_microusd+1000000>10000000)throw new Error('The $10 total testing ceiling prevents this run.');
const blank=await sharp({create:{width:512,height:512,channels:3,background:'#000'}}).png().toBuffer();
await assert.rejects(validatePhotoQuality([{base64:blank.toString('base64')}]),{status:422});
console.log('Blank photo rejected locally before inference.');
const ai=azureConfig()!;
const response=await budgetedAzureFetch(db)(ai.endpoint+'/openai/v1/chat/completions',{
 method:'POST',headers:{'api-key':ai.apiKey,'Content-Type':'application/json'},
 signal:AbortSignal.timeout(90000),redirect:'error',
 body:JSON.stringify({model:ai.deployment,messages:[{role:'user',content:'Reply with OK.'}],max_completion_tokens:10,temperature:0,store:false})
});
if(!response.ok) throw new Error('Azure status '+response.status);
const body=await response.json();
assert.match(body.choices[0].message.content.trim(),/^OK\.?$/i);
console.log('Azure live request passed; model:',body.model);
const after=await db.from('ai_budget').select('limit_microusd,spent_microusd,reserved_microusd,enabled').single();
if(after.error) throw new Error(after.error.message);
console.log('Budget after',after.data);
